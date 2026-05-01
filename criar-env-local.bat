@echo off
chcp 65001 >nul
cd /d "%~dp0"
if exist ".env.local" (
    if "%1" neq "/F" (
        echo O arquivo .env.local ja existe. Use criar-env-local.bat /F para recriar.
        if "%1" neq "/Q" pause
        exit /b 0
    )
    echo Recriando .env.local...
)
if not exist ".env.example" (
    echo Arquivo .env.example nao encontrado.
    if "%1" neq "/Q" pause
    exit /b 1
)
copy ".env.example" ".env.local" >nul
echo Arquivo .env.local criado a partir de .env.example.
echo Abra .env.local e substitua your_supabase_anon_key_here pela sua chave do Supabase.
if "%1" neq "/Q" pause
