@echo off
chcp 65001 > NUL
title Enviar Atualizacao AssinaJur para a Vercel

echo ============================================================
echo   ENVIANDO ATUALIZAÇÃO DO ASSINAJUR PARA A VERCEL...
echo ============================================================
echo.

cd /d "%~dp0"

echo [1/2] Verificando arquivos alterados...
git add .

echo.
echo [2/2] Enviando para o GitHub (Deploy automatico na Vercel)...
git push origin main

echo.
echo ============================================================
echo   SUCESSO! O DEPLOY FOI DISPARADO NA VERCEL.
echo   Acesse em ~30 segundos: https://assinajur.vercel.app
echo ============================================================
echo.
pause
