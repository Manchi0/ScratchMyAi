@echo off
SETLOCAL

echo Starting ScratchMyAI...

:: Start Backend in a new window
echo Starting Backend...
start "ScratchMyAI Backend" cmd /k "cd backend && python -m uvicorn server:app --reload --port 8000"

:: Start Frontend in a new window
echo Starting Frontend...
start "ScratchMyAI Frontend" cmd /k "cd frontend && npm run dev -- --port 5173"

echo.
echo --------------------------------------------------
echo Both services are starting in separate windows.
echo - Backend: http://localhost:8000
echo - Frontend: http://localhost:5173
echo --------------------------------------------------
echo.

pause
