@echo off
title AssinaJur WhatsApp Bot 24/7
echo ============================================================
echo 🚀 INICIANDO ROBÔ DE IA DO ASSINAJUR NO WHATSAPP (24/7)
echo ============================================================
echo.
cd /d "%~dp0"
node scripts/whatsapp-daemon.js
pause
