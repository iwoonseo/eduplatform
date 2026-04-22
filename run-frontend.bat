@echo off
title EduPlatform — Frontend (порт 3000)
color 0D
cd /d "%~dp0frontend"
echo  Frontend компилируется, ждите 15-20 секунд...
echo  http://localhost:3000
echo.
set DANGEROUSLY_DISABLE_HOST_CHECK=true
set BROWSER=none
node_modules\.bin\react-scripts start
pause
