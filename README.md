<p align="center">
  <img src="https://raw.githubusercontent.com/mojouto3/mojo-gaming-mode/main/assets/icons/icon.png" width="80" alt="Mojo Gaming Mode">
  <h1 align="center">Mojo Gaming Mode</h1>
</p>

[![CI](https://github.com/mojouto3/mojo-gaming-mode/actions/workflows/ci.yml/badge.svg)](https://github.com/mojouto3/mojo-gaming-mode/actions/workflows/ci.yml)
[![Latest Release](https://img.shields.io/github/v/release/mojouto3/mojo-gaming-mode?label=version&color=76b900)](https://github.com/mojouto3/mojo-gaming-mode/releases/latest)
[![License](https://img.shields.io/github/license/mojouto3/mojo-gaming-mode?color=76b900)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows-76b900)](https://github.com/mojouto3/mojo-gaming-mode)
[![Electron](https://img.shields.io/badge/Electron-v43-76b900)](https://www.electronjs.org)

A lightweight Windows gaming optimizer that automatically detects your GPU vendor and applies a matching native-style UI. One click to apply a curated set of proven, safe, and fully revertible system tweaks. One click to restore everything.

---

## Features

- GPU auto-detection (NVIDIA, AMD, Intel) with matching vendor theme
- Three presets: Balanced, Performance, Esports + dynamic Custom preset
- Before/after performance snapshot on activation, shown as a toast and as a persistent card in the Performance tab
- Network latency monitor in the Performance tab, color-coded with sparkline history
- Full settings export and import (tweaks, Quick Rules, custom rules, games, and preferences), or just custom rules as JSON
- 30 safe and fully revertible system tweaks
- Custom Rules engine with 35 quick rules in 5 categories
- Game detection: auto-activate gaming mode when a monitored game launches, with Steam/Epic library scan to find games automatically
- Global keyboard shortcuts: Ctrl+G (toggle), Ctrl+B/P/E (presets)
- Real FPS tracking (via PresentMon) in the Performance tab, mini mode, and bar mode - tracks whatever game currently has focus, no setup required, plus a 1% low stat alongside the average
- CPU throttle and GPU thermal/power throttle monitoring in the Performance tab
- Mini mode: compact always-on-top card with live stats, staying on top even over exclusive-fullscreen games
- Bar mode: thin, draggable, always-on-top overlay for in-game use, same always-on-top behavior
- Configurable overlay stats: pick which of 7 stats show in mini mode and bar mode, and in what order, independently for each
- Live window opacity control in mini mode and bar mode, remembered across restarts
- Tray menu preset quick-switch with active tweak count in tooltip
- First-launch onboarding with GPU detection and preset selection
- What's new badge in sidebar after updates
- Auto-updater with download progress bar and one-click install
- Windows toast notification when a new update is available
- System tray with live status icon and auto-revert on quit
- Crash recovery - reverts tweaks automatically on next boot if app was force-closed
- Silent execution - no PowerShell windows, no popups after first launch
- GPU temperature monitoring in Performance tab
- Config persistence with preset-based architecture
- i18n support for 10 languages
- Near-zero idle footprint when minimized to tray
- 2026-style glass UI: translucent blurred surfaces, cursor-tracked spotlight glow, pill-shaped buttons, sliding sidebar indicator, animated tab transitions

---

## Presets

| Preset | Target | Admin needed |
|--------|--------|--------------|
| Balanced | Safe daily use with basic optimizations | No |
| Performance | Maximum FPS, disables overlays and indexing | Yes |
| Esports | Ultra low latency, all tweaks enabled | Yes |
| Custom | Your saved combination of tweaks and custom rules | Yes |

---

## Tweaks included

**Windows system** (22)
- Windows Game Mode
- SysMain (Superfetch) off
- High performance power plan
- Windows Search off
- Fullscreen optimizations off
- HPET timer disable
- MSI interrupt mode
- Focus Assist (notifications) off
- Windows Update pause
- USB selective suspend off
- Xbox background services off
- Windows Error Reporting off
- Disk optimization schedule pause
- Hardware-accelerated GPU Scheduling
- Print Spooler off
- Fax service off
- Retail Demo Service off
- Windows Insider Service off
- Downloaded Maps Manager off
- Background Intelligent Transfer Service off
- Program Compatibility Assistant off
- Delivery Optimization off

**Overlays and apps** (6)
- Xbox Game Bar off
- Steam overlay off
- NVIDIA / AMD vendor overlay off
- OneDrive sync pause
- Discord hardware acceleration off
- Telemetry (DiagTrack + dmwappushsvc) off

**Network** (2)
- Nagle algorithm disable
- Network adapter power-saving off

All tweaks are revertible. Every apply has a matching revert command.

---

## Custom Rules

35 ready-made rules organized in 5 categories. Enable any combination and they run automatically on Activate, reverting on Deactivate.

| Category | Rules |
|----------|-------|
| Game Launchers (9) | Epic Games, EA App, Battle.net, Ubisoft Connect, GOG Galaxy, Xbox App, Rockstar, Riot Client, Minecraft |
| Communication (8) | Microsoft Teams, Slack, Zoom, WhatsApp, Telegram, Viber, Signal, Messenger |
| Cloud Storage (7) | Google Drive, Dropbox, OneDrive, iCloud, Box, MEGA, pCloud |
| System (9) | Phone Link, Copilot, Widgets, Windows games scheduling priority, Razer Synapse, Logitech G HUB, Corsair iCUE, SteelSeries GG, NZXT CAM |
| Media (2) | Spotify, iTunes / Apple Music |

The 5 gaming-peripheral-manager rules (Razer Synapse, Logitech G HUB, Corsair iCUE, SteelSeries GG, NZXT CAM) are off by default - closing them can disable in-game macros, lighting profiles, or DPI switching while stopped, so only enable them if you don't rely on those features during a session.

Active custom rules combine with the selected preset into a dynamic Custom preset card.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+G | Toggle gaming mode |
| Ctrl+B | Switch to Balanced preset |
| Ctrl+P | Switch to Performance preset |
| Ctrl+E | Switch to Esports preset |

---

## Overlay modes

Two compact, always-on-top views for keeping an eye on your system while gaming.

| Mode | Size | Use case |
|------|------|----------|
| Mini mode | 308px wide (3-column grid), fixed position, grows taller to fit however many stats you've enabled | Compact card with preset, status, and your chosen stats plus history sparklines |
| Bar mode | Grows wide enough to fit your chosen stats, draggable | Thin overlay strip, grab it anywhere and drop it wherever suits your game's HUD |

Both modes stay on top of other windows - including exclusive-fullscreen games - and both share a live opacity slider (30 to 100 percent) accessible from the small droplet icon in either view. The opacity level is remembered the next time the app starts. Which stats show in each mode, and in what order, is configurable from the "Overlay stats" section in Settings. Clicking a stat in either mode jumps straight to the Performance tab in normal mode.

---

## What is never touched

The app will never modify or terminate any of the following:

`svchost.exe` `csrss.exe` `lsass.exe` `winlogon.exe` `dwm.exe`
Windows Audio, Plug and Play, Cryptographic Services, Windows Defender, GPU driver services, DHCP Client

---

## Requirements

- Windows 10 or Windows 11 (64-bit)
- NVIDIA, AMD, or Intel discrete GPU
- Administrator access (single UAC prompt on first launch)

---

## Installation

Download `Mojo-Gaming-Mode-Setup-x.x.x.exe` from the [latest release](https://github.com/mojouto3/mojo-gaming-mode/releases/latest) and run the installer.

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a full version history.

---

## Development

```bash
git clone https://github.com/mojouto3/mojo-gaming-mode.git
cd mojo-gaming-mode
npm install
```

Open in VS Code and press **F5** to launch (run VS Code as Administrator for full tweak support).

---

## Project structure

```
src/
  main.js          Electron main process, IPC, tray, GPU detection, auto-updater
  preload.js       contextBridge API surface
  executor.js      PowerShell runner with silent execution
  tweaks.js        Tweak library with apply and revert commands
  metrics.js       Live CPU / RAM / GPU metrics, CPU/GPU throttle detection
  fps.js           Real FPS tracking via PresentMon (foreground-window based)
renderer/
  index.html
  css/
    theme.css      GPU vendor CSS variables (NVIDIA, AMD, Intel)
    app.css        Full UI styles
  js/
    tweaks.js      Tweak and custom rule definitions
    app.js         Renderer logic, state, IPC calls
    motion.js      Spotlight glow, tab transitions, sidebar indicator
    translations.js  i18n strings for 10 languages
assets/
  icons/           App, tray, and vendor logo icons
  app.manifest     Windows manifest requiring Administrator
  installer.nsh    NSIS custom install/uninstall script
  scripts/
    revert-on-shutdown.ps1  Windows shutdown revert script
resources/
  presentmon/      Bundled PresentMon binary (MIT licensed) for FPS tracking
```

---

## Workflow

| Who | What |
|-----|------|
| mojouto3 | main branch, releases, version bumps, milestones |
| Constantinos-T | feature branches, commits, PRs |

Branch naming: `feat/short-description`, `fix/short-description`
All PRs target `main` and require 1 review before merge.

---

## Roadmap

| Version | Scope | Status |
|---------|-------|--------|
| v1.0.0 | NSIS installer, shutdown revert script | Done |
| v1.1.0 | Auto-updater with progress bar | Done |
| v1.2.0 | Electron v42 upgrade, security fixes | Done |
| v1.3.0 | Tray enhancements, keyboard shortcuts, onboarding, what's new badge | Done |
| v1.4.0 | Custom Rules engine UI, quick rules, dynamic Custom preset | Done |
| v1.5.0 | Custom Rules execution, GPU temperature, extra rules | Done |
| v1.6.0 | Auto-minimize, notification preferences, session timer, tray animation | Done |
| v1.7.0 | Bar mode overlay, live opacity control, mini mode stats and polish | Done |
| v1.8.0 | Before/after activation performance snapshot | Done |
| v1.9.0 | Network latency monitor, custom rules import/export | Done |
| v1.10.0 | 5 new system tweaks, ping in before/after activation impact | Done |
| v1.11.0 | AMD/Intel GPU stats, tweak toggle bug fix, Custom preset accuracy | Done |
| v1.12.0 | Full code review: custom rule execution, honest revert reporting, crash-recovery fixes | Done |
| v2.0.0 | Game detection (manual + Steam/Epic auto-detect) | Done |
| v2.0.4 | Full accuracy audit of all core tweaks, removed 2 that didn't deliver | Done |
| v2.1.0 | 3 new system tweaks (Xbox services, Error Reporting, disk optimize pause) | Done |
| v2.2.0 | Hardware-accelerated GPU Scheduling tweak, inactive rules badge | Done |
| v2.3.0 | 5 new tweaks, bounded-concurrency execution, Skype rule removed | Done |
| v2.4.0 - v2.4.3 | Category badges, Quick Rules sub-tabs, critical data-loss-on-update fixes | Done |
| v2.5.0 | Config backup/restore, live ping in mini/bar mode, critical crash-recovery fix | Done |
| v2.6.0 | Real game icons, full settings export/import, active-rules count fix | Done |
| v2.7.0 | 2026-style glass UI redesign, 11 new Quick Rules, 3 new tweaks | Done |
| v2.8.0 | CPU/GPU throttle detection, real FPS tracking (PresentMon), always-on-top overlay fix | Done |
| v2.9.0 | Configurable overlay stats, FPS 1% lows, mini/bar mode visual redesign | Done |

---

## Trademarks

NVIDIA and the NVIDIA logo are trademarks or registered trademarks of NVIDIA Corporation.
AMD and the AMD logo are trademarks of Advanced Micro Devices, Inc.
Intel and the Intel logo are trademarks of Intel Corporation.

All trademarks are the property of their respective owners. Mojo Gaming Mode is an independent project and is not affiliated with, endorsed by, or sponsored by NVIDIA, AMD, or Intel.

---

## Publisher

[![mojomultimedia](https://github.com/mojouto3.png?size=40)](https://github.com/mojouto3) **mojomultimedia**

---

## License

MIT
