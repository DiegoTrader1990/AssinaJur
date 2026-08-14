@echo off
setlocal
cd /d "%~dp0"

set "GIT=C:\Users\diego\AppData\Local\GitHubDesktop\app-3.5.5\resources\app\git\cmd\git.exe"
set "LOG=%~dp0PUBLICAR_HOME_ASSISTENTE.log"

if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
if exist ".git\index.lock" del /f /q ".git\index.lock"

echo === BUILD COMPLETO (npm run build: prisma generate + db push + next build) === > "%LOG%"
call npm run build >> "%LOG%" 2>&1
set "BUILD_EXIT=%ERRORLEVEL%"
echo BUILD_EXIT=%BUILD_EXIT% >> "%LOG%"
echo. >> "%LOG%"

if not "%BUILD_EXIT%"=="0" (
  echo BUILD FALHOU - push NAO realizado. Corrija o erro acima antes de publicar. >> "%LOG%"
  exit
)

echo === PULL --rebase === >> "%LOG%"
"%GIT%" pull origin main --rebase >> "%LOG%" 2>&1
echo PULL_EXIT=%ERRORLEVEL% >> "%LOG%"
echo. >> "%LOG%"

echo === PUSH === >> "%LOG%"
"%GIT%" push origin main >> "%LOG%" 2>&1
echo PUSH_EXIT=%ERRORLEVEL% >> "%LOG%"

exit
