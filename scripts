@echo off
echo ========================================
echo DIAGNOSTICO DO APP - GESTAO CHURCH
echo ========================================
echo.
echo 1. Parando processos na porta 3000...
netstat -ano | findstr :3000
echo.
echo 2. Limpando cache do npm...
cd "c:\Users\eduka\Downloads\App Gestão Igreja"
rmdir /s /q node_modules\.vite 2>nul
echo Cache limpo!
echo.
echo 3. Iniciando servidor...
start cmd /k "cd /d \"c:\Users\eduka\Downloads\App Gestão Igreja\" && npm run dev"
echo.
echo 4. Aguardando 5 segundos...
timeout /t 5 /nobreak >nul
echo.
echo 5. Abrindo navegador...
start http://localhost:3000/login
echo.
echo ========================================
echo PRONTO! O navegador deve abrir em 3...2...1...
echo ========================================
pause
