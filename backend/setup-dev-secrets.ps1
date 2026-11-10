# ---------------------------------------------------------------------------
# Expenso - one-time developer setup (run once per machine, from the backend folder)
#
#   cd backend
#   powershell -ExecutionPolicy Bypass -File .\setup-dev-secrets.ps1
#
# Stores three secrets with "dotnet user-secrets". They are saved in your Windows
# user profile, OUTSIDE the Git repository, so they are never committed.
# ---------------------------------------------------------------------------

param(
    [string]$DbPassword,
    [string]$DemoPassword = "Expenso@123",
    [string]$DbUser = "postgres",
    [string]$DbName = "expenso_dev"
)

$project = Join-Path $PSScriptRoot "ExpenseReimbursement.API"

if (-not $DbPassword) {
    $secure = Read-Host "PostgreSQL password for user '$DbUser'" -AsSecureString
    $DbPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
}

# A random 64-byte key for signing JWTs (HMAC-SHA256 needs at least 32 bytes).
$bytes = New-Object byte[] 64
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$jwtKey = [Convert]::ToBase64String($bytes)

$connection = "Host=localhost;Port=5432;Database=$DbName;Username=$DbUser;Password=$DbPassword"

dotnet user-secrets set "ConnectionStrings:Default" $connection --project $project | Out-Null
dotnet user-secrets set "Jwt:SigningKey" $jwtKey --project $project | Out-Null
dotnet user-secrets set "Seed:DefaultPassword" $DemoPassword --project $project | Out-Null

Write-Host ""
Write-Host "Secrets saved. Keys now set:" -ForegroundColor Green
dotnet user-secrets list --project $project | ForEach-Object { ($_ -split '=')[0] }
Write-Host ""
Write-Host "Demo logins (after first run): manager@expenso.local / employee1@expenso.local, password: $DemoPassword"
