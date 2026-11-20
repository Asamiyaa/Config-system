# Compatibility wrapper from V1.0. Upgraded scheduler is per-source, hourly due checking.
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
& (Join-Path $Root 'install_due_task.ps1')
