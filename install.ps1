# Gemini Plus CLI Installation Script for PowerShell

Write-Host "🚀 Installing Gemini Plus CLI..." -ForegroundColor Green

# Check if Node.js is installed
try {
    $nodeVersion = node -v
    Write-Host "✅ Node.js version $nodeVersion detected" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed. Please install Node.js (>=18.0.0) first." -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
try {
    npm install
    if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
} catch {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Build the project
Write-Host "🔨 Building the project..." -ForegroundColor Yellow
try {
    npm run bundle
    if ($LASTEXITCODE -ne 0) { throw "npm run bundle failed" }
} catch {
    Write-Host "❌ Failed to build the project" -ForegroundColor Red
    exit 1
}

# Install globally
Write-Host "🌍 Installing globally..." -ForegroundColor Yellow
try {
    npm install -g .
    if ($LASTEXITCODE -ne 0) { throw "npm install -g failed" }
} catch {
    Write-Host "❌ Failed to install globally" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Gemini Plus CLI installed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "You can now use the 'gemini-plus' command anywhere:" -ForegroundColor Cyan
Write-Host "  gemini-plus --help" -ForegroundColor White
Write-Host "  gemini-plus --version" -ForegroundColor White
Write-Host "  gemini-plus" -ForegroundColor White
Write-Host ""
Write-Host "🎉 Happy coding!" -ForegroundColor Green

Read-Host "Press Enter to continue..."
