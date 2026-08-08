@echo off
title AssinaJur WhatsApp Bot 24/7 (Sessao Continua)
:loop
cls
echo ============================================================
echo 🚀 INICIANDO ROBÔ DE IA DO ASSINAJUR NO WHATSAPP (24/7)
echo ============================================================
echo.
echo Mantendo a conexao 100%% estavel e ativa...
echo.
cd /d "%~dp0"
node scripts/whatsapp-daemon.js
echo.
echo ⚠️ Conexao encerrada. Reiniciando em 3 segundos...
timeout /t 3 /nobreak >nul
goto loop
