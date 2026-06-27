# Mojo Gaming Mode

A lightweight Windows gaming optimizer with automatic GPU vendor detection, preset system, and safe revertible system tweaks.

Detects your GPU (NVIDIA or AMD) and loads the matching native-style UI. One click to apply a curated set of proven optimizations. One click to revert everything.

---

## Features

- GPU auto-detection with matching vendor theme (NVIDIA / AMD)
- Three presets: Balanced, Performance, Esports
- Safe tweak library: services, overlays, registry, network
- Custom rules engine for power users
- Full revert system with automatic System Restore Point before activation
- System tray with near-zero idle footprint
- No telemetry, no ads, no accounts

---

## Tweaks included

**Windows system**
- Windows Game Mode
- High performance power plan
- SysMain (Superfetch) disable
- Windows Search disable during session
- Fullscreen optimizations override
- HPET timer disable
- MSI interrupt mode

**Overlays and apps**
- Xbox Game Bar off
- Steam overlay off
- NVIDIA / AMD vendor overlay off
- Discord hardware acceleration off
- OneDrive sync pause
- Telemetry (DiagTrack) disable

**Network**
- Nagle algorithm disable
- QoS packet scheduling off

All tweaks are revertible. The app creates a System Restore Point before applying any changes.

---

## What is never touched

The app will never modify or kill any of the following regardless of preset or custom rules:

`svchost.exe` `csrss.exe` `lsass.exe` `winlogon.exe` `dwm.exe`  
Windows Audio, Plug and Play, Cryptographic Services, Windows Defender, GPU driver services, DHCP Client

---

## Requirements

- Windows 10 or Windows 11 (64-bit)
- NVIDIA or AMD discrete GPU recommended
- Administrator access for some tweaks

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

Copy the Electron binary manually into `node_modules/electron/dist/` then:

```bash
npm start
```

To build:

```bash
npm run build
```

Run as Administrator for full tweak support during development.

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
| v0.2.0 | Real PowerShell actions, process and service control |
| v0.3.0 | System Restore Point, full revert system |
| v1.0.0 | NSIS installer, auto-updater, stable release |

---

## Publisher

**mojomultimedia** — [github.com/mojouto3](https://github.com/mojouto3)

---

## License

MIT
