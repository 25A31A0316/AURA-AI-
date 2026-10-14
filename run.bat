@echo off
title Aura AI - Local Assistant
echo ====================================================
echo        Starting Aura AI (Local Ollama)
echo ====================================================
echo.

:: 1. Check if Ollama service is running on port 11434
curl -s http://localhost:11434/api/tags >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [Ollama] Launching Ollama background service...
    if exist "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" (
        start "" "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" serve
    ) else (
        start "" ollama serve
    )
    timeout /t 3 /nobreak >nul
) else (
    echo [Ollama] Service is running on port 11434.
)

:: 2. Launch browser automatically
echo [Aura AI] Opening http://localhost:8000 in your browser...
start http://localhost:8000

:: 3. Run Python Server
echo [Server] Starting Aura AI server on port 8000...
echo Press Ctrl+C anytime to stop.
echo ====================================================
echo.
python server.py

pause
