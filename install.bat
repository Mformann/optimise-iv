@echo off
echo =======================================================
echo     Optimise IV CRM Prototype - Installation Script
echo =======================================================
echo.

echo Checking Node.js installation...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR]: Node.js is not installed! Please install Node.js (v18 or higher) from https://nodejs.org/
    exit /b 1
)

echo.
echo Installing root dependencies and triggering frontend/backend installs...
call npm install

echo.
echo =======================================================
echo Installation Complete!
echo You can now start the application by running:
echo   npm run dev
echo =======================================================
pause
