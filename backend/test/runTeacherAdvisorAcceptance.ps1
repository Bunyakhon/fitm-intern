param([string]$BackendImage = 'fitm-intern-backend', [switch]$FullBackend, [switch]$FrontendOnly, [switch]$BackendOnly, [string[]]$FocusedBackendTests)
$ErrorActionPreference = 'Stop'
$taskRunId = [Guid]::NewGuid().ToString('N')
$taskNetwork = "fitm-teacher-test-$taskRunId"
$taskPostgres = "fitm-teacher-postgres-$taskRunId"
$taskRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$networkCreated = $false
$containerCreated = $false
function Invoke-TeacherTestDocker {
    param([string[]]$DockerArguments)
    & docker @DockerArguments
    if ($LASTEXITCODE -ne 0) { throw 'Isolated Teacher advisor verification failed' }
}
try {
    Invoke-TeacherTestDocker @('network', 'create', '--internal', '--label', "fitm.test-run=$taskRunId", $taskNetwork)
    $networkCreated = $true
    Invoke-TeacherTestDocker @('run', '-d', '--name', $taskPostgres, '--label', "fitm.test-run=$taskRunId", '--network', $taskNetwork, '--network-alias', 'teacher-test-postgres', '--network-alias', 'a013-postgres', '--tmpfs', '/var/lib/postgresql/data', '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', '-e', 'POSTGRES_DB=fitm_advisor_test', 'postgres:16-alpine', '-c', 'fitm.a013_disposable=on', '-c', 'fitm.a014_disposable=on', '-c', 'fitm.a015_disposable=on')
    $containerCreated = $true
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        & docker exec $taskPostgres pg_isready -h 127.0.0.1 -U postgres -d fitm_advisor_test *> $null
        if ($LASTEXITCODE -eq 0) { break }
        Start-Sleep -Seconds 1
    }
    if ($LASTEXITCODE -ne 0) { throw 'Disposable PostgreSQL did not become ready' }
    foreach ($database in @('fitm_role_test', 'fitm_project_test', 'fitm_evaluation_test', 'fitm_documents_test', 'fitm_migration_test', 'fitm_recruitment_test', 'fitm_legacy_recruitment_test')) {
        Invoke-TeacherTestDocker @('exec', $taskPostgres, 'createdb', '-h', '127.0.0.1', '-U', 'postgres', $database)
    }
    $runner = @('run', '--rm', '--network', $taskNetwork, '--mount', "type=bind,source=$taskRoot,target=/workspace,readonly", '-w', '/workspace/backend', '-e', 'NODE_PATH=/app/node_modules', '-e', 'DB_HOST=teacher-test-postgres', '-e', 'DB_PORT=5432', '-e', 'DB_NAME=fitm_role_test', '-e', 'DB_USER=postgres', '-e', 'DB_PASSWORD=unused-test-only', '-e', 'JWT_SECRET=isolated-teacher-test-key', '-e', 'FRONTEND_URL=http://localhost:5173', '-e', 'ROLE_BACKEND_INTEGRATION_TEST=true', '-e', 'ROLE_DISPOSABLE_DATABASE_URL=postgres://postgres@teacher-test-postgres/fitm_role_test', '-e', 'COOP_ADVISOR_DISPOSABLE_DATABASE_URL=postgres://postgres@teacher-test-postgres/fitm_advisor_test', '-e', 'COOP_PROJECT_DISPOSABLE_DATABASE_URL=postgres://postgres@teacher-test-postgres/fitm_project_test', '-e', 'COOP_UI_DISPOSABLE_DATABASE_URL=postgres://postgres@teacher-test-postgres/fitm_role_test')
    # Sequential files prevent tests sharing a disposable DB from racing DDL.
    $runner += @('-e', 'STAFF_DOCUMENTS_DISPOSABLE_DATABASE_URL=postgres://postgres@teacher-test-postgres/fitm_documents_test')
    $backendTests = @('test/coopProjectAdvisor.database.test.js', 'test/coopProjectAdvisorMigration.test.js', 'test/devTeacherCredential.database.test.js', 'test/studentCoopProject.database.test.js', 'test/coopProjectMigration.test.js', 'test/roleWorkflow.database.test.js', 'test/roleAuth.test.js', 'test/staffAuth.test.js', 'test/staffDocuments.database.test.js', 'test/studentAdvisor.test.js', 'test/coopPrerequisites.test.js', 'test/coopDirectWorkflow.test.js')
    if ($FullBackend) {
        $runner += @('-e', 'DB_NAME=fitm_legacy_recruitment_test', '-e', 'TURNSTILE_SECRET_KEY=mock-provider-only', '-e', 'RECRUITMENT_INTEGRATION_TEST=true', '-e', 'STUDENT_FILE_MIGRATION_TEST=true', '-e', 'COOP_DISPOSABLE_DATABASE_URL=postgres://postgres@teacher-test-postgres/fitm_role_test', '-e', 'COMPANY_EVALUATION_DISPOSABLE_DATABASE_URL=postgres://postgres@teacher-test-postgres/fitm_evaluation_test')
        if (!$FrontendOnly) { Invoke-TeacherTestDocker ($runner + @($BackendImage, 'node', 'src/db/migrate.js', 'up')) }
        $backendTests = Get-ChildItem -LiteralPath $PSScriptRoot -Filter '*.test.js' | ForEach-Object { "test/$($_.Name)" }
    }
    if ($FocusedBackendTests) {
        $backendTests = foreach ($focusedTest in $FocusedBackendTests) {
            if ($focusedTest -notmatch '^[A-Za-z0-9_.-]+\.test\.js$' -or !(Test-Path -LiteralPath (Join-Path $PSScriptRoot $focusedTest))) { throw 'Invalid focused backend test file' }
            "test/$focusedTest"
        }
    }
    if (!$FrontendOnly) { Invoke-TeacherTestDocker ($runner + @($BackendImage, 'node', '--test', '--test-concurrency=1') + $backendTests) }
    $frontendTests = Get-ChildItem -LiteralPath (Join-Path $taskRoot 'frontend/test') -Filter '*.test.js' | ForEach-Object { "/workspace/frontend/test/$($_.Name)" }
    if (!$BackendOnly) { Invoke-TeacherTestDocker ($runner + @($BackendImage, 'node', '--test', '--test-concurrency=1') + $frontendTests) }
} finally {
    # Only resources owned by this invocation; never target Compose or Local.
    if ($containerCreated) {
        $labels = & docker inspect --format '{{json .Config.Labels}}' $taskPostgres | ConvertFrom-Json
        if ($LASTEXITCODE -eq 0 -and $labels.'fitm.test-run' -eq $taskRunId) { & docker rm -f $taskPostgres }
    }
    if ($networkCreated) {
        $labels = & docker network inspect --format '{{json .Labels}}' $taskNetwork | ConvertFrom-Json
        if ($LASTEXITCODE -eq 0 -and $labels.'fitm.test-run' -eq $taskRunId) { & docker network rm $taskNetwork }
    }
}
