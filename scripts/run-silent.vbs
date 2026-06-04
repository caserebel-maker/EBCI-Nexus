Set WshShell = CreateObject("WScript.Shell")
' Get the directory of the current script
strPath = WshShell.CurrentDirectory
' Run the batch file in hidden mode (0)
WshShell.Run chr(34) & strPath & "\scripts\run-agent.bat" & chr(34), 0, false
Set WshShell = Nothing
