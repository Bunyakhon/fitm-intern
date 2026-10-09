param([string]$ChromePath = 'C:\Program Files\Google\Chrome\Application\chrome.exe', [switch]$DailyLog, [switch]$Supervision, [switch]$SupervisionResults, [switch]$ActivityCalendar)
$ErrorActionPreference = 'Stop'
$taskRunId = [Guid]::NewGuid().ToString('N')
$taskPostgres = "fitm-staff-browser-$taskRunId"
$taskCreated = $false
$taskPassword = [Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N')
$taskEnvNames = @('FITM_STAFF_BROWSER_DATABASE_URL', 'FITM_STAFF_BROWSER_CHROME', 'FITM_DAILY_LOG_BROWSER', 'FITM_SUPERVISION_BROWSER', 'FITM_SUPERVISION_RESULTS_BROWSER', 'FITM_ACTIVITY_CALENDAR_BROWSER', 'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'NODE_ENV', 'JWT_SECRET')
$taskPrevious = @{}
foreach ($taskName in $taskEnvNames) { $taskPrevious[$taskName] = [Environment]::GetEnvironmentVariable($taskName, 'Process') }
try {
    if (!(Test-Path -LiteralPath $ChromePath)) { throw 'Chrome executable unavailable' }
    & docker run -d --name $taskPostgres --label "fitm.test-run=$taskRunId" --tmpfs /var/lib/postgresql/data -p '127.0.0.1::5432' -e "POSTGRES_PASSWORD=$taskPassword" -e POSTGRES_DB=fitm_staff_browser_test postgres:16-alpine -c fitm.a017_disposable=on
    if ($LASTEXITCODE -ne 0) { throw 'Could not start isolated browser PostgreSQL' }
    $taskCreated = $true
    for ($taskAttempt = 0; $taskAttempt -lt 30; $taskAttempt++) {
        & docker exec $taskPostgres pg_isready -U postgres -d fitm_staff_browser_test *> $null
        if ($LASTEXITCODE -eq 0) { break }
        Start-Sleep -Seconds 1
    }
    if ($LASTEXITCODE -ne 0) { throw 'Disposable PostgreSQL readiness failed' }
    $taskPorts = & docker inspect --format '{{json .NetworkSettings.Ports}}' $taskPostgres | ConvertFrom-Json
    $taskPort = $taskPorts.'5432/tcp'[0].HostPort
    if ($LASTEXITCODE -ne 0 -or $taskPort -notmatch '^\d+$') { throw 'Could not resolve isolated PostgreSQL port' }
    $env:FITM_STAFF_BROWSER_DATABASE_URL = "postgres://postgres:${taskPassword}@127.0.0.1:${taskPort}/fitm_staff_browser_test"
    $env:FITM_STAFF_BROWSER_CHROME = $ChromePath
    $env:FITM_DAILY_LOG_BROWSER = if ($DailyLog) { '1' } else { '0' }
    $env:FITM_SUPERVISION_BROWSER = if ($Supervision -or $SupervisionResults) { '1' } else { '0' }
    $env:FITM_SUPERVISION_RESULTS_BROWSER = if ($SupervisionResults) { '1' } else { '0' }
    $env:FITM_ACTIVITY_CALENDAR_BROWSER = if ($ActivityCalendar) { '1' } else { '0' }
    $env:DB_HOST = '127.0.0.1'; $env:DB_PORT = $taskPort; $env:DB_NAME = 'fitm_staff_browser_test'; $env:DB_USER = 'postgres'; $env:DB_PASSWORD = $taskPassword
    $env:NODE_ENV = 'test'; $env:JWT_SECRET = [Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N')
    & node (Join-Path $PSScriptRoot '../scripts/runDisposableStaffBrowserAcceptance.js')
    if ($LASTEXITCODE -ne 0) { throw 'Real Staff browser acceptance failed; see test output' }
} finally {
    foreach ($taskName in $taskEnvNames) { [Environment]::SetEnvironmentVariable($taskName, $taskPrevious[$taskName], 'Process') }
    if ($taskCreated) {
        $taskLabels = & docker inspect --format '{{json .Config.Labels}}' $taskPostgres | ConvertFrom-Json
        if ($LASTEXITCODE -eq 0 -and $taskLabels.'fitm.test-run' -eq $taskRunId) { & docker rm -f $taskPostgres }
    }
}
