@echo off
title EduPlatform — Backend (порт 5000)
color 0B
cd /d "%~dp0backend"
echo  Backend API запускается...
echo  http://localhost:5000
echo.
node src/index.js
pause
