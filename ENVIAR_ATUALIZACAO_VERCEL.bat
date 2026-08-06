@echo off
title Enviar Atualizacao AssinaJur para a Vercel

echo ============================================================
echo   ENVIANDO ATUALIZACAO DO ASSINAJUR PARA A VERCEL...
echo ============================================================
echo.

cd /d "%~dp0"

echo [1/3] Adicionando arquivos alterados...
git add .

echo.
echo [2/3] Sincronizando com o GitHub (git pull --rebase)...
git pull origin main --rebase

echo.
echo [3/3] Enviando para o GitHub (Deploy automatico na Vercel)...
git push origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================================
    echo   SUCESSO! O DEPLOY FOI DISPARADO NA VERCEL.
    echo   Acesse em ~30 segundos: https://assinajur.vercel.app
    echo ============================================================
) else (
    echo.
    echo ============================================================
    echo   ATENCAO: Ocorreu um erro no envio. Verifique a mensagem acima.
    echo ============================================================
)

echo.
pause
