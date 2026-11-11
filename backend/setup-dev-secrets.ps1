# Expenso - one-time developer setup (run from any directory)
param([string]$DemoPassword = "Password@123")
$project = Join-Path $PSScriptRoot "ExpenseReimbursement.API"
$bytes = New-Object byte[] 64
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$jwtKey = [Convert]::ToBase64String($bytes)
dotnet user-secrets set "ConnectionStrings:Default" "Data Source=expenso.db" --project $project | Out-Null
dotnet user-secrets set "Jwt:SigningKey" $jwtKey --project $project | Out-Null
dotnet user-secrets set "Seed:DefaultPassword" $DemoPassword --project $project | Out-Null
Write-Host "SQLite uses backend/ExpenseReimbursement.API/expenso.db; no database server is needed."
Write-Host "Manager login: ramchinta@gmail.com / $DemoPassword"
