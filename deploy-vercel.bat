@echo off
chcp 65001 >nul
echo.
echo DEPLOY VERCEL - sebitamoficials-projects
echo https://vercel.com/sebitamoficials-projects
echo.

npx vercel whoami >nul 2>&1
if errorlevel 1 (
    echo.
    echo Nao esta logado na Vercel.
    echo Execute: npx vercel login
    echo Escolha a conta: sebitamoficial
    pause
    exit /b 1
)

echo Logado na Vercel
echo.
echo Iniciando deploy...
npx vercel --prod --yes

if errorlevel 1 (
    echo.
    echo Erro no deploy
    pause
    exit /b 1
)

echo.
echo Deploy concluido!
echo https://vercel.com/sebitamoficials-projects
echo.
pause
