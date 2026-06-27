# Changelog

All notable changes to Mojo Gaming Mode will be documented here.

## [0.1.0] - 2026-06-27

### Added

- Electron app shell for Windows (frameless window, custom titlebar)
- Automatic GPU vendor detection via PowerShell Get-WmiObject (Windows 11 compatible)
- NVIDIA theme: dark charcoal background, neon green #76b900 accents
- AMD theme: dark charcoal background, red #ED1C24 accents
- Intel theme: dark background, blue #0071C5 accents
- Theme auto-loads on startup based on detected GPU
- Detected GPU model displayed in sidebar (e.g. NVIDIA GeForce RTX 4080)
- Official vendor logos in sidebar and titlebar area (NVIDIA, AMD, Intel)
- Three presets: Balanced, Performance, Esports
- Full tweak library with 15 safe revertible tweaks across three categories
- Windows system tweaks: Game Mode, SysMain, power plan, Windows Search, fullscreen opt, HPET, MSI mode
- Overlay tweaks: Xbox Game Bar, Steam overlay, GPU vendor overlay, OneDrive, Discord GPU accel, telemetry
- Network tweaks: Nagle algorithm, QoS packet scheduling
- Per-tweak tags: No admin / Admin / Registry
- Custom rules engine UI: add and delete rules (kill process, set CPU priority, registry tweak, disable service)
- Performance tab with FPS target, active tweaks count, sessions count, rules count
- Config persistence via JSON at %APPDATA%\mojo-gaming-mode\config.json
- System tray with MGM icon (gray when off, neon green when active)
- Tray context menu: Gaming Mode status, Activate/Deactivate, Open, Quit
- Tray icon swaps between off/on states when gaming mode is toggled
- Window closes to tray instead of exiting
- VS Code launch configuration for F5 debugging workflow
- Trademark disclaimer for NVIDIA, AMD and Intel logos in README

### Notes

- v0.1.0 is a UI shell only. Tweaks are saved to config but not yet executed on the system.
- PowerShell action execution arrives in v0.2.0.
- System Restore Point integration arrives in v0.3.0.
