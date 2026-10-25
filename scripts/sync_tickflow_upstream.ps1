$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$target = Join-Path $projectRoot 'integrations\ticktick-clone-upstream'
$repo = 'https://github.com/SSSkevin1110/ticktick-clone.git'
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw '需要先安装 Git for Windows：https://git-scm.com/download/win'
}
if (Test-Path (Join-Path $target '.git')) {
  Write-Host "Updating TickFlow source at $target"
  git -C $target pull --ff-only
} elseif (Test-Path $target) {
  throw "目标目录已存在但不是 Git 仓库，请先备份/改名：$target"
} else {
  Write-Host "Cloning upstream TickFlow source into $target"
  git clone --depth 1 $repo $target
}
Write-Host ''
Write-Host 'Upstream source synchronized. The running WEALTH OS task home remains integrated with local SQLite.'
Write-Host 'The upstream React app uses Supabase; configure its own .env before running it independently.'
