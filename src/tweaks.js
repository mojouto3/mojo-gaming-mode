'use strict';

// Complete tweak library with apply and revert PowerShell commands.
// Every tweak MUST have both applyCmd and revertCmd.
// All commands use Exit 0 and ErrorAction SilentlyContinue for safe silent execution.

const TWEAK_DEFINITIONS = {

  // ── WINDOWS SYSTEM ──────────────────────────────────────────────────────────

  gm: {
    name: 'Windows Game Mode',
    requiresAdmin: false,
    applyCmd: `$p='HKCU:\\Software\\Microsoft\\GameBar'; If(!(Test-Path $p)){New-Item -Path $p -Force|Out-Null}; Set-ItemProperty -Path $p -Name 'AutoGameModeEnabled' -Value 1 -Type DWord; Set-ItemProperty -Path $p -Name 'AllowAutoGameMode' -Value 1 -Type DWord; Exit 0`,
    revertCmd: `$p='HKCU:\\Software\\Microsoft\\GameBar'; If(Test-Path $p){Remove-ItemProperty -Path $p -Name 'AutoGameModeEnabled' -ErrorAction SilentlyContinue; Remove-ItemProperty -Path $p -Name 'AllowAutoGameMode' -ErrorAction SilentlyContinue}; Exit 0`
  },

  sysmain: {
    name: 'SysMain (Superfetch) off',
    requiresAdmin: true,
    applyCmd: `Stop-Service -Name 'SysMain' -Force -ErrorAction SilentlyContinue; Set-Service -Name 'SysMain' -StartupType Disabled -ErrorAction SilentlyContinue; Exit 0`,
    revertCmd: `sc.exe config SysMain start= auto; sc.exe start SysMain; Exit 0`
  },

  hp: {
    name: 'High performance power plan',
    requiresAdmin: true,
    applyCmd: `powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c; Exit 0`,
    revertCmd: `powercfg /setactive 381b4222-f694-41f0-9685-ff5bb260df2e; Exit 0`
  },

  wsearch: {
    name: 'Windows Search off',
    requiresAdmin: true,
    applyCmd: `Stop-Service -Name 'WSearch' -Force -ErrorAction SilentlyContinue; Set-Service -Name 'WSearch' -StartupType Disabled -ErrorAction SilentlyContinue; Exit 0`,
    revertCmd: `sc.exe config WSearch start= auto; sc.exe start WSearch; Exit 0`
  },

  fso: {
    name: 'Fullscreen optimizations off',
    requiresAdmin: false,
    applyCmd: `$p='HKCU:\\System\\GameConfigStore'; If(!(Test-Path $p)){New-Item -Path $p -Force|Out-Null}; Set-ItemProperty -Path $p -Name 'GameDVR_FSEBehaviorMode' -Value 2 -Type DWord; Set-ItemProperty -Path $p -Name 'GameDVR_FSEBehavior' -Value 2 -Type DWord; Exit 0`,
    revertCmd: `$p='HKCU:\\System\\GameConfigStore'; If(Test-Path $p){Remove-ItemProperty -Path $p -Name 'GameDVR_FSEBehaviorMode' -ErrorAction SilentlyContinue; Remove-ItemProperty -Path $p -Name 'GameDVR_FSEBehavior' -ErrorAction SilentlyContinue}; Exit 0`
  },

  hpet: {
    name: 'Disable HPET timer',
    requiresAdmin: true,
    applyCmd: `bcdedit /set useplatformclock false; Exit 0`,
    revertCmd: `bcdedit /deletevalue useplatformclock; Exit 0`
  },

  msi: {
    name: 'MSI interrupt mode',
    requiresAdmin: true,
    applyCmd: `$gpu=Get-WmiObject Win32_VideoController|Where-Object{$_.Name -notlike '*Virtual*' -and $_.Name -notlike '*Meta*'}|Select-Object -First 1; If($gpu){$p="HKLM:\\SYSTEM\\CurrentControlSet\\Enum\\$($gpu.PNPDeviceID)\\Device Parameters\\Interrupt Management\\MessageSignaledInterruptProperties"; If(!(Test-Path $p)){New-Item -Path $p -Force|Out-Null}; Set-ItemProperty -Path $p -Name 'MSISupported' -Value 1 -Type DWord}; Exit 0`,
    revertCmd: `$gpu=Get-WmiObject Win32_VideoController|Where-Object{$_.Name -notlike '*Virtual*' -and $_.Name -notlike '*Meta*'}|Select-Object -First 1; If($gpu){$p="HKLM:\\SYSTEM\\CurrentControlSet\\Enum\\$($gpu.PNPDeviceID)\\Device Parameters\\Interrupt Management\\MessageSignaledInterruptProperties"; If(Test-Path $p){Set-ItemProperty -Path $p -Name 'MSISupported' -Value 0 -Type DWord -ErrorAction SilentlyContinue}}; Exit 0`
  },

  // ── OVERLAYS AND APPS ────────────────────────────────────────────────────────

  xbox: {
    name: 'Xbox Game Bar off',
    requiresAdmin: false,
    applyCmd: `$p1='HKCU:\\System\\GameConfigStore'; If(!(Test-Path $p1)){New-Item -Path $p1 -Force|Out-Null}; Set-ItemProperty -Path $p1 -Name 'GameDVR_Enabled' -Value 0 -Type DWord; $p2='HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\GameDVR'; If(!(Test-Path $p2)){New-Item -Path $p2 -Force|Out-Null}; Set-ItemProperty -Path $p2 -Name 'AllowGameDVR' -Value 0 -Type DWord; Exit 0`,
    revertCmd: `$p1='HKCU:\\System\\GameConfigStore'; Set-ItemProperty -Path $p1 -Name 'GameDVR_Enabled' -Value 1 -Type DWord -ErrorAction SilentlyContinue; $p2='HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\GameDVR'; If(Test-Path $p2){Remove-ItemProperty -Path $p2 -Name 'AllowGameDVR' -ErrorAction SilentlyContinue}; Exit 0`
  },

  steam: {
    name: 'Steam overlay off',
    requiresAdmin: false,
    applyCmd: `$p='HKCU:\\Software\\Valve\\Steam'; If(Test-Path $p){Set-ItemProperty -Path $p -Name 'EnableGameOverlay' -Value 0 -Type DWord}; Exit 0`,
    revertCmd: `$p='HKCU:\\Software\\Valve\\Steam'; If(Test-Path $p){Set-ItemProperty -Path $p -Name 'EnableGameOverlay' -Value 1 -Type DWord}; Exit 0`
  },

  nvoverlay: {
    name: 'GPU vendor overlay off',
    requiresAdmin: false,
    applyCmd: `$procs=@('nvcontainer','RadeonSoftware','RSSDK'); ForEach($p in $procs){$proc=Get-Process -Name $p -ErrorAction SilentlyContinue; If($proc){$proc|Stop-Process -Force}}; Exit 0`,
    revertCmd: `Write-Output 'Vendor overlay restarts automatically.'; Exit 0`
  },

  onedrive: {
    name: 'OneDrive sync pause',
    requiresAdmin: false,
    applyCmd: `$p=Get-Process -Name 'OneDrive' -ErrorAction SilentlyContinue; If($p){$p|Stop-Process -Force}; Exit 0`,
    revertCmd: `Write-Output "OneDrive will restart on next user login."; Exit 0`
  },

  discord: {
    name: 'Discord GPU acceleration off',
    requiresAdmin: false,
    applyCmd: `$s="$env:APPDATA\\discord\\settings.json"; If(Test-Path $s){$j=Get-Content $s|ConvertFrom-Json; $j|Add-Member -NotePropertyName 'HARDWARE_ACCELERATION' -NotePropertyValue $false -Force; $j|ConvertTo-Json|Set-Content $s}; Exit 0`,
    revertCmd: `$s="$env:APPDATA\\discord\\settings.json"; If(Test-Path $s){$j=Get-Content $s|ConvertFrom-Json; $j|Add-Member -NotePropertyName 'HARDWARE_ACCELERATION' -NotePropertyValue $true -Force; $j|ConvertTo-Json|Set-Content $s}; Exit 0`
  },

  telemetry: {
    name: 'Telemetry off',
    requiresAdmin: true,
    applyCmd: `Stop-Service -Name 'DiagTrack' -Force -ErrorAction SilentlyContinue; Set-Service -Name 'DiagTrack' -StartupType Disabled -ErrorAction SilentlyContinue; Exit 0`,
    revertCmd: `sc.exe config DiagTrack start= auto; sc.exe start DiagTrack; Exit 0`
  },

  // ── NETWORK ──────────────────────────────────────────────────────────────────

  qos: {
    name: 'QoS packet scheduling off',
    requiresAdmin: true,
    applyCmd: `$p='HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Psched'; If(!(Test-Path $p)){New-Item -Path $p -Force|Out-Null}; Set-ItemProperty -Path $p -Name 'NonBestEffortLimit' -Value 0 -Type DWord; Exit 0`,
    revertCmd: `$p='HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Psched'; If(Test-Path $p){Remove-ItemProperty -Path $p -Name 'NonBestEffortLimit' -ErrorAction SilentlyContinue}; Exit 0`
  },

  nagle: {
    name: "Disable Nagle's algorithm",
    requiresAdmin: true,
    applyCmd: `$ifaces=Get-ChildItem 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces'; ForEach($i in $ifaces){Set-ItemProperty -Path $i.PSPath -Name 'TcpAckFrequency' -Value 1 -Type DWord -ErrorAction SilentlyContinue; Set-ItemProperty -Path $i.PSPath -Name 'TCPNoDelay' -Value 1 -Type DWord -ErrorAction SilentlyContinue}; Exit 0`,
    revertCmd: `$ifaces=Get-ChildItem 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces'; ForEach($i in $ifaces){Remove-ItemProperty -Path $i.PSPath -Name 'TcpAckFrequency' -ErrorAction SilentlyContinue; Remove-ItemProperty -Path $i.PSPath -Name 'TCPNoDelay' -ErrorAction SilentlyContinue}; Exit 0`
  },

  // ── ADDED (issue #56) ───────────────────────────────────────────────────────

  focusassist: {
    name: 'Focus Assist (notifications) off',
    requiresAdmin: false,
    applyCmd: `$p='HKCU:\\Software\\Policies\\Microsoft\\Windows\\Explorer'; If(!(Test-Path $p)){New-Item -Path $p -Force|Out-Null}; Set-ItemProperty -Path $p -Name 'DisableNotificationCenter' -Value 1 -Type DWord; Exit 0`,
    revertCmd: `$p='HKCU:\\Software\\Policies\\Microsoft\\Windows\\Explorer'; If(Test-Path $p){Remove-ItemProperty -Path $p -Name 'DisableNotificationCenter' -ErrorAction SilentlyContinue}; Exit 0`
  },

  pointerprecision: {
    name: 'Enhanced Pointer Precision off',
    requiresAdmin: false,
    applyCmd: `$p='HKCU:\\Control Panel\\Mouse'; Set-ItemProperty -Path $p -Name 'MouseSpeed' -Value '0' -Type String; Set-ItemProperty -Path $p -Name 'MouseThreshold1' -Value '0' -Type String; Set-ItemProperty -Path $p -Name 'MouseThreshold2' -Value '0' -Type String; Exit 0`,
    revertCmd: `$p='HKCU:\\Control Panel\\Mouse'; Set-ItemProperty -Path $p -Name 'MouseSpeed' -Value '1' -Type String; Set-ItemProperty -Path $p -Name 'MouseThreshold1' -Value '6' -Type String; Set-ItemProperty -Path $p -Name 'MouseThreshold2' -Value '10' -Type String; Exit 0`
  },

  winupdate: {
    name: 'Windows Update pause',
    requiresAdmin: true,
    applyCmd: `Stop-Service -Name 'wuauserv' -Force -ErrorAction SilentlyContinue; Set-Service -Name 'wuauserv' -StartupType Disabled -ErrorAction SilentlyContinue; Exit 0`,
    revertCmd: `sc.exe config wuauserv start= demand; sc.exe start wuauserv; Exit 0`
  },

  nicpower: {
    name: 'Network adapter power-saving off',
    requiresAdmin: true,
    applyCmd: `Get-NetAdapter | Where-Object {$_.Status -eq 'Up'} | ForEach-Object { Set-NetAdapterPowerManagement -Name $_.Name -AllowComputerToTurnOffDevice Disabled -ErrorAction SilentlyContinue }; Exit 0`,
    revertCmd: `Get-NetAdapter | Where-Object {$_.Status -eq 'Up'} | ForEach-Object { Set-NetAdapterPowerManagement -Name $_.Name -AllowComputerToTurnOffDevice Enabled -ErrorAction SilentlyContinue }; Exit 0`
  },

  usbsuspend: {
    name: 'USB selective suspend off',
    requiresAdmin: true,
    applyCmd: `powercfg /setacvalueindex SCHEME_CURRENT 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 0; powercfg /setdcvalueindex SCHEME_CURRENT 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 0; powercfg /setactive SCHEME_CURRENT; Exit 0`,
    revertCmd: `powercfg /setacvalueindex SCHEME_CURRENT 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 1; powercfg /setdcvalueindex SCHEME_CURRENT 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 1; powercfg /setactive SCHEME_CURRENT; Exit 0`
  }

};

module.exports = { TWEAK_DEFINITIONS };
