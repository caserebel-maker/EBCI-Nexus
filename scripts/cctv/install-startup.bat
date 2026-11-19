@echo off
set SCRIPT_DIR=%~dp0
set VBS_PATH=%SCRIPT_DIR%Start-EBCI-CCTV.vbs
set STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup

echo ========================================================
echo   EBCI CCTV Gateway - Windows Auto-Start Installer
echo ========================================================
echo.
echo Installing startup shortcut to:
echo %STARTUP_DIR%\EBCI-CCTV-Gateway.lnk
echo.

if exist "%STARTUP_DIR%\Start-EBCI-CCTV.vbs" (
    del /f /q "%STARTUP_DIR%\Start-EBCI-CCTV.vbs"
)

powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%STARTUP_DIR%\EBCI-CCTV-Gateway.lnk'); $s.TargetPath = 'powershell.exe'; $s.Arguments = '-WindowStyle Hidden -NoProfile -NonInteractive -ExecutionPolicy Bypass -File \"' + '%SCRIPT_DIR%ensure-gateway.ps1\"'; $s.WorkingDirectory = '%SCRIPT_DIR%'; $s.WindowStyle = 7; $s.Save()"

schtasks /Create /TN "EBCI_CCTV_Gateway_Watchdog" /TR "powershell.exe -WindowStyle Hidden -NoProfile -NonInteractive -ExecutionPolicy Bypass -File \"%SCRIPT_DIR%ensure-gateway.ps1\"" /SC MINUTE /MO 10 /F >nul 2>&1

if exist "%STARTUP_DIR%\EBCI-CCTV-Gateway.lnk" (
    echo [SUCCESS] Auto-start shortcut created successfully!
    echo From now on, EBCI CCTV Gateway will automatically start on Windows boot/login.
) else (
    echo [ERROR] Could not create shortcut in startup folder.
)

echo.
pause
