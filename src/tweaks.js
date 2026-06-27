'use strict';

// Complete tweak library with apply and revert PowerShell commands.
// Every tweak MUST have both applyCmd and revertCmd.
// requiresAdmin: true = needs elevated PowerShell

const TWEAK_DEFINITIONS = {

  // ── WINDOWS SYSTEM ──────────────────────────────────────────────────────────

  gm: {
    name: 'Windows Game Mode',
    requiresAdmin: false,
    applyCmd: `
      $path = 'HKCU:\\Software\\Microsoft\\GameBar'
      If (!(Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
      Set-ItemProperty -Path $path -Name 'AutoGameModeEnabled' -Value 1 -Type DWord
      Set-ItemProperty -Path $path -Name 'AllowAutoGameMode' -Value 1 -Type DWord
    `,
    revertCmd: `
      $path = 'HKCU:\\Software\\Microsoft\\GameBar'
      If (Test-Path $path) {
        Remove-ItemProperty -Path $path -Name 'AutoGameModeEnabled' -ErrorAction SilentlyContinue
        Remove-ItemProperty -Path $path -Name 'AllowAutoGameMode' -ErrorAction SilentlyContinue
      }
    `
  },

  sysmain: {
    name: 'SysMain (Superfetch) off',
    requiresAdmin: true,
    applyCmd: `Stop-Service -Name 'SysMain' -Force -ErrorAction SilentlyContinue; Set-Service -Name 'SysMain' -StartupType Disabled`,
    revertCmd: `Set-Service -Name 'SysMain' -StartupType Automatic; Start-Service -Name 'SysMain' -ErrorAction SilentlyContinue`
  },

  hp: {
    name: 'High performance power plan',
    requiresAdmin: true,
    applyCmd: `powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c`,
    revertCmd: `powercfg /setactive 381b4222-f694-41f0-9685-ff5bb260df2e`
  },

  wsearch: {
    name: 'Windows Search off',
    requiresAdmin: true,
    applyCmd: `Stop-Service -Name 'WSearch' -Force -ErrorAction SilentlyContinue; Set-Service -Name 'WSearch' -StartupType Disabled`,
    revertCmd: `Set-Service -Name 'WSearch' -StartupType Automatic; Start-Service -Name 'WSearch' -ErrorAction SilentlyContinue`
  },

  fso: {
    name: 'Fullscreen optimizations off',
    requiresAdmin: false,
    applyCmd: `
      $path = 'HKCU:\\System\\GameConfigStore'
      If (!(Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
      Set-ItemProperty -Path $path -Name 'GameDVR_FSEBehaviorMode' -Value 2 -Type DWord
      Set-ItemProperty -Path $path -Name 'GameDVR_FSEBehavior' -Value 2 -Type DWord
    `,
    revertCmd: `
      $path = 'HKCU:\\System\\GameConfigStore'
      If (Test-Path $path) {
        Remove-ItemProperty -Path $path -Name 'GameDVR_FSEBehaviorMode' -ErrorAction SilentlyContinue
        Remove-ItemProperty -Path $path -Name 'GameDVR_FSEBehavior' -ErrorAction SilentlyContinue
      }
    `
  },

  hpet: {
    name: 'Disable HPET timer',
    requiresAdmin: true,
    applyCmd: `bcdedit /set useplatformclock false`,
    revertCmd: `bcdedit /deletevalue useplatformclock`
  },

  msi: {
    name: 'MSI interrupt mode',
    requiresAdmin: true,
    applyCmd: `
      $gpu = Get-WmiObject Win32_VideoController | Where-Object { $_.Name -notlike '*Virtual*' -and $_.Name -notlike '*Meta*' } | Select-Object -First 1
      If ($gpu) {
        $devId = $gpu.PNPDeviceID
        $path = "HKLM:\\SYSTEM\\CurrentControlSet\\Enum\\$devId\\Device Parameters\\Interrupt Management\\MessageSignaledInterruptProperties"
        If (!(Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
        Set-ItemProperty -Path $path -Name 'MSISupported' -Value 1 -Type DWord
      }
    `,
    revertCmd: `
      $gpu = Get-WmiObject Win32_VideoController | Where-Object { $_.Name -notlike '*Virtual*' -and $_.Name -notlike '*Meta*' } | Select-Object -First 1
      If ($gpu) {
        $devId = $gpu.PNPDeviceID
        $path = "HKLM:\\SYSTEM\\CurrentControlSet\\Enum\\$devId\\Device Parameters\\Interrupt Management\\MessageSignaledInterruptProperties"
        If (Test-Path $path) {
          Set-ItemProperty -Path $path -Name 'MSISupported' -Value 0 -Type DWord
        }
      }
    `
  },

  // ── OVERLAYS AND APPS ────────────────────────────────────────────────────────

  xbox: {
    name: 'Xbox Game Bar off',
    requiresAdmin: false,
    applyCmd: `$p1 = 'HKCU:\\System\\GameConfigStore'; If (!(Test-Path $p1)) { New-Item -Path $p1 -Force | Out-Null }; Set-ItemProperty -Path $p1 -Name 'GameDVR_Enabled' -Value 0 -Type DWord; $p2 = 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\GameDVR'; If (!(Test-Path $p2)) { New-Item -Path $p2 -Force | Out-Null }; Set-ItemProperty -Path $p2 -Name 'AllowGameDVR' -Value 0 -Type DWord; Exit 0`,
    revertCmd: `$p1 = 'HKCU:\\System\\GameConfigStore'; Set-ItemProperty -Path $p1 -Name 'GameDVR_Enabled' -Value 1 -Type DWord -ErrorAction SilentlyContinue; $p2 = 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\GameDVR'; If (Test-Path $p2) { Remove-ItemProperty -Path $p2 -Name 'AllowGameDVR' -ErrorAction SilentlyContinue }; Exit 0`
  },

  steam: {
    name: 'Steam overlay off',
    requiresAdmin: false,
    applyCmd: `
      $path = 'HKCU:\\Software\\Valve\\Steam'
      If (Test-Path $path) {
        Set-ItemProperty -Path $path -Name 'EnableGameOverlay' -Value 0 -Type DWord
      }
    `,
    revertCmd: `
      $path = 'HKCU:\\Software\\Valve\\Steam'
      If (Test-Path $path) {
        Set-ItemProperty -Path $path -Name 'EnableGameOverlay' -Value 1 -Type DWord
      }
    `
  },

  nvoverlay: {
    name: 'GPU vendor overlay off',
    requiresAdmin: false,
    applyCmd: `$procs = @('nvcontainer','RadeonSoftware','RSSDK'); ForEach ($p in $procs) { $proc = Get-Process -Name $p -ErrorAction SilentlyContinue; If ($proc) { $proc | Stop-Process -Force } }; Exit 0`,
    revertCmd: `Write-Output 'Vendor overlay restarts automatically.'; Exit 0`
  },

  onedrive: {
    name: 'OneDrive sync pause',
    requiresAdmin: false,
    applyCmd: `$p = Get-Process -Name 'OneDrive' -ErrorAction SilentlyContinue; If ($p) { $p | Stop-Process -Force }; Exit 0`,
    revertCmd: `$od = "$env:LOCALAPPDATA\Microsoft\OneDrive\OneDrive.exe"; If (Test-Path $od) { Start-Process $od }; Exit 0`
  },

  discord: {
    name: 'Discord GPU acceleration off',
    requiresAdmin: false,
    applyCmd: `
      $settingsPath = "$env:APPDATA\\discord\\settings.json"
      If (Test-Path $settingsPath) {
        $settings = Get-Content $settingsPath | ConvertFrom-Json
        $settings | Add-Member -NotePropertyName 'HARDWARE_ACCELERATION' -NotePropertyValue $false -Force
        $settings | ConvertTo-Json | Set-Content $settingsPath
      }
    `,
    revertCmd: `
      $settingsPath = "$env:APPDATA\\discord\\settings.json"
      If (Test-Path $settingsPath) {
        $settings = Get-Content $settingsPath | ConvertFrom-Json
        $settings | Add-Member -NotePropertyName 'HARDWARE_ACCELERATION' -NotePropertyValue $true -Force
        $settings | ConvertTo-Json | Set-Content $settingsPath
      }
    `
  },

  telemetry: {
    name: 'Telemetry off',
    requiresAdmin: true,
    applyCmd: `Stop-Service -Name 'DiagTrack' -Force -ErrorAction SilentlyContinue; Set-Service -Name 'DiagTrack' -StartupType Disabled`,
    revertCmd: `Set-Service -Name 'DiagTrack' -StartupType Automatic; Start-Service -Name 'DiagTrack' -ErrorAction SilentlyContinue`
  },

  // ── NETWORK ──────────────────────────────────────────────────────────────────

  qos: {
    name: 'QoS packet scheduling off',
    requiresAdmin: true,
    applyCmd: `
      $path = 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Psched'
      If (!(Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
      Set-ItemProperty -Path $path -Name 'NonBestEffortLimit' -Value 0 -Type DWord
    `,
    revertCmd: `
      $path = 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Psched'
      If (Test-Path $path) {
        Remove-ItemProperty -Path $path -Name 'NonBestEffortLimit' -ErrorAction SilentlyContinue
      }
    `
  },

  nagle: {
    name: "Disable Nagle's algorithm",
    requiresAdmin: true,
    applyCmd: `
      $interfaces = Get-ChildItem 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces'
      ForEach ($iface in $interfaces) {
        Set-ItemProperty -Path $iface.PSPath -Name 'TcpAckFrequency' -Value 1 -Type DWord -ErrorAction SilentlyContinue
        Set-ItemProperty -Path $iface.PSPath -Name 'TCPNoDelay' -Value 1 -Type DWord -ErrorAction SilentlyContinue
      }
    `,
    revertCmd: `
      $interfaces = Get-ChildItem 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces'
      ForEach ($iface in $interfaces) {
        Remove-ItemProperty -Path $iface.PSPath -Name 'TcpAckFrequency' -ErrorAction SilentlyContinue
        Remove-ItemProperty -Path $iface.PSPath -Name 'TCPNoDelay' -ErrorAction SilentlyContinue
      }
    `
  }

};

module.exports = { TWEAK_DEFINITIONS };
