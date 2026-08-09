@echo off
setlocal
title AssinaJur - Bot WhatsApp
cd /d "%~dp0"

if not exist ".env.bot" goto missing_config
if not exist "scripts\whatsapp-daemon.js" goto missing_bot

where node.exe >nul 2>nul
if errorlevel 1 goto missing_node

if not exist "node_modules\@whiskeysockets\baileys" (
    echo.
    echo Instalando bibliotecas do WhatsApp...
    call npm install @whiskeysockets/baileys qrcode-terminal pino node-fetch --legacy-peer-deps
    if errorlevel 1 goto install_error
)

:loop
cls
echo ============================================================
echo ASSINAJUR - BOT DE IA NO WHATSAPP
echo ============================================================
echo.
echo Conexao local ativa. Para encerrar, feche esta janela.
echo.
node "scripts\whatsapp-daemon.js"
echo.
echo A conexao foi encerrada. Reiniciando em 3 segundos...
timeout /t 3 /nobreak >nul
goto loop

:missing_config
echo.
echo CONFIGURACAO NECESSARIA
echo O arquivo .env.bot nao foi encontrado nesta pasta.
echo Consulte WHATSAPP_CONTROLE_REMOTO.md.
goto stop_with_error

:missing_bot
echo.
echo O arquivo scripts\whatsapp-daemon.js nao foi encontrado.
echo Execute este inicializador dentro da pasta do AssinaJur.
goto stop_with_error

:missing_node
echo.
echo O Node.js nao foi encontrado no computador.
echo Instale o Node.js e abra este arquivo novamente.
goto stop_with_error

:install_error
echo.
echo Nao foi possivel instalar as bibliotecas do WhatsApp.

:stop_with_error
echo.
pause
exit /b 1
