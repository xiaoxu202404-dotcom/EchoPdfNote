@echo off

set "PATH=C:\Windows\System32;C:\Windows;C:\Windows\System32\Wbem;%PATH%"
set "NODE_EXE=C:\Program Files\nodejs\node.exe"

echo ====================================
echo    PDF Audio Annotation Server
echo ====================================
echo.
echo Starting server...
echo Please do not close this window!
echo.

:: Check if Node.js is installed
"%NODE_EXE%" --version > nul 2>&1
if errorlevel 1 (
    echo Error: Node.js is not installed!
    echo Please install Node.js first.
    echo Download: https://nodejs.org/
    pause
    exit /b
)

:: Check required directories
if not exist "uploads" mkdir uploads
if not exist "notes" mkdir notes

:: Check dependencies
if not exist "node_modules" (
    echo Installing dependencies...
    call "%NODE_EXE%" "%ProgramFiles%\nodejs\node_modules\npm\bin\npm-cli.js" install
    if errorlevel 1 (
        echo Failed to install dependencies!
        pause
        exit /b
    )
)

:: Start server
echo Starting server...
start /b "" "%NODE_EXE%" server.js

:: Wait for server
timeout /t 3 /nobreak > nul

:: Check if server is running
curl -s http://localhost:3000/health > nul
if errorlevel 1 (
    echo Server failed to start!
    echo Please check if port 3000 is in use.
    pause
    exit /b
)

:: Open in browser
start http://localhost:3000

echo.
echo Server started successfully!
echo If browser doesn't open automatically, visit: http://localhost:3000
echo.
echo Tips:
echo - To stop server, close this window
echo - Notes are saved in 'notes' directory
echo - Audio files are saved in 'uploads' directory
echo ====================================
echo.

:: Keep window open
:loop
timeout /t 1 /nobreak > nul
tasklist | find "node.exe" > nul
if errorlevel 1 (
    echo Server stopped!
    pause
    exit /b
)
goto loop