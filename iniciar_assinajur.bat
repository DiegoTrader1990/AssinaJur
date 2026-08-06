@echo off
title AssinaJur - Sistema de Assinatura Eletronica para Advogados
cls
echo ====================================================================
echo             INICIANDO SISTEMA ASSINAJUR (FASES 1 A 5)
echo     "Contratacao e assinatura eletronica para advogados."
echo ====================================================================
echo.
echo [1/2] Sincronizando Banco de Dados e Populando Dados Iniciais (Seed)...
call npx prisma db push --accept-data-loss
call npx prisma db seed
echo.
echo ====================================================================
echo [2/2] Servidor iniciado com sucesso!
echo.
echo  - Acesse o sistema em: http://localhost:3000
echo  - Login do Escritorio: diego@rodriguessoares.adv.br / Cemav@123
echo  - Login Super Admin:   admin@assinajur.com.br / Cemav@123
echo ====================================================================
echo.
call npm run dev
pause
