@echo off
rem Inicia la API (puerto 3000) y la aplicación web (puerto 5173) de Jorge Motors
cd /d "%~dp0"
start "Jorge Motors - API" cmd /k "cd backend && npm run dev"
start "Jorge Motors - Web" cmd /k "cd frontend && npm run dev"
timeout /t 4 >nul
start http://localhost:5173
