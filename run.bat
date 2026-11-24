@echo off
title Student Progress Reports App Launcher
echo ===================================================
echo   🎓 Student Progress Reports App Launcher
echo ===================================================
echo.

:: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/ to run this application.
    echo.
    pause
    exit /b 1
)

echo [INFO] Node.js detected.
echo.

:: Check node_modules
if not exist "node_modules\" (
    echo [INFO] Installing required libraries... (This may take a moment)
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo [ERROR] Dependency installation failed!
        echo Please ensure you are connected to the internet and try again.
        echo.
        pause
        exit /b 1
    )
    echo [INFO] Libraries installed successfully.
    echo.
)

echo [INFO] Starting local server...
echo [INFO] The application will open in your default browser.
echo.
echo Press Ctrl+C in this terminal window to stop the application.
echo.

npm run dev
