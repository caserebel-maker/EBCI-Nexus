Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
go2rtcPath = currentDir & "\go2rtc.exe"
cfPath = currentDir & "\cloudflared.exe"
supPath = currentDir & "\gateway-supervisor.js"
ps1Path = currentDir & "\start-gateway.ps1"

nodeExe = "node.exe"
If fso.FileExists("C:\Program Files\nodejs\node.exe") Then
    nodeExe = """C:\Program Files\nodejs\node.exe"""
End If

If fso.FileExists(go2rtcPath) And fso.FileExists(cfPath) And fso.FileExists(supPath) Then
    WshShell.CurrentDirectory = currentDir
    WshShell.Run nodeExe & " """ & supPath & """", 0, False
Else
    WshShell.Run "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & ps1Path & """", 0, False
End If
