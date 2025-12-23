@echo off
echo ===================================================
echo   DEPLOY MANUAL VERCEL (SEM GIT)
echo ===================================================
echo.
echo ATENCAO: Voce precisara interagir com este terminal.
echo Use as SETAS para escolher a opcao de login (ex: GitHub ou Email)
echo e aperte ENTER.
echo.
echo Passo 1: Autenticacao...
call npx vercel login
echo.
echo Passo 2: Construindo e Enviando para Producao...
call npx vercel --prod
echo.
echo ===================================================
echo   DEPLOY FINALIZADO!
echo ===================================================
pause
