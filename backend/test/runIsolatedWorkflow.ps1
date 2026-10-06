param([string]$BackendImage = 'fitm-intern-backend')
$ErrorActionPreference = 'Stop'
$taskRunId = [Guid]::NewGuid().ToString('N')
$taskNetwork = "fitm-workflow-test-$taskRunId"
$taskPostgres = "fitm-workflow-postgres-$taskRunId"
$taskSource = (Resolve-Path (Join-Path $PSScriptRoot '../src')).Path
$taskTests = (Resolve-Path $PSScriptRoot).Path
$networkCreated = $false
$containerCreated = $false
function Invoke-TestDocker {
    param([string[]]$DockerArguments)
    & docker @DockerArguments
    if ($LASTEXITCODE -ne 0) { throw 'Isolated Docker verification command failed' }
}
try {
    Invoke-TestDocker @('network', 'create', '--label', "fitm.test-run=$taskRunId", $taskNetwork)
    $networkCreated = $true
    Invoke-TestDocker @('run', '-d', '--name', $taskPostgres, '--label', "fitm.test-run=$taskRunId", '--network', $taskNetwork, '--network-alias', 'a013-postgres', '--tmpfs', '/var/lib/postgresql/data', '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', '-e', 'POSTGRES_DB=fitm_migration_test', 'postgres:16-alpine', '-c', 'fitm.a013_disposable=on')
    $containerCreated = $true
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        & docker exec $taskPostgres pg_isready -U postgres -d fitm_migration_test *> $null
        if ($LASTEXITCODE -eq 0) { break }
        Start-Sleep -Seconds 1
    }
    if ($LASTEXITCODE -ne 0) { throw 'Disposable PostgreSQL did not become ready' }
    foreach ($database in @('fitm_recruitment_test', 'fitm_role_test', 'fitm_legacy_recruitment_test')) {
        Invoke-TestDocker @('exec', $taskPostgres, 'createdb', '-U', 'postgres', $database)
    }
    $runner = @('run', '--rm', '--network', $taskNetwork, '--mount', "type=bind,source=$taskSource,target=/app/src,readonly", '--mount', "type=bind,source=$taskTests,target=/app/test,readonly", '-e', 'DB_HOST=a013-postgres', '-e', 'DB_NAME=fitm_legacy_recruitment_test', '-e', 'DB_USER=postgres', '-e', 'DB_PASSWORD=unused-test-only', '-e', 'JWT_SECRET=isolated-test-signing-key', '-e', 'TURNSTILE_SECRET_KEY=mock-provider-only', '-e', 'FRONTEND_URL=http://localhost:5173')
    Invoke-TestDocker ($runner + @($BackendImage, 'node', 'src/db/migrate.js', 'up'))
    Invoke-TestDocker ($runner + @('-e', 'ROLE_BACKEND_INTEGRATION_TEST=true', '-e', 'STUDENT_FILE_MIGRATION_TEST=true', '-e', 'RECRUITMENT_INTEGRATION_TEST=true', $BackendImage, 'npm', 'test'))
} finally {
    # Remove only resources created by this invocation, verified by ownership label.
    # No Compose container, persistent volume or current Local DB is targeted.
    if ($containerCreated) {
        $labels = & docker inspect --format '{{json .Config.Labels}}' $taskPostgres | ConvertFrom-Json
        if ($LASTEXITCODE -eq 0 -and $labels.'fitm.test-run' -eq $taskRunId) { & docker rm -f $taskPostgres }
    }
    if ($networkCreated) {
        $labels = & docker network inspect --format '{{json .Labels}}' $taskNetwork | ConvertFrom-Json
        if ($LASTEXITCODE -eq 0 -and $labels.'fitm.test-run' -eq $taskRunId) { & docker network rm $taskNetwork }
    }
}
