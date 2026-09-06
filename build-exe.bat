@echo off
chcp 65001 >nul
echo ============================================
echo   Tracker DayPlan - сборка Windows .exe
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [!] Не найден Node.js. Установи: https://nodejs.org
  pause & exit /b 1
)

where cargo >nul 2>nul
if errorlevel 1 (
  echo [!] Не найден Rust. Установи: https://rustup.rs
  echo     После установки закрой и открой это окно заново.
  pause & exit /b 1
)

echo [1/3] Установка зависимостей...
call npm install || (echo Ошибка npm install & pause & exit /b 1)

echo.
echo [2/3] Сборка приложения (первый раз 5-10 минут)...
call npm run tauri build || (echo Ошибка сборки & pause & exit /b 1)

echo.
echo [3/3] Готово.
echo.
echo Установщик:
echo   src-tauri\target\release\bundle\nsis\
echo Портативный exe (без установки):
echo   src-tauri\target\release\Tracker DayPlan.exe
echo.
pause
