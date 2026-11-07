#requires -Version 5.1
<#
  Config-system one-command deployment for Codex / Windows PowerShell.

  Prerequisites:
    * git, ssh, scp and curl.exe are available.
    * GitHub SSH access is configured (~/.ssh/id_ed25519).
    * Server SSH access is configured for root@39.106.118.186.
    * The remote /opt/config-system service already exists.

  Usage:
    pwsh -File .\deploy-codex.ps1
    pwsh -File .\deploy-codex.ps1 -DryRun
    pwsh -File .\deploy-codex.ps1 -SkipGit
    pwsh -File .\deploy-codex.ps1 -CommitMessage "Describe the change"
#>
param(
  [string]$Branch = 'main',
  [string]$CommitMessage = "Deploy $(Get-Date -Format 'yyyy-MM-dd HH:mm')",
  [switch]$SkipGit,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$LocalDir       = 'E:\configSystem - 副本'
$GitRemote      = 'git@github.com:Asamiyaa/Config-system.git'
$ServerHost     = '39.106.118.186'
$ServerUser     = 'root'
$SshKey         = Join-Path $HOME '.ssh\id_ed25519'
$RemoteDir      = '/opt/config-system'
$ServiceName    = 'config-system.service'
$HealthUrl      = 'https://config.39.106.118.186.nip.io/api/health'
$HealthLocalUrl = 'http://127.0.0.1:8770/api/health'

function Step([string]$Text) { Write-Host "`n==> $Text" -ForegroundColor Cyan }
function Fail([string]$Text) { Write-Host "ERROR: $Text" -ForegroundColor Red; exit 1 }
function Run([string]$Label, [scriptblock]$Command) {
  Write-Host "  $Label"
  & $Command
  if ($LASTEXITCODE -ne 0) { Fail "$Label failed (exit $LASTEXITCODE)" }
}

Step 'Preflight'
if (-not (Test-Path -LiteralPath $LocalDir)) { Fail "Local directory not found: $LocalDir" }
if (-not (Test-Path -LiteralPath $SshKey)) { Fail "SSH key not found: $SshKey" }
Push-Location $LocalDir
try {
  & git rev-parse --is-inside-work-tree *> $null
  if ($LASTEXITCODE -ne 0) { Fail "Not a git repository: $LocalDir" }
  $actualRemote = (& git remote get-url origin 2>$null)
  if ($LASTEXITCODE -ne 0 -or -not $actualRemote) { Fail 'Git remote origin is not configured.' }
  if ($actualRemote.Trim() -ne $GitRemote) {
    Write-Host "  warning: origin is $actualRemote (expected $GitRemote)"
  }
  Write-Host "  local:  $LocalDir"
  Write-Host "  remote: $GitRemote ($Branch)"
  Write-Host "  server: ${ServerUser}@${ServerHost}:$RemoteDir"
} finally {
  Pop-Location
}

if ($DryRun) {
  Write-Host "`nDry run only. No commit, push, upload, restart or health check was performed." -ForegroundColor Yellow
  exit 0
}

Step 'Commit and push'
if ($SkipGit) {
  Write-Host '  skipped (-SkipGit): deploying current HEAD'
} else {
  Push-Location $LocalDir
  try {
    $dirty = (& git status --porcelain) -join "`n"
    if ($dirty) {
      if ($dirty -match '(?m)^..\s*\.env') { Fail 'Refusing to commit .env. Remove it from the working tree first.' }
      Run 'stage changes' { & git add -A }
      Run 'commit changes' { & git commit -m $CommitMessage }
    } else {
      Write-Host '  no working tree changes'
    }
    Run "push $Branch" { & git push origin $Branch }
  } finally {
    Pop-Location
  }
}

Step 'Build archive'
$stamp         = Get-Date -Format 'yyyyMMddHHmmss'
$archiveName   = "config-system-$stamp.tar.gz"
$localArchive  = Join-Path $env:TEMP $archiveName
$remoteArchive = "/tmp/$archiveName"
try {
  Push-Location $LocalDir
  try {
    Run 'git archive' { & git archive --format=tar.gz -o $localArchive HEAD }
  } finally {
    Pop-Location
  }
  $sizeMb = [math]::Round((Get-Item -LiteralPath $localArchive).Length / 1MB, 1)
  Write-Host "  archive: $localArchive ($sizeMb MB)"

  Step 'Upload to server'
  $uploaded = $false
  for ($attempt = 1; $attempt -le 3; $attempt++) {
    Write-Host "  scp attempt $attempt/3"
    & scp -i $SshKey -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=30 `
      $localArchive "${ServerUser}@${ServerHost}:$remoteArchive"
    if ($LASTEXITCODE -eq 0) { $uploaded = $true; break }
    Start-Sleep -Seconds 5
  }
  if (-not $uploaded) { Fail 'Upload failed after 3 attempts.' }

  Step 'Install on server'
  $remoteTemplate = @'
set -euo pipefail
REMOTE_DIR="__REMOTE_DIR__"
ARCHIVE="__ARCHIVE__"
SERVICE="__SERVICE__"
mkdir -p "$REMOTE_DIR/data/backups" "$REMOTE_DIR/.wealth_os"
if [ -f "$REMOTE_DIR/data/wealth_os.sqlite3" ]; then
  cp -a "$REMOTE_DIR/data/wealth_os.sqlite3" "$REMOTE_DIR/data/backups/wealth_os-$(date +%Y%m%d-%H%M%S).sqlite3"
fi
tar -xzf "$ARCHIVE" -C "$REMOTE_DIR"
rm -f "$ARCHIVE"
cd "$REMOTE_DIR"
if [ ! -d .venv ]; then
  python3.11 -m venv .venv
fi
REQ_HASH="$(sha256sum requirements.txt | cut -d' ' -f1)"
if [ ! -f .dsh-req-hash ] || [ "$(cat .dsh-req-hash)" != "$REQ_HASH" ]; then
  .venv/bin/pip install -q -r requirements.txt -i https://mirrors.aliyun.com/pypi/simple/
  printf '%s' "$REQ_HASH" > .dsh-req-hash
fi
chown -R configsystem:configsystem "$REMOTE_DIR"
if [ -f "$REMOTE_DIR/.env" ]; then chmod 600 "$REMOTE_DIR/.env"; fi
systemctl restart "$SERVICE"
sleep 4
systemctl is-active --quiet "$SERVICE" && echo "service active: $SERVICE"
curl -fsS "__HEALTH_LOCAL__" && echo
'@
  $remoteScript = $remoteTemplate.
    Replace('__REMOTE_DIR__', $RemoteDir).
    Replace('__ARCHIVE__', $remoteArchive).
    Replace('__SERVICE__', $ServiceName).
    Replace('__HEALTH_LOCAL__', $HealthLocalUrl)

  $remoteScript | & ssh -i $SshKey -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=30 "${ServerUser}@${ServerHost}" 'bash -s'
  if ($LASTEXITCODE -ne 0) { Fail 'Remote install/restart failed.' }

  Step 'Public health check'
  & curl.exe -fsS -k --max-time 30 $HealthUrl
  if ($LASTEXITCODE -ne 0) { Fail 'Public health check failed. Inspect the service and nginx.' }
  Write-Host "`nDeployment complete: $HealthUrl" -ForegroundColor Green
} finally {
  if (Test-Path -LiteralPath $localArchive) { Remove-Item -LiteralPath $localArchive -Force -ErrorAction SilentlyContinue }
}

