@echo off
title Aura AI - Cloudflare Public Tunnel
echo ====================================================
echo      Starting Cloudflare Public Tunnel for Aura AI
echo ====================================================
echo.
echo Tunneling http://localhost:8000 to the public web...
echo.

if exist "%USERPROFILE%\.gemini\antigravity-ide\scratch\gemini-chatbox\cloudflared.exe" (
    "%USERPROFILE%\.gemini\antigravity-ide\scratch\gemini-chatbox\cloudflared.exe" tunnel --url http://localhost:8000
) else (
    cloudflared tunnel --url http://localhost:8000
)

pause
