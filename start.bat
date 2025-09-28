@echo off
chcp 65001 >nul

set "PATH=C:\Windows\System32;C:\Windows;C:\Windows\System32\Wbem;%PATH%"
set "NODE_EXE=C:\Program Files\nodejs\node.exe"

echo ====================================
echo    PDF Audio Annotation Server
echo ====================================
echo.

:: 检查端口3000是否被占用
echo 检查端口3000占用情况...
netstat -ano | findstr :3000
if not errorlevel 1 (
    echo.
    echo 警告：端口3000已被占用！
    echo 正在尝试结束占用该端口的进程...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
        echo 正在结束进程 %%a
        taskkill /f /pid %%a >nul 2>&1
    )
    timeout /t 2 /nobreak > nul
) else (
    echo 端口3000可用
)

echo.
echo Starting server...
echo Please do not close this window!
echo.

:: Check if Node.js is installed
"%NODE_EXE%" --version > nul 2>&1
if errorlevel 1 (
    echo Error: Node.js is not installed or not found at expected location!
    echo Current NODE_EXE path: %NODE_EXE%
    echo.
    echo Trying to find Node.js in PATH...
    node --version > nul 2>&1
    if errorlevel 1 (
        echo Node.js not found in PATH either.
        echo Please install Node.js first.
        echo Download: https://nodejs.org/
    ) else (
        echo Found Node.js in PATH, updating NODE_EXE...
        set "NODE_EXE=node"
        echo Node.js version:
        node --version
    )
    if not "%NODE_EXE%"=="node" (
        pause
        exit /b
    )
)

echo.
echo Node.js version:
"%NODE_EXE%" --version

:: Check required directories
if not exist "uploads" mkdir uploads
if not exist "notes" mkdir notes
if not exist "pdf_data" mkdir pdf_data

:: Check dependencies
if not exist "node_modules" (
    echo.
    echo Installing dependencies...
    echo This may take a few minutes...
    "%NODE_EXE%" -e "console.log('Node.js is working')"
    if errorlevel 1 (
        echo Node.js test failed!
        pause
        exit /b
    )
    
    npm install
    if errorlevel 1 (
        echo Failed to install dependencies!
        echo Trying alternative installation method...
        "%NODE_EXE%" "%APPDATA%\npm\node_modules\npm\bin\npm-cli.js" install
        if errorlevel 1 (
            echo All installation methods failed!
            echo Please run 'npm install' manually
            pause
            exit /b
        )
    )
    echo Dependencies installed successfully!
) else (
    echo Dependencies already installed.
)

:: Test server startup
echo.
echo Testing server startup...
start /b "" "%NODE_EXE%" server.js
set "SERVER_PID="

:: Wait longer for server to start
echo Waiting for server to start...
timeout /t 5 /nobreak > nul

:: Multiple attempts to check server
set /a attempts=0
:check_server
set /a attempts+=1
if %attempts% gtr 10 (
    echo Server startup verification failed after 10 attempts.
    goto server_failed
)

:: Check if port is listening
netstat -ano | findstr :3000 | findstr LISTENING > nul
if errorlevel 1 (
    echo Attempt %attempts%: Server not yet listening on port 3000...
    timeout /t 1 /nobreak > nul
    goto check_server
)

echo Server is listening on port 3000!

:: Test HTTP response
echo Testing HTTP response...
curl -s -m 5 http://localhost:3000/health > nul
if errorlevel 1 (
    echo Warning: Server is listening but not responding to HTTP requests.
    echo This might be normal during startup.
) else (
    echo Server is responding to HTTP requests!
)

:: Open in browser
echo.
echo Opening browser...
start http://localhost:3000

echo.
echo ====================================
echo Server started successfully!
echo ====================================
echo.
echo If browser doesn't open automatically, visit: http://localhost:3000
echo.
echo Tips:
echo - To stop server, close this window or press Ctrl+C
echo - Notes are saved in 'pdf_data' directory
echo - Each PDF has its own subdirectory
echo ====================================
echo.

:: Keep window open and monitor server
:loop
timeout /t 3 /nobreak > nul
tasklist | find "node.exe" > nul
if errorlevel 1 (
    echo.
    echo Server process stopped!
    echo This usually happens when:
    echo 1. Server encountered an error
    echo 2. Another process killed it
    echo 3. You pressed Ctrl+C
    pause
    exit /b
)

:: Check if port is still listening
netstat -ano | findstr :3000 | findstr LISTENING > nul
if errorlevel 1 (
    echo.
    echo Warning: Server process running but port 3000 not listening!
    echo Checking for errors...
    timeout /t 2 /nobreak > nul
)

goto loop

:server_failed
echo.
echo ====================================
echo Server failed to start!
echo ====================================
echo.
echo Troubleshooting steps:
echo 1. Check if another application is using port 3000
echo 2. Try running 'npm install' manually
echo 3. Check Windows Firewall settings
echo 4. Try running as Administrator
echo 5. Check antivirus software (might block Node.js)
echo.
echo For manual startup, try:
echo   npm install
echo   node server.js
echo.
echo Current directory: %CD%
echo Node.js path: %NODE_EXE%
echo.
pause
exit /b