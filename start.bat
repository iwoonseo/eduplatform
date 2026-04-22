@echo off
title EduPlatform — Запуск
color 0A

echo.
echo  ======================================
echo    EduPlatform — Запуск проекта
echo  ======================================
echo.

:: Убиваем старые процессы на портах 5000 и 3000
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":5000 " ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3000 " ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1

echo  Шаг 1: Запуск Backend (порт 5000)...
start "Backend 5000" "%~dp0run-backend.bat"

timeout /t 3 /nobreak >nul

echo  Шаг 2: Запуск Frontend (порт 3000)...
start "Frontend 3000" "%~dp0run-frontend.bat"

echo.
echo  Два окна запущены!
echo  Подождите 20 секунд пока React скомпилируется...
echo  Затем откройте: http://localhost:3000
echo.
timeout /t 20 /nobreak >nul
start "" "http://localhost:3000"
