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
      desc: 'May reduce interrupt latency. Test on your CPU — results vary.',
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
      cmd: 'nvcontainer.exe / RadeonSoftware.exe — process terminate',
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
