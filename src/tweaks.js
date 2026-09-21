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
    requiresReboot: true,
    applyCmd: `bcdedit /set useplatformclock false; Exit 0`,
    revertCmd: `bcdedit /deletevalue useplatformclock; Exit 0`
  },

  msi: {
    name: 'MSI interrupt mode',
    requiresAdmin: true,
    requiresReboot: true,
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
    applyCmd: `$s="$env:APPDATA\\discord\\settings.json"; If(Test-Path $s){$j=Get-Content $s|ConvertFrom-Json; $j|Add-Member -NotePropertyName 'HARDWARE_ACCELERATION' -NotePropertyValue $false -Force; $j|ConvertTo-Json -Depth 10|Set-Content $s}; Exit 0`,
    revertCmd: `$s="$env:APPDATA\\discord\\settings.json"; If(Test-Path $s){$j=Get-Content $s|ConvertFrom-Json; $j|Add-Member -NotePropertyName 'HARDWARE_ACCELERATION' -NotePropertyValue $true -Force; $j|ConvertTo-Json -Depth 10|Set-Content $s}; Exit 0`
  },

  telemetry: {
    name: 'Telemetry off',
    requiresAdmin: true,
    // DiagTrack is the main collection/transport service. AllowTelemetry
    // is a separate policy controlling the "optional diagnostic data"
    // toggle in Settings (may be partially ignored on Home editions, per
    // Microsoft's own documented behavior - this does what's possible).
    // dmwappushsvc is commonly disabled alongside these in privacy guides.
    applyCmd: `Stop-Service -Name 'DiagTrack' -Force -ErrorAction SilentlyContinue; Set-Service -Name 'DiagTrack' -StartupType Disabled -ErrorAction SilentlyContinue; Stop-Service -Name 'dmwappushservice' -Force -ErrorAction SilentlyContinue; Set-Service -Name 'dmwappushservice' -StartupType Disabled -ErrorAction SilentlyContinue; $p='HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection'; If(!(Test-Path $p)){New-Item -Path $p -Force|Out-Null}; Set-ItemProperty -Path $p -Name 'AllowTelemetry' -Value 0 -Type DWord; Exit 0`,
    revertCmd: `sc.exe config DiagTrack start= auto; sc.exe start DiagTrack; sc.exe config dmwappushservice start= demand; sc.exe start dmwappushservice; $p='HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection'; If(Test-Path $p){Remove-ItemProperty -Path $p -Name 'AllowTelemetry' -ErrorAction SilentlyContinue}; Exit 0`
  },

  // ── NETWORK ──────────────────────────────────────────────────────────────────

  nagle: {
    name: "Disable Nagle's algorithm",
    requiresAdmin: true,
    requiresReboot: true,
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
  },

  xboxservices: {
    name: 'Xbox background services off',
    requiresAdmin: true,
    // Stop+disable only, never delete - deleting these has left people
    // unable to use Xbox/Game Pass/cross-play features at all afterward.
    // Only restart a service on revert if it was actually running before.
    // XblGameSave specifically is Trigger Start, not plain Manual - it can
    // accept a start request without throwing yet still not transition to
    // Running, so success is verified by checking actual status after,
    // not by whether Start-Service threw an exception.
    applyCmd: `$svcs = 'XblAuthManager','XblGameSave','XboxNetApiSvc','XboxGipSvc'; ForEach ($s in $svcs) { $svc = Get-Service -Name $s -ErrorAction SilentlyContinue; $marker = "$env:TEMP\\mgm_wasrunning_$s.flag"; If ($svc -and $svc.Status -eq 'Running') { New-Item -Path $marker -ItemType File -Force | Out-Null } Else { Remove-Item $marker -ErrorAction SilentlyContinue }; Stop-Service -Name $s -Force -ErrorAction SilentlyContinue; Set-Service -Name $s -StartupType Disabled -ErrorAction SilentlyContinue }; Exit 0`,
    revertCmd: `$svcs = 'XblAuthManager','XblGameSave','XboxNetApiSvc','XboxGipSvc'; $failed = @(); ForEach ($s in $svcs) { $marker = "$env:TEMP\\mgm_wasrunning_$s.flag"; sc.exe config $s start= demand | Out-Null; If (Test-Path $marker) { Remove-Item $marker -ErrorAction SilentlyContinue; Start-Service -Name $s -ErrorAction SilentlyContinue; Start-Sleep -Milliseconds 500; $chk = Get-Service -Name $s -ErrorAction SilentlyContinue; If (-not $chk -or $chk.Status -ne 'Running') { Start-Sleep -Milliseconds 800; Start-Service -Name $s -ErrorAction SilentlyContinue; Start-Sleep -Milliseconds 500; $chk2 = Get-Service -Name $s -ErrorAction SilentlyContinue; If (-not $chk2 -or $chk2.Status -ne 'Running') { $failed += $s } } } }; If ($failed.Count -gt 0) { Write-Output ("Failed to restart: " + ($failed -join ', ')); Exit 1 }; Exit 0`
  },

  wersvc: {
    name: 'Windows Error Reporting off',
    requiresAdmin: true,
    applyCmd: `Stop-Service -Name 'WerSvc' -Force -ErrorAction SilentlyContinue; Set-Service -Name 'WerSvc' -StartupType Disabled -ErrorAction SilentlyContinue; Exit 0`,
    revertCmd: `sc.exe config WerSvc start= demand; sc.exe start WerSvc; Exit 0`
  },

  diskoptimize: {
    name: 'Disk optimization schedule pause',
    requiresAdmin: true,
    applyCmd: `Disable-ScheduledTask -TaskName 'ScheduledDefrag' -TaskPath '\\Microsoft\\Windows\\Defrag\\' -ErrorAction SilentlyContinue; Exit 0`,
    revertCmd: `Enable-ScheduledTask -TaskName 'ScheduledDefrag' -TaskPath '\\Microsoft\\Windows\\Defrag\\' -ErrorAction SilentlyContinue; Exit 0`
  },

  hags: {
    name: 'Hardware-accelerated GPU Scheduling',
    requiresAdmin: true,
    requiresReboot: true,
    // Many systems (especially NVIDIA) already default to this enabled,
    // so capture the real prior value rather than assuming a default to
    // restore to. Not all hardware/driver combinations respond to this
    // registry change at all - a known, documented limitation, not
    // something this app can fix.
    applyCmd: `$p='HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers'; $marker="$env:TEMP\\mgm_haqs_prior.flag"; $cur = Get-ItemProperty -Path $p -Name HwSchMode -ErrorAction SilentlyContinue; If ($cur) { Set-Content -Path $marker -Value $cur.HwSchMode } Else { Set-Content -Path $marker -Value 'none' }; Set-ItemProperty -Path $p -Name 'HwSchMode' -Value 2 -Type DWord; Exit 0`,
    revertCmd: `$p='HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers'; $marker="$env:TEMP\\mgm_haqs_prior.flag"; If (Test-Path $marker) { $prior = Get-Content -Path $marker; Remove-Item $marker -ErrorAction SilentlyContinue; If ($prior -eq 'none') { Remove-ItemProperty -Path $p -Name 'HwSchMode' -ErrorAction SilentlyContinue } Else { Set-ItemProperty -Path $p -Name 'HwSchMode' -Value ([int]$prior) -Type DWord } }; Exit 0`
  },

  printspooler: {
    name: 'Print Spooler off',
    requiresAdmin: true,
    // Spooler is Automatic startup by default on most systems, so the
    // simple restore-to-auto pattern (matching sysmain/wersvc) is
    // appropriate here - not a Manual/Trigger Start service.
    applyCmd: `Stop-Service -Name 'Spooler' -Force -ErrorAction SilentlyContinue; Set-Service -Name 'Spooler' -StartupType Disabled -ErrorAction SilentlyContinue; Exit 0`,
    revertCmd: `sc.exe config Spooler start= auto; sc.exe start Spooler; Exit 0`
  },

  fax: {
    name: 'Fax service off',
    requiresAdmin: true,
    // Fax is Manual startup by default and almost never actually running,
    // so capture whether it was genuinely running before touching it,
    // same as the wasRunning pattern used elsewhere.
    applyCmd: `$marker = "$env:TEMP\\mgm_wasrunning_fax.flag"; $svc = Get-Service -Name 'Fax' -ErrorAction SilentlyContinue; If ($svc -and $svc.Status -eq 'Running') { New-Item -Path $marker -ItemType File -Force | Out-Null } Else { Remove-Item $marker -ErrorAction SilentlyContinue }; Stop-Service -Name 'Fax' -Force -ErrorAction SilentlyContinue; Set-Service -Name 'Fax' -StartupType Disabled -ErrorAction SilentlyContinue; Exit 0`,
    revertCmd: `$marker = "$env:TEMP\\mgm_wasrunning_fax.flag"; sc.exe config Fax start= demand | Out-Null; If (Test-Path $marker) { Remove-Item $marker -ErrorAction SilentlyContinue; Start-Service -Name 'Fax' -ErrorAction SilentlyContinue }; Exit 0`
  },

  retaildemo: {
    name: 'Retail Demo Service off',
    requiresAdmin: true,
    // Enabled by default on most consumer installs for no practical
    // reason (it's meant for in-store display units). Uses the wasRunning
    // pattern since sources disagree on its exact default startup type.
    applyCmd: `$marker = "$env:TEMP\\mgm_wasrunning_retaildemo.flag"; $svc = Get-Service -Name 'RetailDemo' -ErrorAction SilentlyContinue; If ($svc -and $svc.Status -eq 'Running') { New-Item -Path $marker -ItemType File -Force | Out-Null } Else { Remove-Item $marker -ErrorAction SilentlyContinue }; Stop-Service -Name 'RetailDemo' -Force -ErrorAction SilentlyContinue; Set-Service -Name 'RetailDemo' -StartupType Disabled -ErrorAction SilentlyContinue; Exit 0`,
    revertCmd: `$marker = "$env:TEMP\\mgm_wasrunning_retaildemo.flag"; sc.exe config RetailDemo start= demand | Out-Null; If (Test-Path $marker) { Remove-Item $marker -ErrorAction SilentlyContinue; Start-Service -Name 'RetailDemo' -ErrorAction SilentlyContinue }; Exit 0`
  },

  wisvc: {
    name: 'Windows Insider Service off',
    requiresAdmin: true,
    // Present on every Windows 10/11 install regardless of Insider
    // Program enrollment. Safe to disable unless actively using Insider
    // preview builds.
    applyCmd: `$marker = "$env:TEMP\\mgm_wasrunning_wisvc.flag"; $svc = Get-Service -Name 'wisvc' -ErrorAction SilentlyContinue; If ($svc -and $svc.Status -eq 'Running') { New-Item -Path $marker -ItemType File -Force | Out-Null } Else { Remove-Item $marker -ErrorAction SilentlyContinue }; Stop-Service -Name 'wisvc' -Force -ErrorAction SilentlyContinue; Set-Service -Name 'wisvc' -StartupType Disabled -ErrorAction SilentlyContinue; Exit 0`,
    revertCmd: `$marker = "$env:TEMP\\mgm_wasrunning_wisvc.flag"; sc.exe config wisvc start= demand | Out-Null; If (Test-Path $marker) { Remove-Item $marker -ErrorAction SilentlyContinue; Start-Service -Name 'wisvc' -ErrorAction SilentlyContinue }; Exit 0`
  },

  mapsbroker: {
    name: 'Downloaded Maps Manager off',
    requiresAdmin: true,
    // Keeps offline map data updated in the background. Lightweight even
    // when running, but unnecessary if offline maps aren't used.
    applyCmd: `$marker = "$env:TEMP\\mgm_wasrunning_mapsbroker.flag"; $svc = Get-Service -Name 'MapsBroker' -ErrorAction SilentlyContinue; If ($svc -and $svc.Status -eq 'Running') { New-Item -Path $marker -ItemType File -Force | Out-Null } Else { Remove-Item $marker -ErrorAction SilentlyContinue }; Stop-Service -Name 'MapsBroker' -Force -ErrorAction SilentlyContinue; Set-Service -Name 'MapsBroker' -StartupType Disabled -ErrorAction SilentlyContinue; Exit 0`,
    revertCmd: `$marker = "$env:TEMP\\mgm_wasrunning_mapsbroker.flag"; sc.exe config MapsBroker start= demand | Out-Null; If (Test-Path $marker) { Remove-Item $marker -ErrorAction SilentlyContinue; Start-Service -Name 'MapsBroker' -ErrorAction SilentlyContinue }; Exit 0`
  },

  bits: {
    name: 'Background Intelligent Transfer Service off',
    requiresAdmin: true,
    // Startup type varies by Windows edition/version, so capture whether it
    // was actually running rather than assuming a default to restore to.
    applyCmd: `$marker = "$env:TEMP\\mgm_wasrunning_bits.flag"; $svc = Get-Service -Name 'BITS' -ErrorAction SilentlyContinue; If ($svc -and $svc.Status -eq 'Running') { New-Item -Path $marker -ItemType File -Force | Out-Null } Else { Remove-Item $marker -ErrorAction SilentlyContinue }; Stop-Service -Name 'BITS' -Force -ErrorAction SilentlyContinue; Set-Service -Name 'BITS' -StartupType Disabled -ErrorAction SilentlyContinue; Exit 0`,
    revertCmd: `$marker = "$env:TEMP\\mgm_wasrunning_bits.flag"; sc.exe config BITS start= demand | Out-Null; If (Test-Path $marker) { Remove-Item $marker -ErrorAction SilentlyContinue; Start-Service -Name 'BITS' -ErrorAction SilentlyContinue }; Exit 0`
  },

  pca: {
    name: 'Program Compatibility Assistant off',
    requiresAdmin: true,
    applyCmd: `$marker = "$env:TEMP\\mgm_wasrunning_pca.flag"; $svc = Get-Service -Name 'PcaSvc' -ErrorAction SilentlyContinue; If ($svc -and $svc.Status -eq 'Running') { New-Item -Path $marker -ItemType File -Force | Out-Null } Else { Remove-Item $marker -ErrorAction SilentlyContinue }; Stop-Service -Name 'PcaSvc' -Force -ErrorAction SilentlyContinue; Set-Service -Name 'PcaSvc' -StartupType Disabled -ErrorAction SilentlyContinue; Exit 0`,
    revertCmd: `$marker = "$env:TEMP\\mgm_wasrunning_pca.flag"; sc.exe config PcaSvc start= demand | Out-Null; If (Test-Path $marker) { Remove-Item $marker -ErrorAction SilentlyContinue; Start-Service -Name 'PcaSvc' -ErrorAction SilentlyContinue }; Exit 0`
  },

  deliveryopt: {
    name: 'Delivery Optimization off',
    requiresAdmin: true,
    applyCmd: `$marker = "$env:TEMP\\mgm_wasrunning_deliveryopt.flag"; $svc = Get-Service -Name 'DoSvc' -ErrorAction SilentlyContinue; If ($svc -and $svc.Status -eq 'Running') { New-Item -Path $marker -ItemType File -Force | Out-Null } Else { Remove-Item $marker -ErrorAction SilentlyContinue }; Stop-Service -Name 'DoSvc' -Force -ErrorAction SilentlyContinue; Set-Service -Name 'DoSvc' -StartupType Disabled -ErrorAction SilentlyContinue; Exit 0`,
    revertCmd: `$marker = "$env:TEMP\\mgm_wasrunning_deliveryopt.flag"; sc.exe config DoSvc start= demand | Out-Null; If (Test-Path $marker) { Remove-Item $marker -ErrorAction SilentlyContinue; Start-Service -Name 'DoSvc' -ErrorAction SilentlyContinue }; Exit 0`
  },

  dps: {
    name: 'Diagnostic Policy Service off',
    requiresAdmin: true,
    // Runs Automatic by default and stays running continuously (verified
    // live: Status=Running, StartType=Automatic) - powers the built-in
    // troubleshooters (e.g. "Diagnose network problems"), which stop
    // working while this is off. No other functionality depends on it.
    applyCmd: `Stop-Service -Name 'DPS' -Force -ErrorAction SilentlyContinue; Set-Service -Name 'DPS' -StartupType Disabled -ErrorAction SilentlyContinue; Exit 0`,
    revertCmd: `sc.exe config DPS start= auto; sc.exe start DPS; Exit 0`
  },

  cdpsvc: {
    name: 'Connected Devices Platform off',
    requiresAdmin: true,
    // Runs Automatic by default and stays running continuously (verified
    // live: Status=Running, StartType=Automatic) - powers cross-device
    // features (Phone Link continuity, nearby sharing). Not needed during
    // a gaming session unless actively using those features.
    applyCmd: `Stop-Service -Name 'CDPSvc' -Force -ErrorAction SilentlyContinue; Set-Service -Name 'CDPSvc' -StartupType Disabled -ErrorAction SilentlyContinue; Exit 0`,
    revertCmd: `sc.exe config CDPSvc start= auto; sc.exe start CDPSvc; Exit 0`
  },

  usosvc: {
    name: 'Update Orchestrator Service off',
    requiresAdmin: true,
    // Runs Automatic by default and stays running continuously (verified
    // live: Status=Running, StartType=Automatic) - schedules and triggers
    // Windows Update activity, separate from wuauserv (already covered by
    // the winupdate tweak). Same rationale as winupdate: pausing update
    // orchestration during a gaming session is safe and fully revertible.
    applyCmd: `Stop-Service -Name 'UsoSvc' -Force -ErrorAction SilentlyContinue; Set-Service -Name 'UsoSvc' -StartupType Disabled -ErrorAction SilentlyContinue; Exit 0`,
    revertCmd: `sc.exe config UsoSvc start= auto; sc.exe start UsoSvc; Exit 0`
  },

  inventorysvc: {
    name: 'Inventory and Compatibility Appraisal off',
    requiresAdmin: true,
    // Runs Automatic by default and stays running continuously (verified
    // live: Status=Running, StartType=Automatic) - collects hardware/
    // software compatibility data for Microsoft, separate from the
    // DiagTrack/dmwappushservice pair already covered by the telemetry
    // tweak. Safe to disable; only affects data collection, not gameplay.
    applyCmd: `Stop-Service -Name 'InventorySvc' -Force -ErrorAction SilentlyContinue; Set-Service -Name 'InventorySvc' -StartupType Disabled -ErrorAction SilentlyContinue; Exit 0`,
    revertCmd: `sc.exe config InventorySvc start= auto; sc.exe start InventorySvc; Exit 0`
  },

  netthrottle: {
    name: 'Network throttling for background traffic off',
    requiresAdmin: true,
    requiresReboot: true,
    // Verified against official Microsoft docs (learn.microsoft.com,
    // Multimedia Class Scheduler Service) - MMCSS caps non-priority
    // network traffic to 10 packets/ms whenever a high-priority
    // multimedia/game task is active, to protect that task's own network
    // processing. Removing the cap (0xFFFFFFFF) only matters if something
    // else is doing heavy network activity (downloads, streaming, sync)
    // at the same time as gaming - no effect otherwise. Takes effect only
    // after a restart (consistently documented across sources). Capture
    // the real prior value rather than assuming the documented default
    // (10), same reasoning as the hags tweak above.
    applyCmd: `$p='HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile'; $marker="$env:TEMP\\mgm_netthrottle_prior.flag"; $cur = Get-ItemProperty -Path $p -Name NetworkThrottlingIndex -ErrorAction SilentlyContinue; If ($cur) { Set-Content -Path $marker -Value $cur.NetworkThrottlingIndex } Else { Set-Content -Path $marker -Value 'none' }; Set-ItemProperty -Path $p -Name 'NetworkThrottlingIndex' -Value 0xFFFFFFFF -Type DWord; Exit 0`,
    revertCmd: `$p='HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile'; $marker="$env:TEMP\\mgm_netthrottle_prior.flag"; If (Test-Path $marker) { $prior = Get-Content -Path $marker; Remove-Item $marker -ErrorAction SilentlyContinue; If ($prior -eq 'none') { Remove-ItemProperty -Path $p -Name 'NetworkThrottlingIndex' -ErrorAction SilentlyContinue } Else { Set-ItemProperty -Path $p -Name 'NetworkThrottlingIndex' -Value ([int64]$prior) -Type DWord } }; Exit 0`
  },

  compatappraiser: {
    name: 'Compatibility Appraiser off',
    requiresAdmin: true,
    // Scheduled task (not a service), runs at least daily - collects
    // installed-program telemetry and assesses Windows Update/upgrade
    // eligibility. Verified live: disables cleanly via Disable-ScheduledTask
    // and stays disabled (checked immediately and after a delay - some
    // online reports claim it re-enables itself, not reproduced here).
    applyCmd: `Disable-ScheduledTask -TaskName 'Microsoft Compatibility Appraiser Exp' -TaskPath '\\Microsoft\\Windows\\Application Experience\\' -ErrorAction SilentlyContinue; Exit 0`,
    revertCmd: `Enable-ScheduledTask -TaskName 'Microsoft Compatibility Appraiser Exp' -TaskPath '\\Microsoft\\Windows\\Application Experience\\' -ErrorAction SilentlyContinue; Exit 0`
  },

  ceiptasks: {
    name: 'Customer Experience Improvement Program off',
    requiresAdmin: true,
    // Two scheduled tasks (Consolidator + UsbCeip), same grouping approach
    // as the existing telemetry tweak (DiagTrack + dmwappushservice).
    // Both are opt-in data collection - a no-op if the user never consented
    // to CEIP, but stop the periodic collection attempt either way.
    // Verified live: both disable cleanly and stay disabled.
    applyCmd: `Disable-ScheduledTask -TaskName 'Consolidator' -TaskPath '\\Microsoft\\Windows\\Customer Experience Improvement Program\\' -ErrorAction SilentlyContinue; Disable-ScheduledTask -TaskName 'UsbCeip' -TaskPath '\\Microsoft\\Windows\\Customer Experience Improvement Program\\' -ErrorAction SilentlyContinue; Exit 0`,
    revertCmd: `Enable-ScheduledTask -TaskName 'Consolidator' -TaskPath '\\Microsoft\\Windows\\Customer Experience Improvement Program\\' -ErrorAction SilentlyContinue; Enable-ScheduledTask -TaskName 'UsbCeip' -TaskPath '\\Microsoft\\Windows\\Customer Experience Improvement Program\\' -ErrorAction SilentlyContinue; Exit 0`
  },

  // ── ADDED (v2.14.0) ─────────────────────────────────────────────────────────

  widgets: {
    name: 'Widgets off',
    requiresAdmin: false,
    // Live-tested finding (v2.14.0 field report): the HKLM policy key
    // (Policies\Microsoft\Dsh\AllowNewsAndInterests) throws "unauthorized
    // operation" even from an elevated process on real hardware, and
    // "WidgetService" does not exist as an actual Windows service to
    // stop/disable - both original assumptions were wrong. TaskbarDa is the
    // same per-user registry value Settings > Personalization > Taskbar's
    // own "Widgets" toggle writes, needs no elevation, and is paired with
    // closing Widgets.exe if it's already open (same as the cr_widgets
    // Quick Rule elsewhere in this file).
    applyCmd: `$p='HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced'; If(!(Test-Path $p)){New-Item -Path $p -Force|Out-Null}; Set-ItemProperty -Path $p -Name 'TaskbarDa' -Value 0 -Type DWord; Get-Process -Name 'Widgets' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revertCmd: `$p='HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced'; If(Test-Path $p){Remove-ItemProperty -Path $p -Name 'TaskbarDa' -ErrorAction SilentlyContinue}; Exit 0`
  },

  activityhistory: {
    name: 'Activity History off',
    requiresAdmin: true,
    // Stops the background disk writes behind Timeline/the Activity feed
    // (both local recording and any cloud upload of it).
    applyCmd: `$p='HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\System'; If(!(Test-Path $p)){New-Item -Path $p -Force|Out-Null}; Set-ItemProperty -Path $p -Name 'EnableActivityFeed' -Value 0 -Type DWord; Set-ItemProperty -Path $p -Name 'PublishUserActivities' -Value 0 -Type DWord; Set-ItemProperty -Path $p -Name 'UploadUserActivities' -Value 0 -Type DWord; Exit 0`,
    revertCmd: `$p='HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\System'; If(Test-Path $p){Remove-ItemProperty -Path $p -Name 'EnableActivityFeed' -ErrorAction SilentlyContinue; Remove-ItemProperty -Path $p -Name 'PublishUserActivities' -ErrorAction SilentlyContinue; Remove-ItemProperty -Path $p -Name 'UploadUserActivities' -ErrorAction SilentlyContinue}; Exit 0`
  },

  consumerfeatures: {
    name: 'Consumer Features off',
    requiresAdmin: true,
    // Stops Windows from silently installing suggested/promoted Store apps.
    applyCmd: `$p='HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent'; If(!(Test-Path $p)){New-Item -Path $p -Force|Out-Null}; Set-ItemProperty -Path $p -Name 'DisableWindowsConsumerFeatures' -Value 1 -Type DWord; Exit 0`,
    revertCmd: `$p='HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent'; If(Test-Path $p){Remove-ItemProperty -Path $p -Name 'DisableWindowsConsumerFeatures' -ErrorAction SilentlyContinue}; Exit 0`
  },

  locationtracking: {
    name: 'Location Tracking off',
    requiresAdmin: true,
    // Policy blocks the location feature system-wide in addition to
    // stopping the Geolocation Service itself (wasRunning pattern, as
    // lfsvc is Manual/trigger-start by default, not Automatic).
    applyCmd: `$p='HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\LocationAndSensors'; If(!(Test-Path $p)){New-Item -Path $p -Force|Out-Null}; Set-ItemProperty -Path $p -Name 'DisableLocation' -Value 1 -Type DWord; $marker = "$env:TEMP\\mgm_wasrunning_lfsvc.flag"; $svc = Get-Service -Name 'lfsvc' -ErrorAction SilentlyContinue; If ($svc -and $svc.Status -eq 'Running') { New-Item -Path $marker -ItemType File -Force | Out-Null } Else { Remove-Item $marker -ErrorAction SilentlyContinue }; Stop-Service -Name 'lfsvc' -Force -ErrorAction SilentlyContinue; Set-Service -Name 'lfsvc' -StartupType Disabled -ErrorAction SilentlyContinue; Exit 0`,
    revertCmd: `$p='HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\LocationAndSensors'; If(Test-Path $p){Remove-ItemProperty -Path $p -Name 'DisableLocation' -ErrorAction SilentlyContinue}; $marker = "$env:TEMP\\mgm_wasrunning_lfsvc.flag"; sc.exe config lfsvc start= demand | Out-Null; If (Test-Path $marker) { Remove-Item $marker -ErrorAction SilentlyContinue; Start-Service -Name 'lfsvc' -ErrorAction SilentlyContinue }; Exit 0`
  },

  bgapps: {
    name: 'Background Apps off',
    requiresAdmin: false,
    // "Let apps run in the background" master switch for UWP apps.
    applyCmd: `$p='HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\BackgroundAccessApplications'; If(!(Test-Path $p)){New-Item -Path $p -Force|Out-Null}; Set-ItemProperty -Path $p -Name 'GlobalUserDisabled' -Value 1 -Type DWord; Exit 0`,
    revertCmd: `$p='HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\BackgroundAccessApplications'; If(Test-Path $p){Remove-ItemProperty -Path $p -Name 'GlobalUserDisabled' -ErrorAction SilentlyContinue}; Exit 0`
  },

  mpo: {
    name: 'Multiplane Overlay off',
    requiresAdmin: true,
    requiresReboot: true,
    // OverlayTestMode=5 is Microsoft's own documented workaround for MPO-
    // related flickering/stutter (referenced in Microsoft support articles
    // for exactly that symptom). Absence of the value means MPO enabled
    // (the default), so revert just removes it rather than writing back a
    // captured value.
    applyCmd: `$p='HKLM:\\SOFTWARE\\Microsoft\\Windows\\Dwm'; If(!(Test-Path $p)){New-Item -Path $p -Force|Out-Null}; Set-ItemProperty -Path $p -Name 'OverlayTestMode' -Value 5 -Type DWord; Exit 0`,
    revertCmd: `$p='HKLM:\\SOFTWARE\\Microsoft\\Windows\\Dwm'; If(Test-Path $p){Remove-ItemProperty -Path $p -Name 'OverlayTestMode' -ErrorAction SilentlyContinue}; Exit 0`
  },

  visualfx: {
    name: 'Visual Effects - Best Performance',
    requiresAdmin: false,
    restartInfo: 'Restart PC',
    // Captures every prior value (registry path|name|type|value, one per
    // line) into a marker file before writing the "best performance"
    // values, same wasRunning/prior-value philosophy as hags/netthrottle -
    // scaled up to several keys instead of one, since Explorer's real
    // defaults vary enough between installs that assuming them on revert
    // isn't safe.
    applyCmd: `$items = @(
  @{P='HKCU:\\Control Panel\\Desktop'; N='DragFullWindows'; T='String'; V='0'},
  @{P='HKCU:\\Control Panel\\Desktop'; N='MenuShowDelay'; T='String'; V='0'},
  @{P='HKCU:\\Control Panel\\Desktop\\WindowMetrics'; N='MinAnimate'; T='String'; V='0'},
  @{P='HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced'; N='TaskbarAnimations'; T='DWord'; V=0},
  @{P='HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced'; N='ListviewAlphaSelect'; T='DWord'; V=0},
  @{P='HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced'; N='ListviewShadow'; T='DWord'; V=0},
  @{P='HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects'; N='VisualFXSetting'; T='DWord'; V=2},
  @{P='HKCU:\\Software\\Microsoft\\Windows\\DWM'; N='EnableAeroPeek'; T='DWord'; V=0},
  @{P='HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize'; N='EnableTransparency'; T='DWord'; V=0}
); $marker = "$env:TEMP\\mgm_visualfx_prior.flag"; $lines = @(); ForEach ($i in $items) { If (!(Test-Path $i.P)) { New-Item -Path $i.P -Force | Out-Null }; $cur = Get-ItemProperty -Path $i.P -Name $i.N -ErrorAction SilentlyContinue; If ($cur) { $lines += ($i.P + '|' + $i.N + '|' + $i.T + '|' + $cur.($i.N)) } Else { $lines += ($i.P + '|' + $i.N + '|' + $i.T + '|NONE') }; Set-ItemProperty -Path $i.P -Name $i.N -Value $i.V -Type $i.T }; Set-Content -Path $marker -Value $lines; Exit 0`,
    revertCmd: `$marker = "$env:TEMP\\mgm_visualfx_prior.flag"; If (Test-Path $marker) { $lines = Get-Content -Path $marker; ForEach ($line in $lines) { $parts = $line -split '\\|', 4; $path = $parts[0]; $name = $parts[1]; $type = $parts[2]; $val = $parts[3]; If ($val -eq 'NONE') { If (Test-Path $path) { Remove-ItemProperty -Path $path -Name $name -ErrorAction SilentlyContinue } } Else { If (!(Test-Path $path)) { New-Item -Path $path -Force | Out-Null }; Set-ItemProperty -Path $path -Name $name -Value $val -Type $type -ErrorAction SilentlyContinue } }; Remove-Item $marker -ErrorAction SilentlyContinue }; Exit 0`
  },

  copilot: {
    name: 'Windows Copilot/AI off',
    requiresAdmin: true,
    // Policy-locks Copilot off system-wide and closes it if already open.
    // Left out of every preset by default (opt-in only, via Custom) since
    // it's a more invasive/first-party-feature-locking change than the
    // other Windows System tweaks.
    applyCmd: `$p='HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsCopilot'; If(!(Test-Path $p)){New-Item -Path $p -Force|Out-Null}; Set-ItemProperty -Path $p -Name 'TurnOffWindowsCopilot' -Value 1 -Type DWord; Get-Process -Name 'Copilot' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revertCmd: `$p='HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsCopilot'; If(Test-Path $p){Remove-ItemProperty -Path $p -Name 'TurnOffWindowsCopilot' -ErrorAction SilentlyContinue}; Exit 0`
  },

  // DNS switcher - implemented as 3 mutually-exclusive tweaks (radio
  // behavior enforced in renderer/js/app.js's toggleTweak) rather than a
  // new "parameterized tweak" concept, so it plugs into the existing
  // apply/revert-per-id engine unchanged. Each captures every touched
  // adapter's prior DNS servers (or NONE for DHCP) before switching, same
  // capture/restore idiom as visualfx, scaled to "per adapter" instead of
  // "per registry value". A single Set-DnsClientServerAddress call with a
  // mixed IPv4+IPv6 address list assigns each address to the right stack
  // automatically, so IPv4 and IPv6 are set/restored together in one shot.
  dnscloudflare: {
    name: 'DNS: Cloudflare',
    requiresAdmin: true,
    applyCmd: `$adapters = Get-NetAdapter | Where-Object {$_.Status -eq 'Up'}; $marker = "$env:TEMP\\mgm_dns_prior_cloudflare.flag"; $lines = @(); ForEach ($a in $adapters) { $cur = Get-DnsClientServerAddress -InterfaceAlias $a.Name -ErrorAction SilentlyContinue | Select-Object -ExpandProperty ServerAddresses; $joined = If ($cur) { $cur -join ',' } Else { 'NONE' }; $lines += ($a.Name + '|' + $joined); Set-DnsClientServerAddress -InterfaceAlias $a.Name -ServerAddresses ('1.1.1.1','1.0.0.1','2606:4700:4700::1111','2606:4700:4700::1001') -ErrorAction SilentlyContinue }; Set-Content -Path $marker -Value $lines; Exit 0`,
    revertCmd: `$marker = "$env:TEMP\\mgm_dns_prior_cloudflare.flag"; If (Test-Path $marker) { $lines = Get-Content -Path $marker; ForEach ($line in $lines) { $parts = $line -split '\\|', 2; $name = $parts[0]; $vals = $parts[1]; If ($vals -eq 'NONE') { Set-DnsClientServerAddress -InterfaceAlias $name -ResetServerAddresses -ErrorAction SilentlyContinue } Else { $arr = $vals -split ','; Set-DnsClientServerAddress -InterfaceAlias $name -ServerAddresses $arr -ErrorAction SilentlyContinue } }; Remove-Item $marker -ErrorAction SilentlyContinue }; Exit 0`
  },

  dnsquad9: {
    name: 'DNS: Quad9',
    requiresAdmin: true,
    applyCmd: `$adapters = Get-NetAdapter | Where-Object {$_.Status -eq 'Up'}; $marker = "$env:TEMP\\mgm_dns_prior_quad9.flag"; $lines = @(); ForEach ($a in $adapters) { $cur = Get-DnsClientServerAddress -InterfaceAlias $a.Name -ErrorAction SilentlyContinue | Select-Object -ExpandProperty ServerAddresses; $joined = If ($cur) { $cur -join ',' } Else { 'NONE' }; $lines += ($a.Name + '|' + $joined); Set-DnsClientServerAddress -InterfaceAlias $a.Name -ServerAddresses ('9.9.9.9','149.112.112.112','2620:fe::fe','2620:fe::9') -ErrorAction SilentlyContinue }; Set-Content -Path $marker -Value $lines; Exit 0`,
    revertCmd: `$marker = "$env:TEMP\\mgm_dns_prior_quad9.flag"; If (Test-Path $marker) { $lines = Get-Content -Path $marker; ForEach ($line in $lines) { $parts = $line -split '\\|', 2; $name = $parts[0]; $vals = $parts[1]; If ($vals -eq 'NONE') { Set-DnsClientServerAddress -InterfaceAlias $name -ResetServerAddresses -ErrorAction SilentlyContinue } Else { $arr = $vals -split ','; Set-DnsClientServerAddress -InterfaceAlias $name -ServerAddresses $arr -ErrorAction SilentlyContinue } }; Remove-Item $marker -ErrorAction SilentlyContinue }; Exit 0`
  },

  dnsopendns: {
    name: 'DNS: OpenDNS',
    requiresAdmin: true,
    applyCmd: `$adapters = Get-NetAdapter | Where-Object {$_.Status -eq 'Up'}; $marker = "$env:TEMP\\mgm_dns_prior_opendns.flag"; $lines = @(); ForEach ($a in $adapters) { $cur = Get-DnsClientServerAddress -InterfaceAlias $a.Name -ErrorAction SilentlyContinue | Select-Object -ExpandProperty ServerAddresses; $joined = If ($cur) { $cur -join ',' } Else { 'NONE' }; $lines += ($a.Name + '|' + $joined); Set-DnsClientServerAddress -InterfaceAlias $a.Name -ServerAddresses ('208.67.222.222','208.67.220.220','2620:119:35::35','2620:119:53::53') -ErrorAction SilentlyContinue }; Set-Content -Path $marker -Value $lines; Exit 0`,
    revertCmd: `$marker = "$env:TEMP\\mgm_dns_prior_opendns.flag"; If (Test-Path $marker) { $lines = Get-Content -Path $marker; ForEach ($line in $lines) { $parts = $line -split '\\|', 2; $name = $parts[0]; $vals = $parts[1]; If ($vals -eq 'NONE') { Set-DnsClientServerAddress -InterfaceAlias $name -ResetServerAddresses -ErrorAction SilentlyContinue } Else { $arr = $vals -split ','; Set-DnsClientServerAddress -InterfaceAlias $name -ServerAddresses $arr -ErrorAction SilentlyContinue } }; Remove-Item $marker -ErrorAction SilentlyContinue }; Exit 0`
  }

};

module.exports = { TWEAK_DEFINITIONS };
