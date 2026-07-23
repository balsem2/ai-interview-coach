param(
    [string]$DatabaseUrl = "postgresql://postgres:postgres@localhost:5433/ai_interview_db",
    [string]$SecretKey = "dev-secret-key-change-me",
    [string]$AiProvider = "ollama",
    [string]$OllamaUrl = "http://127.0.0.1:11434",
    [string]$OllamaModel = "llama3.2:1b"
)

$BackendDir = Join-Path $PSScriptRoot "backend"
$EnvPath = Join-Path $BackendDir ".env"
$ExamplePath = Join-Path $BackendDir ".env.example"

if (Test-Path $EnvPath) {
    Write-Host "backend/.env already exists. Keeping existing values."
    exit 0
}

if (!(Test-Path $ExamplePath)) {
    throw "backend/.env.example was not found."
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
