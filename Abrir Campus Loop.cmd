@echo off
setlocal
title Campus Loop
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo [Campus Loop] Node.js no esta instalado.
  echo Descargalo desde https://nodejs.org/ y vuelve a abrir este archivo.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo.
  echo [Campus Loop] Preparando la aplicacion por primera vez...
  call npm install
  if errorlevel 1 (
    echo.
    echo No fue posible instalar las dependencias.
    pause
    exit /b 1
  )
)

echo.
echo [Campus Loop] Iniciando la aplicacion...
echo El navegador se abrira automaticamente.
echo Para detener Campus Loop, cierra esta ventana o presiona Ctrl+C.
echo.

start "" powershell -NoProfile -WindowStyle Hidden -Command "$url='http://localhost:5173/'; for($i=0; $i -lt 30; $i++){ try { $response=Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 1; if($response.StatusCode -eq 200){ Start-Process $url; exit } } catch {}; Start-Sleep -Seconds 1 }"
call npm run dev

echo.
echo Campus Loop se ha detenido.
pause
