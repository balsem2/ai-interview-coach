param(
    [string]$DatabaseUrl = "postgresql://postgres:postgres@localhost:5434/ai_interview_db",
    [string]$SecretKey = "",
    [string]$AiProvider = "ollama",
    [string]$OllamaUrl = "http://127.0.0.1:11434",
    [string]$OllamaModel = "llama3.2:1b"
)

$BackendDir = Join-Path $PSScriptRoot "backend"
$EnvPath = Join-Path $BackendDir ".env"
$ExamplePath = Join-Path $BackendDir ".env.example"

if (!(Test-Path $ExamplePath)) {
    throw "backend/.env.example was not found."
}

if (Test-Path $EnvPath) {
    $existingContent = Get-Content -Path $EnvPath -Raw
    if ($existingContent -match '(?m)^SECRET_KEY=.+$') {
        Write-Host "backend/.env already exists and contains SECRET_KEY. Keeping existing values."
        exit 0
    }

    Add-Content -Path $EnvPath -Value "SECRET_KEY=$SecretKey" -Encoding UTF8
    Write-Host "A generated SECRET_KEY was added to the existing backend/.env."
    exit 0
}

if ([string]::IsNullOrWhiteSpace($SecretKey)) {
    $randomBytes = New-Object byte[] 48
    $randomGenerator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $randomGenerator.GetBytes($randomBytes)
        $SecretKey = [Convert]::ToBase64String($randomBytes)
    }
    finally {
        $randomGenerator.Dispose()
    }
}

Copy-Item -Path $ExamplePath -Destination $EnvPath

$content = @"
DATABASE_URL=$DatabaseUrl
SECRET_KEY=$SecretKey
AI_PROVIDER=$AiProvider
OLLAMA_URL=$OllamaUrl
OLLAMA_MODEL=$OllamaModel
"@

Set-Content -Path $EnvPath -Value $content -Encoding UTF8

Write-Host "backend/.env created from backend/.env.example."
Write-Host "DATABASE_URL=$DatabaseUrl"
