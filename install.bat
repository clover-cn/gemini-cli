@echo off
setlocal enabledelayedexpansion

echo 🚀 Installing Gemini Plus CLI...

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js (^>=18.0.0) first.
    exit /b 1
)

REM Get Node.js version
for /f "tokens=1" %%i in ('node -v') do set NODE_VERSION=%%i
set NODE_VERSION=%NODE_VERSION:v=%

echo ✅ Node.js version %NODE_VERSION% detected

REM Install dependencies
echo 📦 Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    exit /b 1
)

REM Build the project
echo 🔨 Building the project...
call npm run bundle
if %errorlevel% neq 0 (
    echo ❌ Failed to build the project
    exit /b 1
)

REM Install globally
echo 🌍 Installing globally...
call npm install -g .
if %errorlevel% neq 0 (
    echo ❌ Failed to install globally
    exit /b 1
)

echo ✅ Gemini Plus CLI installed successfully!
echo.
echo You can now use the 'gemini-plus' command anywhere:
echo   gemini-plus --help
echo   gemini-plus --version
echo   gemini-plus
echo.
echo 🎉 Happy coding!

pause
