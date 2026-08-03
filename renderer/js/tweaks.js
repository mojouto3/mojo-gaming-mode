'use strict';

const TWEAKS = {
  win: [
    {
      id: 'gm',
      name: 'Windows Game Mode',
      desc: 'Dedicates CPU and GPU resources to the active game.',
      cmd: 'GameConfigStore registry tweak',
      category: 'system',
      presets: { balanced: true, performance: true, esports: true }
    },
    {
      id: 'sysmain',
      name: 'SysMain (Superfetch) off',
      desc: 'Stops RAM preloading. Recommended on SSD systems.',
      cmd: 'sc stop SysMain & sc config SysMain start=disabled',
      category: 'system',
      presets: { balanced: true, performance: true, esports: true }
    },
    {
      id: 'hp',
      name: 'High performance power plan',
      desc: 'Prevents CPU throttling for maximum clock speeds.',
      cmd: 'powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c',
      category: 'performance',
      presets: { balanced: false, performance: true, esports: true }
    },
    {
      id: 'wsearch',
      name: 'Windows Search off',
      desc: 'Stops continuous file indexing during your gaming session.',
      cmd: 'sc stop WSearch & sc config WSearch start=disabled',
      category: 'system',
      presets: { balanced: false, performance: true, esports: true }
    },
    {
      id: 'fso',
      name: 'Fullscreen optimizations off',
      desc: 'Exclusive fullscreen mode reduces DWM compositor overhead.',
      cmd: 'Per-app registry override at HKCU\\Software\\Microsoft\\DirectX',
      category: 'media',
      presets: { balanced: false, performance: true, esports: true }
    },
    {
      id: 'hpet',
      name: 'Disable HPET timer',
      desc: 'May reduce interrupt latency. Test on your CPU - results vary.',
      cmd: 'bcdedit /set useplatformclock false',
      category: 'performance',
      restartInfo: 'Restart PC',
      presets: { balanced: false, performance: true, esports: true }
    },
    {
      id: 'msi',
      name: 'MSI interrupt mode',
      desc: 'Message Signaled Interrupts reduce GPU latency on supported hardware.',
      cmd: 'Registry: MSISupported=1 under GPU device key',
      category: 'performance',
      restartInfo: 'Restart PC',
      presets: { balanced: false, performance: false, esports: true }
    },
    {
      id: 'focusassist',
      name: 'Focus Assist (notifications) off',
      desc: 'Locks the Notification Center panel so it can\'t be opened during gaming.',
      cmd: 'Registry: DisableNotificationCenter=1',
      category: 'system',
      presets: { balanced: false, performance: true, esports: true }
    },
    {
      id: 'winupdate',
      name: 'Windows Update pause',
      desc: "Pauses Windows Update for the gaming session so a background download or install doesn't interrupt you.",
      cmd: 'sc stop wuauserv & sc config wuauserv start=disabled',
      category: 'system',
      presets: { balanced: false, performance: true, esports: true }
    },
    {
      id: 'usbsuspend',
      name: 'USB selective suspend off',
      desc: 'Stops USB devices like your mouse and keyboard from suspending, removing wake-up latency.',
      cmd: 'powercfg USB selective suspend setting',
      category: 'performance',
      presets: { balanced: false, performance: true, esports: true }
    },
    {
      id: 'xboxservices',
      name: 'Xbox background services off',
      desc: 'Stops Xbox Live background services (auth, cloud saves, networking) that run even if you don\'t use Xbox features. Breaks Xbox Live sign-in, cloud saves, and cross-play while active - only enable if you don\'t use those.',
      cmd: 'sc stop/disable XblAuthManager, XblGameSave, XboxNetApiSvc, XboxGipSvc',
      category: 'system',
      presets: { balanced: false, performance: false, esports: true }
    },
    {
      id: 'wersvc',
      name: 'Windows Error Reporting off',
      desc: 'Stops the background service that generates crash dump reports, avoiding disk/CPU spikes if something else crashes while gaming.',
      cmd: 'sc stop WerSvc & sc config WerSvc start=disabled',
      category: 'system',
      presets: { balanced: false, performance: true, esports: true }
    },
    {
      id: 'diskoptimize',
      name: 'Disk optimization schedule pause',
      desc: 'Pauses the scheduled disk optimization task for the gaming session, avoiding disk contention if it happens to run while you play.',
      cmd: 'schtasks: disable ScheduledDefrag',
      category: 'system',
      presets: { balanced: false, performance: true, esports: true }
    },
    {
      id: 'hags',
      name: 'Hardware-accelerated GPU Scheduling',
      desc: 'Lets the GPU manage its own memory scheduling instead of Windows. Can reduce latency on supported hardware - results vary, and some driver/hardware combinations don\'t respond to this at all.',
      cmd: 'Registry: HwSchMode=2 under GraphicsDrivers',
      category: 'performance',
      restartInfo: 'Restart PC',
      presets: { balanced: false, performance: false, esports: true }
    },
    {
      id: 'printspooler',
      name: 'Print Spooler off',
      desc: 'Stops the print job management service. Safe if you don\'t print from this PC during your gaming session.',
      cmd: 'sc stop Spooler & sc config Spooler start=disabled',
      category: 'system',
      presets: { balanced: false, performance: true, esports: true }
    },
    {
      id: 'fax',
      name: 'Fax service off',
      desc: 'Stops the Windows Fax service. Almost nobody uses this on a gaming PC.',
      cmd: 'sc stop Fax & sc config Fax start=disabled',
      category: 'system',
      presets: { balanced: false, performance: true, esports: true }
    },
    {
      id: 'retaildemo',
      name: 'Retail Demo Service off',
      desc: 'Stops a service meant for in-store display units, enabled by default on most PCs for no practical reason.',
      cmd: 'sc stop RetailDemo & sc config RetailDemo start=disabled',
      category: 'system',
      presets: { balanced: false, performance: true, esports: true }
    },
    {
      id: 'wisvc',
      name: 'Windows Insider Service off',
      desc: 'Stops the Windows Insider Program service. Safe to disable unless you\'re enrolled in Insider preview builds.',
      cmd: 'sc stop wisvc & sc config wisvc start=disabled',
      category: 'system',
      presets: { balanced: false, performance: true, esports: true }
    },
    {
      id: 'mapsbroker',
      name: 'Downloaded Maps Manager off',
      desc: 'Stops the service that keeps offline map data updated. Unnecessary unless you use offline maps.',
      cmd: 'sc stop MapsBroker & sc config MapsBroker start=disabled',
      category: 'system',
      presets: { balanced: false, performance: true, esports: true }
    },
    {
      id: 'bits',
      name: 'Background Intelligent Transfer Service off',
      desc: 'Stops the service Windows uses for background downloads (updates, some app content), freeing a small amount of background bandwidth and disk I/O.',
      cmd: 'sc stop BITS & sc config BITS start=disabled',
      category: 'system',
      presets: { balanced: false, performance: true, esports: true }
    },
    {
      id: 'pca',
      name: 'Program Compatibility Assistant off',
      desc: 'Stops the background service that monitors programs for compatibility issues and shows "This program might not have installed correctly" prompts.',
      cmd: 'sc stop PcaSvc & sc config PcaSvc start=disabled',
      category: 'system',
      presets: { balanced: false, performance: true, esports: true }
    },
    {
      id: 'deliveryopt',
      name: 'Delivery Optimization off',
      desc: "Stops Windows from using your bandwidth to share update files with other PCs on your network or the internet (peer-to-peer update distribution).",
      cmd: 'sc stop DoSvc & sc config DoSvc start=disabled',
      category: 'system',
      presets: { balanced: false, performance: true, esports: true }
    }
  ],
  ov: [
    {
      id: 'xbox',
      name: 'Xbox Game Bar off',
      desc: 'Disables Win+G overlay and frees background CPU usage.',
      cmd: 'Registry: GameConfigStore\\GameDVR_Enabled=0',
      category: 'media',
      presets: { balanced: false, performance: true, esports: true }
    },
    {
      id: 'steam',
      name: 'Steam overlay off',
      desc: 'Reduces stutters in DX12 and Vulkan titles.',
      cmd: 'Steam launch option: -nooverlay per game',
      category: 'media',
      presets: { balanced: false, performance: true, esports: true }
    },
    {
      id: 'nvoverlay',
      name: 'GPU vendor overlay off',
      desc: 'Terminates the NVIDIA or AMD in-game overlay process.',
      cmd: 'nvcontainer.exe / RadeonSoftware.exe - process terminate',
      category: 'media',
      presets: { balanced: false, performance: true, esports: true }
    },
    {
      id: 'onedrive',
      name: 'OneDrive sync pause',
      desc: 'Stops cloud sync to free bandwidth and disk I/O.',
      cmd: 'OneDrive.exe /shutdown',
      category: 'cloud',
      presets: { balanced: true, performance: true, esports: true }
    },
    {
      id: 'discord',
      name: 'Discord GPU acceleration off',
      desc: 'Disables hardware acceleration in Discord to free VRAM. Requires restarting Discord yourself to take effect (Discord\'s own updater requires admin rights, so this can\'t be done automatically).',
      cmd: 'Discord settings.json: hardwareAcceleration=false',
      category: 'communication',
      restartInfo: 'Restart Discord',
      presets: { balanced: false, performance: false, esports: true }
    },
    {
      id: 'telemetry',
      name: 'Telemetry off',
      desc: 'Stops the DiagTrack and dmwappushsvc data collection services, and sets the "optional diagnostic data" policy to off (may be partially ignored on Home editions - this does what Windows allows).',
      cmd: 'sc stop DiagTrack, dmwappushsvc & AllowTelemetry=0',
      category: 'system',
      presets: { balanced: false, performance: true, esports: true }
    }
  ],
  net: [
    {
      id: 'nagle',
      name: "Disable Nagle's algorithm",
      desc: 'Reduces TCP packet delay for lower ping in online games.',
      cmd: 'Registry: TcpAckFrequency=1, TCPNoDelay=1',
      category: 'performance',
      restartInfo: 'Restart PC',
      presets: { balanced: false, performance: false, esports: true }
    },
    {
      id: 'nicpower',
      name: 'Network adapter power-saving off',
      desc: 'Prevents the network adapter from powering down mid-session, reducing micro-stutter and packet loss.',
      cmd: 'Set-NetAdapterPowerManagement -AllowComputerToTurnOffDevice Disabled',
      category: 'performance',
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
  },
  {
    id: 'cr_phonelink',
    category: 'system',
    name: 'Phone Link off',
    desc: 'Closes the Phone Link app (formerly Your Phone) during gaming.',
    cmd: 'Stop-Process: PhoneExperienceHost.exe',
  },
  {
    id: 'cr_copilot',
    category: 'system',
    name: 'Windows Copilot off',
    desc: 'Closes the Windows Copilot sidebar during gaming.',
    cmd: 'Stop-Process: Copilot.exe',
  },
  {
    id: 'cr_widgets',
    category: 'system',
    name: 'Windows Widgets off',
    desc: 'Closes the Windows Widgets panel during gaming.',
    cmd: 'Stop-Process: Widgets.exe',
  },
  {
    id: 'cr_epicgames',
    category: 'launchers',
    name: 'Epic Games Launcher off',
    desc: 'Closes the Epic Games Launcher background process during gaming.',
    cmd: 'Stop-Process: EpicGamesLauncher.exe',
  },
  {
    id: 'cr_eaapp',
    category: 'launchers',
    name: 'EA App off',
    desc: 'Closes the EA App background process during gaming.',
    cmd: 'Stop-Process: EABackgroundService.exe, EADesktop.exe',
  },
  {
    id: 'cr_spotify',
    category: 'media',
    name: 'Spotify off',
    desc: 'Closes Spotify during gaming to free up RAM and CPU.',
    cmd: 'Stop-Process: Spotify.exe',
  },
  {
    id: 'cr_battlenet',
    category: 'launchers',
    name: 'Battle.net off',
    desc: 'Closes the Battle.net launcher during gaming.',
    cmd: 'Stop-Process: Battle.net.exe',
  },
  {
    id: 'cr_ubisoft',
    category: 'launchers',
    name: 'Ubisoft Connect off',
    desc: 'Closes the Ubisoft Connect launcher during gaming.',
    cmd: 'Stop-Process: UbisoftConnect.exe',
  },
  {
    id: 'cr_gog',
    category: 'launchers',
    name: 'GOG Galaxy off',
    desc: 'Closes the GOG Galaxy launcher during gaming.',
    cmd: 'Stop-Process: GalaxyClient.exe',
  },
  {
    id: 'cr_xbox',
    category: 'launchers',
    name: 'Xbox App off',
    desc: 'Closes the Xbox App background process during gaming.',
    cmd: 'Stop-Process: XboxApp.exe',
  },
  {
    id: 'cr_rockstar',
    category: 'launchers',
    name: 'Rockstar Games Launcher off',
    desc: 'Closes the Rockstar Games Launcher during gaming.',
    cmd: 'Stop-Process: RockstarService.exe',
  },
  {
    id: 'cr_slack',
    name: 'Slack off',
    desc: 'Closes Slack during gaming to free up RAM.',
    cmd: 'Stop-Process: slack.exe',
    category: 'communication'
  },
  {
    id: 'cr_zoom',
    name: 'Zoom off',
    desc: 'Closes Zoom during gaming.',
    cmd: 'Stop-Process: Zoom.exe',
    category: 'communication'
  },
  {
    id: 'cr_whatsapp',
    name: 'WhatsApp Desktop off',
    desc: 'Closes WhatsApp Desktop during gaming.',
    cmd: 'Stop-Process: WhatsApp.exe',
    category: 'communication'
  },
  {
    id: 'cr_telegram',
    name: 'Telegram Desktop off',
    desc: 'Closes Telegram Desktop during gaming.',
    cmd: 'Stop-Process: Telegram.exe',
    category: 'communication'
  },
  {
    id: 'cr_googledrive',
    name: 'Google Drive off',
    desc: 'Closes Google Drive sync during gaming.',
    cmd: 'Stop-Process: GoogleDriveFS.exe',
    category: 'cloud'
  },
  {
    id: 'cr_dropbox',
    name: 'Dropbox off',
    desc: 'Closes Dropbox sync during gaming.',
    cmd: 'Stop-Process: Dropbox.exe',
    category: 'cloud'
  },
  {
    id: 'cr_minecraft',
    name: 'Minecraft Launcher off',
    desc: 'Closes the Minecraft Launcher during gaming.',
    cmd: 'Stop-Process: MinecraftLauncher.exe',
    category: 'launchers'
  },
  {
    id: 'cr_itunes',
    name: 'iTunes / Apple Music off',
    desc: 'Closes iTunes or Apple Music during gaming.',
    cmd: 'Stop-Process: iTunes.exe',
    category: 'media'
  },
  {
    id: 'cr_riot',
    name: 'Riot Games Client off',
    desc: 'Closes the Riot Games client during gaming (Valorant, League of Legends).',
    cmd: 'Stop-Process: RiotClientServices.exe',
    category: 'launchers'
  },
  {
    id: 'cr_onedrive_close',
    name: 'OneDrive close',
    desc: 'Closes OneDrive completely during gaming. Unlike the main tweak, this kills the process entirely.',
    cmd: 'Stop-Process: OneDrive.exe',
    category: 'cloud'
  },
  {
    id: 'cr_icloud',
    name: 'iCloud off',
    desc: 'Closes iCloud sync during gaming.',
    cmd: 'Stop-Process: iCloudDrive.exe',
    category: 'cloud'
  },
  {
    id: 'cr_gamesprior',
    category: 'system',
    name: 'Windows games scheduling priority',
    desc: 'Sets high CPU scheduling priority for games via Windows Multimedia registry.',
    cmd: 'Registry: HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games',
  },
  {
    id: 'cr_viber',
    name: 'Viber off',
    desc: 'Closes Viber during gaming to free up RAM.',
    cmd: 'Stop-Process: Viber.exe',
    category: 'communication'
  },
  {
    id: 'cr_signal',
    name: 'Signal off',
    desc: 'Closes Signal Desktop during gaming.',
    cmd: 'Stop-Process: Signal.exe',
    category: 'communication'
  },
  {
    id: 'cr_messenger',
    name: 'Messenger off',
    desc: 'Closes the Facebook Messenger desktop app during gaming.',
    cmd: 'Stop-Process: Messenger.exe',
    category: 'communication'
  },
  {
    id: 'cr_box',
    name: 'Box off',
    desc: 'Closes Box sync during gaming.',
    cmd: 'Stop-Process: Box.exe',
    category: 'cloud'
  },
  {
    id: 'cr_mega',
    name: 'MEGA off',
    desc: 'Closes MEGA sync during gaming.',
    cmd: 'Stop-Process: MEGAsync.exe',
    category: 'cloud'
  },
  {
    id: 'cr_pcloud',
    name: 'pCloud off',
    desc: 'Closes pCloud sync during gaming.',
    cmd: 'Stop-Process: pCloud.exe',
    category: 'cloud'
  },
  {
    id: 'cr_razersynapse',
    name: 'Razer Synapse off',
    desc: "Closes Razer Synapse during gaming. Off by default - only enable this if you don't rely on Synapse's in-game macros, per-game lighting profiles, or on-the-fly DPI switching, since closing it disables those while it's stopped.",
    cmd: 'Stop-Process: Razer Synapse Service.exe, RzSynapse.exe',
    category: 'system'
  },
  {
    id: 'cr_lghub',
    name: 'Logitech G HUB off',
    desc: "Closes Logitech G HUB during gaming. Off by default - only enable this if you don't rely on G HUB's in-game macros, lighting profiles, or DPI switching, since closing it disables those while it's stopped.",
    cmd: 'Stop-Process: lghub.exe, lghub_agent.exe',
    category: 'system'
  },
  {
    id: 'cr_icue',
    name: 'Corsair iCUE off',
    desc: "Closes Corsair iCUE during gaming. Off by default - only enable this if you don't rely on iCUE's in-game macros or lighting profiles, since closing it disables those while it's stopped.",
    cmd: 'Stop-Process: iCUE.exe',
    category: 'system'
  },
  {
    id: 'cr_steelseriesgg',
    name: 'SteelSeries GG off',
    desc: "Closes SteelSeries GG during gaming. Off by default - only enable this if you don't rely on GG's in-game macros, lighting profiles, or Sonar audio features, since closing it disables those while it's stopped.",
    cmd: 'Stop-Process: SteelSeriesGG.exe',
    category: 'system'
  },
  {
    id: 'cr_nzxtcam',
    name: 'NZXT CAM off',
    desc: "Closes NZXT CAM during gaming. Off by default - only enable this if you don't rely on CAM's in-game overlay or lighting/fan-curve profiles, since closing it disables those while it's stopped.",
    cmd: 'Stop-Process: NZXT CAM.exe',
    category: 'system'
  }
];
