; Mojo Gaming Mode - NSIS Custom Install Script
; Runs during install and uninstall

!macro customInstall
  ; Create System Restore Point on install
  nsExec::ExecToLog 'powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "try { $ProgressPreference=\"SilentlyContinue\"; Checkpoint-Computer -Description \"Before Mojo Gaming Mode Install\" -RestorePointType MODIFY_SETTINGS } catch {}"'

  ; Copy shutdown script to install dir
  SetOutPath "$INSTDIR\resources\assets\scripts"
  File "assets\scripts\revert-on-shutdown.ps1"

  ; Register shutdown script in Windows Group Policy
  WriteRegStr HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Group Policy\Scripts\Shutdown\0\0" "Script" "$INSTDIR\resources\assets\scripts\revert-on-shutdown.ps1"
  WriteRegStr HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Group Policy\Scripts\Shutdown\0\0" "Parameters" ""
  WriteRegStr HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Group Policy\Scripts\Shutdown\0\0" "IsPowershell" "1"
  WriteRegDWORD HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Group Policy\Scripts\Shutdown\0" "GPOId" 0
  WriteRegStr HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Group Policy\Scripts\Shutdown\0" "SOM-Id" "Local"
  WriteRegStr HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Group Policy\Scripts\Shutdown\0" "FileSysPath" "$INSTDIR\resources\assets\scripts"
  WriteRegStr HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Group Policy\Scripts\Shutdown\0" "DisplayName" "Local Group Policy"
  WriteRegStr HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Group Policy\Scripts\Shutdown\0" "GPOName" "Local Group Policy"
!macroend

!macro customUninstall
  ; Revert any active tweaks before uninstall
  nsExec::ExecToLog 'powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$INSTDIR\resources\assets\scripts\revert-on-shutdown.ps1"'

  ; Remove shutdown script registry entries
  DeleteRegKey HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Group Policy\Scripts\Shutdown\0"

  ; Remove app data
  RMDir /r "$APPDATA\mojo-gaming-mode"
!macroend
