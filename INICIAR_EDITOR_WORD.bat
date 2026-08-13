@echo off
title AssinaJur - Editor Word Local
echo ============================================================
echo ASSINAJUR - EDITOR WORD LOCAL
echo ============================================================
echo.
echo Editor Word local ativo. Mantenha esta janela aberta enquanto
echo estiver editando ou visualizando modelos Word no AssinaJur.
echo.
dotnet run --project "%~dp0word-service\AssinaJur.WordService.csproj"
pause
