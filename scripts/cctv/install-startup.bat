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

powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%STARTUP_DIR%\EBCI-CCTV-Gateway.lnk'); $s.TargetPath = '%VBS_PATH%'; $s.WorkingDirectory = '%SCRIPT_DIR%'; $s.Save()"

if exist "%STARTUP_DIR%\EBCI-CCTV-Gateway.lnk" (
    echo [SUCCESS] Auto-start shortcut created successfully!
    echo From now on, EBCI CCTV Gateway will automatically start on Windows boot/login.
) else (
    echo [ERROR] Could not create shortcut in startup folder.
)

echo.
pause
