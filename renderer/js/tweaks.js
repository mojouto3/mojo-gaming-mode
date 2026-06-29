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
    category: 'communication',
    name: 'Microsoft Teams off',
    desc: 'Closes Microsoft Teams during gaming. Restarts automatically after.',
    cmd: 'Stop-Process: Teams.exe',
    tag: 's',
    applyCmd: `Get-Process -Name 'Teams','ms-teams' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revertCmd: `$t = "$env:LOCALAPPDATA\\Microsoft\\Teams\\Update.exe"; If (Test-Path $t) { Start-Process $t -ArgumentList '--processStart Teams.exe' -ErrorAction SilentlyContinue }; Exit 0`
  },
  {
    id: 'cr_phonelink',
    category: 'system',
    name: 'Phone Link off',
    desc: 'Closes the Phone Link app (formerly Your Phone) during gaming.',
    cmd: 'Stop-Process: PhoneExperienceHost.exe',
    tag: 's',
    applyCmd: `Get-Process -Name 'PhoneExperienceHost' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revertCmd: `Start-Process 'explorer.exe' 'shell:appsFolder\\Microsoft.YourPhone_8wekyb3d8bbwe!App' -ErrorAction SilentlyContinue; Exit 0`
  },
  {
    id: 'cr_copilot',
    category: 'system',
    name: 'Windows Copilot off',
    desc: 'Closes the Windows Copilot sidebar during gaming.',
    cmd: 'Stop-Process: Copilot.exe',
    tag: 's',
    applyCmd: `Get-Process -Name 'Copilot' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revertCmd: `Exit 0`
  },
  {
    id: 'cr_widgets',
    category: 'system',
    name: 'Windows Widgets off',
    desc: 'Closes the Windows Widgets panel during gaming.',
    cmd: 'Stop-Process: Widgets.exe',
    tag: 's',
    applyCmd: `Get-Process -Name 'Widgets' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revertCmd: `Exit 0`
  },
  {
    id: 'cr_epicgames',
    category: 'launchers',
    name: 'Epic Games Launcher off',
    desc: 'Closes the Epic Games Launcher background process during gaming.',
    cmd: 'Stop-Process: EpicGamesLauncher.exe',
    tag: 's',
    applyCmd: `Get-Process -Name 'EpicGamesLauncher','EpicWebHelper' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revertCmd: `$e = "C:\\Program Files (x86)\\Epic Games\\Launcher\\Portal\\Binaries\\Win32\\EpicGamesLauncher.exe"; If (Test-Path $e) { Start-Process $e -ErrorAction SilentlyContinue }; Exit 0`
  },
  {
    id: 'cr_eaapp',
    category: 'launchers',
    name: 'EA App off',
    desc: 'Closes the EA App background process during gaming.',
    cmd: 'Stop-Process: EABackgroundService.exe',
    tag: 's',
    applyCmd: `Get-Process -Name 'EABackgroundService','EAGD' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revertCmd: `$e = "C:\\Program Files\\Electronic Arts\\EA Desktop\\EA Desktop\\EADesktop.exe"; If (Test-Path $e) { Start-Process $e -ErrorAction SilentlyContinue }; Exit 0`
  },
  {
    id: 'cr_spotify',
    category: 'media',
    name: 'Spotify off',
    desc: 'Closes Spotify during gaming to free up RAM and CPU.',
    cmd: 'Stop-Process: Spotify.exe',
    tag: 's',
    applyCmd: `Get-Process -Name 'Spotify' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revertCmd: `$s = "$env:APPDATA\\Spotify\\Spotify.exe"; If (Test-Path $s) { Start-Process $s -ErrorAction SilentlyContinue }; Exit 0`
  },
  {
    id: 'cr_battlenet',
    category: 'launchers',
    name: 'Battle.net off',
    desc: 'Closes the Battle.net launcher during gaming.',
    cmd: 'Stop-Process: Battle.net.exe',
    tag: 's',
    applyCmd: `Get-Process -Name 'Battle.net','Battle.net Helper' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revertCmd: `$b = "C:\Program Files (x86)\Battle.net\Battle.net.exe"; If (Test-Path $b) { Start-Process $b -ErrorAction SilentlyContinue }; Exit 0`
  },
  {
    id: 'cr_ubisoft',
    category: 'launchers',
    name: 'Ubisoft Connect off',
    desc: 'Closes the Ubisoft Connect launcher during gaming.',
    cmd: 'Stop-Process: UbisoftConnect.exe',
    tag: 's',
    applyCmd: `Get-Process -Name 'UbisoftConnect','UplayWebCore' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revertCmd: `$u = "C:\Program Files (x86)\Ubisoft\Ubisoft Game Launcher\UbisoftConnect.exe"; If (Test-Path $u) { Start-Process $u -ErrorAction SilentlyContinue }; Exit 0`
  },
  {
    id: 'cr_gog',
    category: 'launchers',
    name: 'GOG Galaxy off',
    desc: 'Closes the GOG Galaxy launcher during gaming.',
    cmd: 'Stop-Process: GalaxyClient.exe',
    tag: 's',
    applyCmd: `Get-Process -Name 'GalaxyClient','GalaxyClientService' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revertCmd: `$g = "C:\Program Files (x86)\GOG Galaxy\GalaxyClient.exe"; If (Test-Path $g) { Start-Process $g -ErrorAction SilentlyContinue }; Exit 0`
  },
  {
    id: 'cr_xbox',
    category: 'launchers',
    name: 'Xbox App off',
    desc: 'Closes the Xbox App background process during gaming.',
    cmd: 'Stop-Process: XboxApp.exe',
    tag: 's',
    applyCmd: `Get-Process -Name 'XboxApp','GameBar','XboxGameBarWidgets','XboxPcApp','XboxPcAppFT','XboxPcTray','XboxGameBar' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revertCmd: `Exit 0`
  },
  {
    id: 'cr_rockstar',
    category: 'launchers',
    name: 'Rockstar Games Launcher off',
    desc: 'Closes the Rockstar Games Launcher during gaming.',
    cmd: 'Stop-Process: RockstarService.exe',
    tag: 's',
    applyCmd: `Get-Process -Name 'RockstarService','Launcher' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revertCmd: `$r = "C:\Program Files\Rockstar Games\Launcher\Launcher.exe"; If (Test-Path $r) { Start-Process $r -ErrorAction SilentlyContinue }; Exit 0`
  },
  {
    id: 'cr_slack',
    name: 'Slack off',
    desc: 'Closes Slack during gaming to free up RAM.',
    cmd: 'Stop-Process: slack.exe',
    tag: 's',
    category: 'communication',
    applyCmd: `Get-Process -Name 'slack' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revertCmd: `$s = "$env:LOCALAPPDATA\slack\slack.exe"; If (Test-Path $s) { Start-Process $s -ErrorAction SilentlyContinue }; Exit 0`
  },
  {
    id: 'cr_zoom',
    name: 'Zoom off',
    desc: 'Closes Zoom during gaming.',
    cmd: 'Stop-Process: Zoom.exe',
    tag: 's',
    category: 'communication',
    applyCmd: `Get-Process -Name 'Zoom','ZoomOutlookIMPlugin' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revertCmd: `Exit 0`
  },
  {
    id: 'cr_whatsapp',
    name: 'WhatsApp Desktop off',
    desc: 'Closes WhatsApp Desktop during gaming.',
    cmd: 'Stop-Process: WhatsApp.exe',
    tag: 's',
    category: 'communication',
    applyCmd: `Get-Process -Name 'WhatsApp' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revertCmd: `$w = "$env:LOCALAPPDATA\WhatsApp\WhatsApp.exe"; If (Test-Path $w) { Start-Process $w -ErrorAction SilentlyContinue }; Exit 0`
  },
  {
    id: 'cr_telegram',
    name: 'Telegram Desktop off',
    desc: 'Closes Telegram Desktop during gaming.',
    cmd: 'Stop-Process: Telegram.exe',
    tag: 's',
    category: 'communication',
    applyCmd: `Get-Process -Name 'Telegram' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revertCmd: `$t = "$env:APPDATA\Telegram Desktop\Telegram.exe"; If (Test-Path $t) { Start-Process $t -ErrorAction SilentlyContinue }; Exit 0`
  },
  {
    id: 'cr_googledrive',
    name: 'Google Drive off',
    desc: 'Closes Google Drive sync during gaming.',
    cmd: 'Stop-Process: GoogleDriveFS.exe',
    tag: 's',
    category: 'cloud',
    applyCmd: `Get-Process -Name 'GoogleDriveFS','GoogleDrive' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revertCmd: `$g = "C:\Program Files\Google\Drive File Stream\GoogleDriveFS.exe"; If (Test-Path $g) { Start-Process $g -ErrorAction SilentlyContinue }; Exit 0`
  },
  {
    id: 'cr_dropbox',
    name: 'Dropbox off',
    desc: 'Closes Dropbox sync during gaming.',
    cmd: 'Stop-Process: Dropbox.exe',
    tag: 's',
    category: 'cloud',
    applyCmd: `Get-Process -Name 'Dropbox' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revertCmd: `$d = "$env:LOCALAPPDATA\Dropbox\client\Dropbox.exe"; If (Test-Path $d) { Start-Process $d -ErrorAction SilentlyContinue }; Exit 0`
  },
  {
    id: 'cr_minecraft',
    name: 'Minecraft Launcher off',
    desc: 'Closes the Minecraft Launcher during gaming.',
    cmd: 'Stop-Process: MinecraftLauncher.exe',
    tag: 's',
    category: 'launchers',
    applyCmd: `Get-Process -Name 'MinecraftLauncher','Minecraft' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revertCmd: `Exit 0`
  },
  {
    id: 'cr_itunes',
    name: 'iTunes / Apple Music off',
    desc: 'Closes iTunes or Apple Music during gaming.',
    cmd: 'Stop-Process: iTunes.exe',
    tag: 's',
    category: 'media',
    applyCmd: `Get-Process -Name 'iTunes','AppleMusic' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revertCmd: `Exit 0`
  },
  {
    id: 'cr_riot',
    name: 'Riot Games Client off',
    desc: 'Closes the Riot Games client during gaming (Valorant, League of Legends).',
    cmd: 'Stop-Process: RiotClientServices.exe',
    tag: 's',
    category: 'launchers',
    applyCmd: `Get-Process -Name 'RiotClientServices','RiotClientUx','RiotClientUxRender' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revertCmd: `Exit 0`
  },
  {
    id: 'cr_onedrive_close',
    name: 'OneDrive close',
    desc: 'Closes OneDrive completely during gaming. Unlike the main tweak, this kills the process entirely.',
    cmd: 'Stop-Process: OneDrive.exe',
    tag: 's',
    category: 'cloud',
    applyCmd: `Get-Process -Name 'OneDrive' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revertCmd: `$o = "$env:LOCALAPPDATA\Microsoft\OneDrive\OneDrive.exe"; If (Test-Path $o) { Start-Process $o -ErrorAction SilentlyContinue }; Exit 0`
  },
  {
    id: 'cr_icloud',
    name: 'iCloud off',
    desc: 'Closes iCloud sync during gaming.',
    cmd: 'Stop-Process: iCloudDrive.exe',
    tag: 's',
    category: 'cloud',
    applyCmd: `Get-Process -Name 'iCloudDrive','iCloudPhotos','iCloudServices' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revertCmd: `$i = "C:\Program Files (x86)\Common Files\Apple\Internet Services\iCloudDrive.exe"; If (Test-Path $i) { Start-Process $i -ErrorAction SilentlyContinue }; Exit 0`
  },
  {
    id: 'cr_skype',
    name: 'Skype off',
    desc: 'Closes Skype during gaming.',
    cmd: 'Stop-Process: Skype.exe',
    tag: 's',
    category: 'communication',
    applyCmd: `Get-Process -Name 'Skype' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revertCmd: `$s = "$env:APPDATA\Microsoft\Skype\Skype.exe"; If (Test-Path $s) { Start-Process $s -ErrorAction SilentlyContinue }; Exit 0`
  },
  {
    id: 'cr_gamesprior',
    category: 'system',
    name: 'Windows games scheduling priority',
    desc: 'Sets high CPU scheduling priority for games via Windows Multimedia registry.',
    cmd: 'Registry: HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games',
    tag: 'r',
    applyCmd: `$p = 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games'; If (!(Test-Path $p)) { New-Item -Path $p -Force | Out-Null }; Set-ItemProperty -Path $p -Name 'GPU Priority' -Value 8 -Type DWord; Set-ItemProperty -Path $p -Name 'Priority' -Value 6 -Type DWord; Set-ItemProperty -Path $p -Name 'Scheduling Category' -Value 'High' -Type String; Set-ItemProperty -Path $p -Name 'SFIO Priority' -Value 'High' -Type String; Exit 0`,
    revertCmd: `$p = 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games'; Set-ItemProperty -Path $p -Name 'GPU Priority' -Value 2 -Type DWord -ErrorAction SilentlyContinue; Set-ItemProperty -Path $p -Name 'Priority' -Value 2 -Type DWord -ErrorAction SilentlyContinue; Set-ItemProperty -Path $p -Name 'Scheduling Category' -Value 'Medium' -Type String -ErrorAction SilentlyContinue; Set-ItemProperty -Path $p -Name 'SFIO Priority' -Value 'Normal' -Type String -ErrorAction SilentlyContinue; Exit 0`
  }
];
