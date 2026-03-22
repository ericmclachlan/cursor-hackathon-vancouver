# build.ps1 — rebuild the extension locally, installing Node.js if needed

$ErrorActionPreference = "Stop"

# Check for node; install via winget if missing
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js not found. Installing via winget..."
    winget install --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
    # Refresh PATH so node/npm are available in this session
    $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" +
                [System.Environment]::GetEnvironmentVariable("PATH", "User")
}

Write-Host "Node $(node --version)  npm $(npm --version)"

npm install
npm run build:win

Write-Host "`nDone! Load the 'dist' folder in chrome://extensions"
