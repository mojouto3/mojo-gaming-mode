# Mojo Gaming Mode

A lightweight Windows gaming optimizer that automatically detects your GPU vendor and applies a matching native-style UI. One click to apply a curated set of proven, safe, and fully revertible system tweaks. One click to restore everything.

---

## Features

- GPU auto-detection (NVIDIA, AMD, Intel) with matching vendor theme
- Three presets: Balanced, Performance, Esports
- 15 safe and fully revertible system tweaks
- Custom rules engine for power users
- Auto-switch between presets without manual revert
- Windows native notifications on activate and deactivate
- System tray with live status icon
- Silent execution — no PowerShell windows, no popups after first launch
- Config persistence with preset-based architecture
- Near-zero idle footprint when minimized to tray

---

## Presets

| Preset | Target | Admin needed |
|--------|--------|--------------|
| Balanced | Safe daily use with basic optimizations | No |
| Performance | Maximum FPS, disables overlays and indexing | Yes |
| Esports | Ultra low latency, all tweaks enabled | Yes |

---

## Tweaks included

**Windows system**
- Windows Game Mode
- SysMain (Superfetch) disable
- High performance power plan
- Windows Search disable during session
- Fullscreen optimizations override
- HPET timer disable
- MSI interrupt mode

**Overlays and apps**
- Xbox Game Bar off
- Steam overlay off
- NVIDIA / AMD vendor overlay off
- OneDrive sync pause
- Discord hardware acceleration off
- Telemetry (DiagTrack) disable

**Network**
- QoS packet scheduling off
- Nagle algorithm disable

All tweaks are revertible. Every apply has a matching revert command.

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

Download `MojoGamingModeSetup.exe` from the [latest release](https://github.com/mojouto3/mojo-gaming-mode/releases/latest) and run the installer.

---

## Development

```bash
git clone https://github.com/mojouto3/mojo-gaming-mode.git
cd mojo-gaming-mode
npm install
```

Copy the Electron binary manually into `node_modules/electron/dist/` then open in VS Code and press **F5** to launch (run VS Code as Administrator for full tweak support).

---

## Project structure

```
src/
  main.js          Electron main process, IPC, tray, GPU detection
  preload.js       contextBridge API surface
  executor.js      PowerShell runner with silent execution
  tweaks.js        Tweak library with apply and revert commands
renderer/
  index.html
  css/
    theme.css      GPU vendor CSS variables (NVIDIA, AMD, Intel)
    app.css        Full UI styles
  js/
    tweaks.js      Tweak definitions and preset configuration
    app.js         Renderer logic, state, IPC calls
assets/
  icons/           App, tray, and vendor logo icons
  app.manifest     Windows manifest requiring Administrator
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

| Version | Scope |
|---------|-------|
| v0.1.0 | UI shell, GPU detection, themes, preset system |
| v0.2.0 | Real PowerShell actions, parallel execution, notifications |
| v0.3.0 | System Restore Point, safety layer |
| v0.4.0 | Settings tab (theme picker, language, autostart) |
| v1.0.0 | NSIS installer, auto-updater, stable release |

---

## Trademarks

NVIDIA and the NVIDIA logo are trademarks or registered trademarks of NVIDIA Corporation.
AMD and the AMD logo are trademarks of Advanced Micro Devices, Inc.
Intel and the Intel logo are trademarks of Intel Corporation.

All trademarks are the property of their respective owners. Mojo Gaming Mode is an independent project and is not affiliated with, endorsed by, or sponsored by NVIDIA, AMD, or Intel.

---

## Publisher

**mojomultimedia** — [github.com/mojouto3](https://github.com/mojouto3)

---

## License

MIT
