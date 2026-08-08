@echo off
chcp 65001 >nul
title AssinaJur WhatsApp Bot 24/7 (Sessao Continua)
cd /d "%~dp0"

if not exist .env.bot (
    echo.
    echo ============================================================
    echo CONFIGURACAO NECESSARIA
    echo ============================================================
    echo Copie .env.bot.example para .env.bot e preencha:
    echo - WHATSAPP_BOT_SECRET
    echo - WHATSAPP_ADMIN_PHONE
    echo.
    echo O mesmo WHATSAPP_BOT_SECRET precisa estar configurado na Vercel.
    echo Consulte WHATSAPP_CONTROLE_REMOTO.md.
    echo.
    pause
    exit /b 1
)

if not exist node_modules\@whiskeysockets\baileys (
    echo.
    echo 📦 Instalando bibliotecas do WhatsApp no seu computador...
    call npm install @whiskeysockets/baileys qrcode-terminal pino node-fetch --legacy-peer-deps
)

:loop
cls
echo ============================================================
echo 🚀 INICIANDO ROBÔ DE IA DO ASSINAJUR NO WHATSAPP (24/7)
echo ============================================================
echo.
echo Mantendo a conexao 100%% estavel e ativa...
echo.
node scripts/whatsapp-daemon.js
echo.
echo ⚠️ Conexao encerrada. Reiniciando em 3 segundos...
timeout /t 3 /nobreak >nul
goto loop
