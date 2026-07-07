# Changelog

All notable changes to Mojo Gaming Mode are documented here.

---

## [1.7.0] - 2026-07-08

### Added

- Bar mode: new thin, draggable, always-on-top overlay for in-game use, showing preset name, status dot, and live CPU / RAM / GPU stats
- Live window opacity control, accessible from mini mode and bar mode, persisted across restarts
- Mini mode: color-coded CPU / RAM / GPU stats (amber past 50 to 60 percent, red past 80 percent) with mini sparkline history under each stat
- Mini mode: green glow border while gaming mode is active
- Mini mode and bar mode: click the stats row to jump straight to the Performance tab
- Always-on-top behavior for mini mode and bar mode so they stay visible over games

### Fixed

- Mini mode CPU / RAM / GPU stats were never updating and stayed stuck at "--"
- Mini mode window could not shrink to its compact size because a leftover minimum-size constraint from normal mode blocked it
- Deactivate button in mini mode was nearly invisible against the background
- Default browser focus outline looked out of place on the mini mode activate and deactivate button

## [1.6.0] - 2026-06-29

### Added

- Auto-minimize to tray after Activate (0.8s delay)
- Notification preferences in Settings - toggle activate, deactivate and update notifications independently
- Session timer in Performance tab showing elapsed gaming session time in HH:MM:SS
- Animated tray icon - blinks between on/off states while gaming mode is active

### Notes

- Minimize to tray on close and Start with Windows were already implemented in previous versions

## [1.5.0] - 2026-06-29

### Added

- Custom Rules execution engine - rules now run on Activate and revert on Deactivate
- 25 quick rules organized in 5 categories: Game Launchers, Communication, Media, Cloud Storage, System
- Close-all toggle per category in Custom Rules tab
- Dynamic Custom preset card - appears only when at least one rule is active
- GPU temperature monitoring in Performance tab
- Preset keyboard shortcuts Ctrl+B (Balanced), Ctrl+P (Performance), Ctrl+E (Esports)
- Reset to defaults button in Settings
- Active tweak count per category in Tweaks tab
- Windows toast notification when a new update is available
- What's new badge in sidebar after updates
- Version number shown in tray menu

### Fixed

- Custom Rules now correctly pass state to apply-mode handler
- Xbox App process names updated to match actual Windows processes

## [1.4.0] - 2026-06-28

### Added

- Custom Rules engine with 8 ready-made quick rules (Microsoft Teams, Phone Link, Windows Copilot, Windows Widgets, Epic Games Launcher, EA App, Spotify, Windows games scheduling priority)
- Dynamic Custom preset card in Presets tab - appears only when at least one rule is active
- Custom card auto-highlights when a rule is enabled
- Switching to another preset automatically disables all custom rules
- Preset keyboard shortcuts Ctrl+B (Balanced), Ctrl+P (Performance), Ctrl+E (Esports)
- Reset to defaults button in Settings
- Active tweak count per category in Tweaks tab header
- Windows toast notification when a new update is available

## [1.3.0] - 2026-06-28

### Added

- First-launch onboarding with 4 steps: Welcome, Preset selection, Safety overview, Ready
- GPU vendor logo and model shown in onboarding welcome screen
- Tray menu preset quick-switch (Balanced / Performance / Esports)
- Tray tooltip shows active tweak count when gaming mode is on
- Global keyboard shortcut Ctrl+G to toggle gaming mode
- Tweaks tab search and filter
- What's new badge in sidebar on new version
- Version number shown in tray menu title

### Fixed

- Removed all em-dashes from UI, tooltips, README and CHANGELOG

## [1.2.1] - 2026-06-28

### Added

- First-launch onboarding modal with 4 steps: Welcome, Preset selection, Safety overview, Ready
- GPU vendor logo and model displayed in onboarding welcome screen
- Preset selection saved to config on onboarding completion
- Onboarding shown only once, controlled by onboardingComplete flag in config

## [1.2.0] - 2026-06-28

### Changed

- Upgraded Electron from v28 to v42
- Upgraded electron-builder from v24 to v26
- Fixed 6 high severity vulnerabilities (ASAR integrity, use-after-free, registry injection and more)

---

## [1.1.2] - 2026-06-28

### Changed

- Install and Restart prompts user to quit app from tray before installer runs

---

## [1.1.1] - 2026-06-28

### Fixed

- Auto-updater test release

---

## [1.1.0] - 2026-06-28

### Added

- Auto-updater via electron-updater with download progress bar
- Install and Restart button after download completes
- onUpdaterStatus IPC event for real-time update status in renderer

---

## [1.0.9] - 2026-06-28

### Fixed

- Installer uses PowerShell Stop-Process to kill running instances before install and uninstall

---

## [1.0.8] - 2026-06-28

### Fixed

- Installer kills running app instances via taskkill before install and uninstall

---

## [1.0.7] - 2026-06-28

### Fixed

- Download button in update bar now opens browser correctly via IPC open-external handler
- Update bar redesigned as pill shape with fade-in animation

---

## [1.0.6] - 2026-06-28

### Fixed

- Proper cleanup on app quit via metrics.stop()

---

## [1.0.5] - 2026-06-28

### Added

- Single instance lock prevents multiple app instances running simultaneously
- Check for updates button in Settings tab
- Tweak rows show live ON status with pulsing dot when gaming mode is active
- Update available notification in titlebar pill bar

### Fixed

- Dynamic version display loaded from package.json via IPC
- Tabler icons bundled locally in renderer/fonts for correct display in installed app

---

## [1.0.0] - 2026-06-28

### Added

- NSIS installer with per-user installation
- System Restore Point created automatically during installation
- Windows shutdown script registered on install for safe tweak revert on system shutdown
- Shutdown script reverts all active tweaks when Windows shuts down or restarts
- Shutdown script unregistered and app data removed on uninstall
- Desktop shortcut created by default
- Start menu shortcut created by default
- App launches after install completes

---

## [0.4.1] - 2026-06-27

### Fixed

- Revert system now uses activeTweakIds stored at apply time instead of config file
- Service revert uses sc.exe instead of Set-Service for reliable startup type change
- Executor elevation wrapper removed - app runs as admin via manifest, no per-command elevation needed
- All tweak commands rewritten as single-line with Exit 0 and ErrorAction SilentlyContinue
- Auto-revert on tray Quit via before-quit event
- Crash recovery on next boot via wasActive flag in config.json

---

## [0.4.0] - 2026-06-27

### Added

- Theme override in Settings - manual vendor theme selection (Auto, NVIDIA, AMD, Intel)
- i18n support for 10 languages: English, Greek, German, Spanish, Russian, Italian, French, Portuguese BR, Polish, Turkish
- Live CPU, RAM and GPU performance metrics tab with persistent PowerShell process
- Collapsible Applied Changes section in Presets tab
- ON status badges with pulsing dot on active tweak rows

---

## [0.3.0] - 2026-06-27

### Added

- Settings tab with System Restore Point creation
- Start with Windows autostart toggle
- Settings persistence across sessions

---

## [0.2.0] - 2026-06-27

### Added

- Real PowerShell execution via Base64-encoded silent commands
- Parallel tweak execution
- Windows native notifications on activate and deactivate
- Auto-switch presets without manual deactivate
- Config persistence with preset and manual override architecture

---

## [0.1.0] - 2026-06-27

### Added

- Initial release
- Frameless Electron window with GPU vendor theme detection (NVIDIA, AMD, Intel)
- Three presets: Balanced, Performance, Esports
- 15 tweak definitions with apply and revert commands
- System tray with status icon and context menu
- IPC bridge via contextBridge and preload
- Single instance lock
- Config file at AppData/mojo-gaming-mode/config.json
