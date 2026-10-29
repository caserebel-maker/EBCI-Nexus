Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "C:\Windows\SysWOW64\WindowsPowerShell\v1.0\powershell.exe -NoProfile -ExecutionPolicy Bypass -File ""C:\EBCI-Nexus\scripts\sync-direct-fk.ps1""", 0, False
