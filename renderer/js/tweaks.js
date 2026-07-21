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
      desc: 'May reduce interrupt latency. Test on your CPU - results vary. Requires a restart to take effect.',
      cmd: 'bcdedit /set useplatformclock false',
      tag: 'a',
      presets: { balanced: false, performance: true, esports: true }
    },
    {
      id: 'msi',
      name: 'MSI interrupt mode',
      desc: 'Message Signaled Interrupts reduce GPU latency on supported hardware. Requires a restart to take effect.',
      cmd: 'Registry: MSISupported=1 under GPU device key',
      tag: 'r',
      presets: { balanced: false, performance: false, esports: true }
    },
    {
      id: 'focusassist',
      name: 'Focus Assist (notifications) off',
      desc: 'Locks the Notification Center panel so it can\'t be opened during gaming.',
      cmd: 'Registry: DisableNotificationCenter=1',
      tag: 's',
      presets: { balanced: false, performance: true, esports: true }
    },
    {
      id: 'winupdate',
      name: 'Windows Update pause',
      desc: "Pauses Windows Update for the gaming session so a background download or install doesn't interrupt you.",
      cmd: 'sc stop wuauserv & sc config wuauserv start=disabled',
      tag: 'a',
      presets: { balanced: false, performance: true, esports: true }
    },
    {
      id: 'usbsuspend',
      name: 'USB selective suspend off',
      desc: 'Stops USB devices like your mouse and keyboard from suspending, removing wake-up latency.',
      cmd: 'powercfg USB selective suspend setting',
      tag: 's',
      presets: { balanced: false, performance: true, esports: true }
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
      desc: 'Disables hardware acceleration in Discord to free VRAM. Requires restarting Discord yourself to take effect (Discord\'s own updater requires admin rights, so this can\'t be done automatically).',
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
      id: 'nagle',
      name: "Disable Nagle's algorithm",
      desc: 'Reduces TCP packet delay for lower ping in online games. Requires a restart to take effect for existing connections.',
      cmd: 'Registry: TcpAckFrequency=1, TCPNoDelay=1',
      tag: 'r',
      presets: { balanced: false, performance: false, esports: true }
    },
    {
      id: 'nicpower',
      name: 'Network adapter power-saving off',
      desc: 'Prevents the network adapter from powering down mid-session, reducing micro-stutter and packet loss.',
      cmd: 'Set-NetAdapterPowerManagement -AllowComputerToTurnOffDevice Disabled',
      tag: 's',
      presets: { balanced: false, performance: true, esports: true }
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
    tag: 's'
  },
  {
    id: 'cr_phonelink',
    category: 'system',
    name: 'Phone Link off',
    desc: 'Closes the Phone Link app (formerly Your Phone) during gaming.',
    cmd: 'Stop-Process: PhoneExperienceHost.exe',
    tag: 's'
  },
  {
    id: 'cr_copilot',
    category: 'system',
    name: 'Windows Copilot off',
    desc: 'Closes the Windows Copilot sidebar during gaming.',
    cmd: 'Stop-Process: Copilot.exe',
    tag: 's'
  },
  {
    id: 'cr_widgets',
    category: 'system',
    name: 'Windows Widgets off',
    desc: 'Closes the Windows Widgets panel during gaming.',
    cmd: 'Stop-Process: Widgets.exe',
    tag: 's'
  },
  {
    id: 'cr_epicgames',
    category: 'launchers',
    name: 'Epic Games Launcher off',
    desc: 'Closes the Epic Games Launcher background process during gaming.',
    cmd: 'Stop-Process: EpicGamesLauncher.exe',
    tag: 's'
  },
  {
    id: 'cr_eaapp',
    category: 'launchers',
    name: 'EA App off',
    desc: 'Closes the EA App background process during gaming.',
    cmd: 'Stop-Process: EABackgroundService.exe',
    tag: 's'
  },
  {
    id: 'cr_spotify',
    category: 'media',
    name: 'Spotify off',
    desc: 'Closes Spotify during gaming to free up RAM and CPU.',
    cmd: 'Stop-Process: Spotify.exe',
    tag: 's'
  },
  {
    id: 'cr_battlenet',
    category: 'launchers',
    name: 'Battle.net off',
    desc: 'Closes the Battle.net launcher during gaming.',
    cmd: 'Stop-Process: Battle.net.exe',
    tag: 's'
  },
  {
    id: 'cr_ubisoft',
    category: 'launchers',
    name: 'Ubisoft Connect off',
    desc: 'Closes the Ubisoft Connect launcher during gaming.',
    cmd: 'Stop-Process: UbisoftConnect.exe',
    tag: 's'
  },
  {
    id: 'cr_gog',
    category: 'launchers',
    name: 'GOG Galaxy off',
    desc: 'Closes the GOG Galaxy launcher during gaming.',
    cmd: 'Stop-Process: GalaxyClient.exe',
    tag: 's'
  },
  {
    id: 'cr_xbox',
    category: 'launchers',
    name: 'Xbox App off',
    desc: 'Closes the Xbox App background process during gaming.',
    cmd: 'Stop-Process: XboxApp.exe',
    tag: 's'
  },
  {
    id: 'cr_rockstar',
    category: 'launchers',
    name: 'Rockstar Games Launcher off',
    desc: 'Closes the Rockstar Games Launcher during gaming.',
    cmd: 'Stop-Process: RockstarService.exe',
    tag: 's'
  },
  {
    id: 'cr_slack',
    name: 'Slack off',
    desc: 'Closes Slack during gaming to free up RAM.',
    cmd: 'Stop-Process: slack.exe',
    tag: 's',
    category: 'communication'
  },
  {
    id: 'cr_zoom',
    name: 'Zoom off',
    desc: 'Closes Zoom during gaming.',
    cmd: 'Stop-Process: Zoom.exe',
    tag: 's',
    category: 'communication'
  },
  {
    id: 'cr_whatsapp',
    name: 'WhatsApp Desktop off',
    desc: 'Closes WhatsApp Desktop during gaming.',
    cmd: 'Stop-Process: WhatsApp.exe',
    tag: 's',
    category: 'communication'
  },
  {
    id: 'cr_telegram',
    name: 'Telegram Desktop off',
    desc: 'Closes Telegram Desktop during gaming.',
    cmd: 'Stop-Process: Telegram.exe',
    tag: 's',
    category: 'communication'
  },
  {
    id: 'cr_googledrive',
    name: 'Google Drive off',
    desc: 'Closes Google Drive sync during gaming.',
    cmd: 'Stop-Process: GoogleDriveFS.exe',
    tag: 's',
    category: 'cloud'
  },
  {
    id: 'cr_dropbox',
    name: 'Dropbox off',
    desc: 'Closes Dropbox sync during gaming.',
    cmd: 'Stop-Process: Dropbox.exe',
    tag: 's',
    category: 'cloud'
  },
  {
    id: 'cr_minecraft',
    name: 'Minecraft Launcher off',
    desc: 'Closes the Minecraft Launcher during gaming.',
    cmd: 'Stop-Process: MinecraftLauncher.exe',
    tag: 's',
    category: 'launchers'
  },
  {
    id: 'cr_itunes',
    name: 'iTunes / Apple Music off',
    desc: 'Closes iTunes or Apple Music during gaming.',
    cmd: 'Stop-Process: iTunes.exe',
    tag: 's',
    category: 'media'
  },
  {
    id: 'cr_riot',
    name: 'Riot Games Client off',
    desc: 'Closes the Riot Games client during gaming (Valorant, League of Legends).',
    cmd: 'Stop-Process: RiotClientServices.exe',
    tag: 's',
    category: 'launchers'
  },
  {
    id: 'cr_onedrive_close',
    name: 'OneDrive close',
    desc: 'Closes OneDrive completely during gaming. Unlike the main tweak, this kills the process entirely.',
    cmd: 'Stop-Process: OneDrive.exe',
    tag: 's',
    category: 'cloud'
  },
  {
    id: 'cr_icloud',
    name: 'iCloud off',
    desc: 'Closes iCloud sync during gaming.',
    cmd: 'Stop-Process: iCloudDrive.exe',
    tag: 's',
    category: 'cloud'
  },
  {
    id: 'cr_skype',
    name: 'Skype off',
    desc: 'Closes Skype during gaming.',
    cmd: 'Stop-Process: Skype.exe',
    tag: 's',
    category: 'communication'
  },
  {
    id: 'cr_gamesprior',
    category: 'system',
    name: 'Windows games scheduling priority',
    desc: 'Sets high CPU scheduling priority for games via Windows Multimedia registry.',
    cmd: 'Registry: HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games',
    tag: 'r'
  }
];
