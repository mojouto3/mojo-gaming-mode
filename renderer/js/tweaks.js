'use strict';

const TWEAKS = {
  win: [
    {
      id: 'gm',
      name: 'Windows Game Mode',
      desc: 'Dedicates CPU and GPU resources to the active game.',
      cmd: 'GameConfigStore registry tweak',
      tag: 's',
      presets: { balanced: true, performance: true, esports: true }
    },
    {
      id: 'sysmain',
      name: 'SysMain (Superfetch) off',
      desc: 'Stops RAM preloading. Recommended on SSD systems.',
      cmd: 'sc stop SysMain & sc config SysMain start=disabled',
      tag: 's',
      presets: { balanced: true, performance: true, esports: true }
    },
    {
      id: 'hp',
      name: 'High performance power plan',
      desc: 'Prevents CPU throttling for maximum clock speeds.',
      cmd: 'powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c',
      tag: 'a',
      presets: { balanced: false, performance: true, esports: true }
    },
    {
      id: 'wsearch',
      name: 'Windows Search off',
      desc: 'Stops continuous file indexing during your gaming session.',
      cmd: 'sc stop WSearch & sc config WSearch start=disabled',
      tag: 's',
      presets: { balanced: false, performance: true, esports: true }
    },
    {
      id: 'fso',
      name: 'Fullscreen optimizations off',
      desc: 'Exclusive fullscreen mode reduces DWM compositor overhead.',
      cmd: 'Per-app registry override at HKCU\\Software\\Microsoft\\DirectX',
      tag: 'r',
      presets: { balanced: false, performance: true, esports: true }
    },
    {
      id: 'hpet',
      name: 'Disable HPET timer',
      desc: 'May reduce interrupt latency. Test on your CPU - results vary.',
      cmd: 'bcdedit /set useplatformclock false',
      tag: 'a',
      presets: { balanced: false, performance: true, esports: true }
    },
    {
      id: 'msi',
      name: 'MSI interrupt mode',
      desc: 'Message Signaled Interrupts reduce GPU latency on supported hardware.',
      cmd: 'Registry: MSISupported=1 under GPU device key',
      tag: 'r',
      presets: { balanced: false, performance: false, esports: true }
    }
  ],
  ov: [
    {
      id: 'xbox',
      name: 'Xbox Game Bar off',
      desc: 'Disables Win+G overlay and frees background CPU usage.',
      cmd: 'Registry: GameConfigStore\\GameDVR_Enabled=0',
      tag: 's',
      presets: { balanced: false, performance: true, esports: true }
    },
    {
      id: 'steam',
      name: 'Steam overlay off',
      desc: 'Reduces stutters in DX12 and Vulkan titles.',
      cmd: 'Steam launch option: -nooverlay per game',
      tag: 's',
      presets: { balanced: false, performance: true, esports: true }
    },
    {
      id: 'nvoverlay',
      name: 'GPU vendor overlay off',
      desc: 'Terminates the NVIDIA or AMD in-game overlay process.',
      cmd: 'nvcontainer.exe / RadeonSoftware.exe - process terminate',
      tag: 's',
      presets: { balanced: false, performance: true, esports: true }
    },
    {
      id: 'onedrive',
      name: 'OneDrive sync pause',
      desc: 'Stops cloud sync to free bandwidth and disk I/O.',
      cmd: 'OneDrive.exe /shutdown',
      tag: 's',
      presets: { balanced: true, performance: true, esports: true }
    },
    {
      id: 'discord',
      name: 'Discord GPU acceleration off',
      desc: 'Disables hardware acceleration in Discord to free VRAM.',
      cmd: 'Discord settings.json: hardwareAcceleration=false',
      tag: 's',
      presets: { balanced: false, performance: false, esports: true }
    },
    {
      id: 'telemetry',
      name: 'Telemetry off (DiagTrack)',
      desc: 'Stops Microsoft data collection background processing.',
      cmd: 'sc stop DiagTrack & sc config DiagTrack start=disabled',
      tag: 's',
      presets: { balanced: false, performance: true, esports: true }
    }
  ],
  net: [
    {
      id: 'qos',
      name: 'QoS packet scheduling off',
      desc: 'Removes the 20% bandwidth reserve held for system processes.',
      cmd: 'Registry: HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Psched',
      tag: 'a',
      presets: { balanced: false, performance: true, esports: true }
    },
    {
      id: 'nagle',
      name: "Disable Nagle's algorithm",
      desc: 'Reduces TCP packet delay for lower ping in online games.',
      cmd: 'Registry: TcpAckFrequency=1, TCPNoDelay=1',
      tag: 'r',
      presets: { balanced: false, performance: false, esports: true }
    }
  ]
};

const ALL_TWEAKS = [...TWEAKS.win, ...TWEAKS.ov, ...TWEAKS.net];

const CUSTOM_RULES = [
  {
    id: 'cr_teams',
    name: 'Microsoft Teams off',
    desc: 'Closes Microsoft Teams during gaming. Restarts automatically after.',
    cmd: 'Stop-Process: Teams.exe',
    tag: 's',
    applyCmd: `Get-Process -Name 'Teams','ms-teams' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revertCmd: `$t = "$env:LOCALAPPDATA\\Microsoft\\Teams\\Update.exe"; If (Test-Path $t) { Start-Process $t -ArgumentList '--processStart Teams.exe' -ErrorAction SilentlyContinue }; Exit 0`
  },
  {
    id: 'cr_phonelink',
    name: 'Phone Link off',
    desc: 'Closes the Phone Link app (formerly Your Phone) during gaming.',
    cmd: 'Stop-Process: PhoneExperienceHost.exe',
    tag: 's',
    applyCmd: `Get-Process -Name 'PhoneExperienceHost' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revertCmd: `Start-Process 'explorer.exe' 'shell:appsFolder\\Microsoft.YourPhone_8wekyb3d8bbwe!App' -ErrorAction SilentlyContinue; Exit 0`
  },
  {
    id: 'cr_copilot',
    name: 'Windows Copilot off',
    desc: 'Closes the Windows Copilot sidebar during gaming.',
    cmd: 'Stop-Process: Copilot.exe',
    tag: 's',
    applyCmd: `Get-Process -Name 'Copilot' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revertCmd: `Exit 0`
  },
  {
    id: 'cr_widgets',
    name: 'Windows Widgets off',
    desc: 'Closes the Windows Widgets panel during gaming.',
    cmd: 'Stop-Process: Widgets.exe',
    tag: 's',
    applyCmd: `Get-Process -Name 'Widgets' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revertCmd: `Exit 0`
  },
  {
    id: 'cr_epicgames',
    name: 'Epic Games Launcher off',
    desc: 'Closes the Epic Games Launcher background process during gaming.',
    cmd: 'Stop-Process: EpicGamesLauncher.exe',
    tag: 's',
    applyCmd: `Get-Process -Name 'EpicGamesLauncher','EpicWebHelper' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revertCmd: `$e = "C:\\Program Files (x86)\\Epic Games\\Launcher\\Portal\\Binaries\\Win32\\EpicGamesLauncher.exe"; If (Test-Path $e) { Start-Process $e -ErrorAction SilentlyContinue }; Exit 0`
  },
  {
    id: 'cr_eaapp',
    name: 'EA App off',
    desc: 'Closes the EA App background process during gaming.',
    cmd: 'Stop-Process: EABackgroundService.exe',
    tag: 's',
    applyCmd: `Get-Process -Name 'EABackgroundService','EAGD' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revertCmd: `$e = "C:\\Program Files\\Electronic Arts\\EA Desktop\\EA Desktop\\EADesktop.exe"; If (Test-Path $e) { Start-Process $e -ErrorAction SilentlyContinue }; Exit 0`
  },
  {
    id: 'cr_spotify',
    name: 'Spotify off',
    desc: 'Closes Spotify during gaming to free up RAM and CPU.',
    cmd: 'Stop-Process: Spotify.exe',
    tag: 's',
    applyCmd: `Get-Process -Name 'Spotify' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revertCmd: `$s = "$env:APPDATA\\Spotify\\Spotify.exe"; If (Test-Path $s) { Start-Process $s -ErrorAction SilentlyContinue }; Exit 0`
  },
  {
    id: 'cr_gamesprior',
    name: 'Windows games scheduling priority',
    desc: 'Sets high CPU scheduling priority for games via Windows Multimedia registry.',
    cmd: 'Registry: HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games',
    tag: 'r',
    applyCmd: `$p = 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games'; If (!(Test-Path $p)) { New-Item -Path $p -Force | Out-Null }; Set-ItemProperty -Path $p -Name 'GPU Priority' -Value 8 -Type DWord; Set-ItemProperty -Path $p -Name 'Priority' -Value 6 -Type DWord; Set-ItemProperty -Path $p -Name 'Scheduling Category' -Value 'High' -Type String; Set-ItemProperty -Path $p -Name 'SFIO Priority' -Value 'High' -Type String; Exit 0`,
    revertCmd: `$p = 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games'; Set-ItemProperty -Path $p -Name 'GPU Priority' -Value 2 -Type DWord -ErrorAction SilentlyContinue; Set-ItemProperty -Path $p -Name 'Priority' -Value 2 -Type DWord -ErrorAction SilentlyContinue; Set-ItemProperty -Path $p -Name 'Scheduling Category' -Value 'Medium' -Type String -ErrorAction SilentlyContinue; Set-ItemProperty -Path $p -Name 'SFIO Priority' -Value 'Normal' -Type String -ErrorAction SilentlyContinue; Exit 0`
  }
];
