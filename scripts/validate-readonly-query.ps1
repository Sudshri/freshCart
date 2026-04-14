# validate-readonly-query.ps1
# Blocks SQL write operations, allows SELECT queries only
# Used as a PreToolUse hook for the db-reader subagent

$input = $input | ConvertFrom-Json
$command = $input.tool_input.command

if (-not $command) {
    exit 0
}

# Block write operations (case-insensitive)
if ($command -match '\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|REPLACE|MERGE)\b') {
    Write-Error "Blocked: Write operations not allowed. Use SELECT queries only."
    exit 2
}

exit 0
