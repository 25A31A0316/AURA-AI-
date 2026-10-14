@echo off
title AuraChat AI - Local Assistant
echo ====================================================
echo      Starting AuraChat (Local Ollama & AI)
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
    echo [Ollama] Service already active on port 11434.
)

:: 2. Launch browser automatically
echo [AuraChat] Opening http://localhost:8000 in default browser...
start http://localhost:8000

:: 3. Run Python Server
echo [Server] Starting AuraChat server on port 8000...
echo Press Ctrl+C in this window to stop the server anytime.
echo ====================================================
echo.
python server.py

pause
