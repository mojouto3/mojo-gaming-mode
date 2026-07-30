# Mojo Gaming Mode - Shutdown Revert Script
# This script runs on Windows shutdown to revert any active gaming mode tweaks.
# Registered by the MGM installer at:
# HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Group Policy\Scripts\Shutdown

$configPath = "$env:APPDATA\mojo-gaming-mode\config.json"

if (!(Test-Path $configPath)) { Exit 0 }

$config = Get-Content $configPath | ConvertFrom-Json

if (!$config.wasActive -or !$config.activeTweakIds -or $config.activeTweakIds.Count -eq 0) {
    Exit 0
}

$tweaks = $config.activeTweakIds

# Revert services
if ($tweaks -contains 'sysmain') {
    sc.exe config SysMain start= auto
    sc.exe start SysMain 2>$null
}
if ($tweaks -contains 'wsearch') {
    sc.exe config WSearch start= auto
    sc.exe start WSearch 2>$null
}
if ($tweaks -contains 'telemetry') {
    sc.exe config DiagTrack start= auto
    sc.exe start DiagTrack 2>$null
}

# Revert power plan
if ($tweaks -contains 'hp') {
    powercfg /setactive 381b4222-f694-41f0-9685-ff5bb260df2e
}

# Revert HPET
if ($tweaks -contains 'hpet') {
    bcdedit /deletevalue useplatformclock 2>$null
}

# Revert Game Mode
if ($tweaks -contains 'gm') {
    Remove-ItemProperty -Path 'HKCU:\Software\Microsoft\GameBar' -Name 'AutoGameModeEnabled' -ErrorAction SilentlyContinue
    Remove-ItemProperty -Path 'HKCU:\Software\Microsoft\GameBar' -Name 'AllowAutoGameMode' -ErrorAction SilentlyContinue
}

# Revert Xbox Game Bar
if ($tweaks -contains 'xbox') {
    Set-ItemProperty -Path 'HKCU:\System\GameConfigStore' -Name 'GameDVR_Enabled' -Value 1 -Type DWord -ErrorAction SilentlyContinue
}

# Revert Steam overlay
if ($tweaks -contains 'steam') {
    $p = 'HKCU:\Software\Valve\Steam'
    if (Test-Path $p) { Set-ItemProperty -Path $p -Name 'EnableGameOverlay' -Value 1 -Type DWord }
}

# Revert Fullscreen optimizations
if ($tweaks -contains 'fso') {
    Remove-ItemProperty -Path 'HKCU:\System\GameConfigStore' -Name 'GameDVR_FSEBehaviorMode' -ErrorAction SilentlyContinue
    Remove-ItemProperty -Path 'HKCU:\System\GameConfigStore' -Name 'GameDVR_FSEBehavior' -ErrorAction SilentlyContinue
}

# Revert Nagle
if ($tweaks -contains 'nagle') {
    $ifaces = Get-ChildItem 'HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces'
    ForEach ($i in $ifaces) {
        Remove-ItemProperty -Path $i.PSPath -Name 'TcpAckFrequency' -ErrorAction SilentlyContinue
        Remove-ItemProperty -Path $i.PSPath -Name 'TCPNoDelay' -ErrorAction SilentlyContinue
    }
}

# Clear wasActive flag
$config.wasActive = $false
$config.activeTweakIds = @()

# Back up the current config before overwriting it, matching the main
# app's rotation, in case this write (or any other) ever goes wrong.
$backup1 = "$env:APPDATA\mojo-gaming-mode\config.backup1.json"
$backup2 = "$env:APPDATA\mojo-gaming-mode\config.backup2.json"
if (Test-Path $backup1) { Copy-Item $backup1 $backup2 -Force -ErrorAction SilentlyContinue }
Copy-Item $configPath $backup1 -Force -ErrorAction SilentlyContinue

$config | ConvertTo-Json -Depth 10 | Set-Content $configPath

Exit 0
