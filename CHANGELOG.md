# Changelog

All notable changes to Mojo Gaming Mode will be documented here.

## [0.2.0] - 2026-06-27

### Added

- PowerShell action executor with Base64 encoded commands for reliable silent execution
- Real system tweak execution for all 15 tweaks across Windows system, overlays, and network
- Parallel tweak execution via Promise.all for maximum speed
- Auto-elevation on app startup via app manifest (single UAC prompt on first launch)
- Windows native notifications on activate and deactivate showing preset name
- Auto-switch between presets when gaming mode is active (revert old, apply new)
- Loading state on preset cards during auto-switch to prevent double-click
- Toast repositioned to bottom center to avoid overlapping buttons
- Silent mode for applyMode and revertMode during auto-switch

### Changed

- Config architecture: now stores preset + manualOverrides only, not full tweak state
- Preset switch clears manual overrides
- Tweaks always derive from preset defaults on load, manual overrides applied on top

### Fixed

- OneDrive tweak no longer fails when OneDrive is not running
- Xbox Game Bar tweak creates registry path if missing
- GPU vendor overlay tweak handles missing processes gracefully
- SysMain, WSearch, DiagTrack service commands converted to single-line for reliable elevation

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
