# Run this script after the first successful run_windows.bat.
# Task Scheduler wakes once an hour; Python only fetches sources whose own interval elapsed.
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Runner = Join-Path $Root 'scan_due_windows.bat'
$Python = Join-Path $Root '.venv\Scripts\python.exe'
if (-not (Test-Path $Python)) { throw 'Run run_windows.bat first to install Python dependencies.' }
$Name = 'Opportunity OS Due Scan'
$tr = '"' + $Runner + '"'
& schtasks.exe /Create /SC HOURLY /MO 1 /TN $Name /TR $tr /F
if ($LASTEXITCODE -ne 0) { throw 'Could not register Windows scheduled task.' }
Write-Host 'Registered: Opportunity OS Due Scan. Windows checks once per hour.'
Write-Host 'Each source runs ONLY when its independent interval is due; status saved to SQLite.'
Write-Host 'This task requires the Windows user to be logged in (unless you change the task settings).'
Write-Host 'If you previously installed Opportunity OS Daily Scan, disable that old task to prevent an extra trigger.'
Write-Host 'Set AUTO_SCAN=0 in .env if using only Windows Task Scheduler to avoid redundant due checks.'
