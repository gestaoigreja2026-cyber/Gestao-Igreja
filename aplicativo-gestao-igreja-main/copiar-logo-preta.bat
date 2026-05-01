@echo off
chcp 65001 >nul
echo Copiando logo para public/logo-app.png ...

set "ORIGEM=%USERPROFILE%\.cursor\projects\c-Users-eduka-Downloads-App-Gest-o-Igreja\assets\c__Users_eduka_AppData_Roaming_Cursor_User_workspaceStorage_905592b869c22d904283c935760e81a5_images_image-172c5fb9-9f2b-4ca5-94f4-193a5103f171.png"
set "DESTINO=%~dp0public\logo-app.png"

if exist "%ORIGEM%" (
    copy /Y "%ORIGEM%" "%DESTINO%" && echo OK: Logo copiada com sucesso! || echo ERRO ao copiar
) else (
    echo Arquivo nao encontrado.
    echo Cole manualmente sua logo em: public\logo-app.png
)

pause
