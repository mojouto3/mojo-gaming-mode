# Changelog

All notable changes to Mojo Gaming Mode are documented here.

---

## [2.1.0] - 2026-07-22

### Added

- **Xbox background services off**: stops Xbox Live background services (auth, cloud saves, networking) that run even if you don't use Xbox features. Breaks Xbox Live sign-in, cloud saves, and cross-play while active, so it's off by default - only enable it if you don't use those.
- **Windows Error Reporting off**: stops the background service that generates crash dump reports, avoiding disk/CPU spikes if something else crashes while gaming.
- **Disk optimization schedule pause**: pauses the scheduled disk optimization task for the gaming session, avoiding disk contention if it happens to run while you play.

## [2.0.4] - 2026-07-21

A full accuracy audit of all 20 core tweaks: does each one actually deliver what its name and description promise, not just whether the underlying command runs without error.

### Removed

- **QoS packet scheduling off**: confirmed a 20+ year old debunked myth. It only affects apps that actively request Windows QoS bandwidth reservations, which essentially no modern game does, so it delivered no real benefit despite writing successfully.
- **Enhanced Pointer Precision off**: meant to be toggled per gaming session, but a registry change alone doesn't apply live in the current session, only after signing out or restarting - which isn't practical for something you'd want to toggle every session. No reliable way to force it live was found.

### Fixed

- **Discord GPU acceleration off**: previously tried to auto-restart Discord so the change applies immediately, but Discord's own updater requires admin rights, which conflicts with how this app safely relaunches other apps. Now just changes the setting and tells you to restart Discord yourself, with an explanation of why.
- **Focus Assist (notifications) off**: the description overpromised. It actually locks the Notification Center panel from opening, it does not block notification banners from appearing. Description corrected to match.
- **Disable HPET timer**, **MSI interrupt mode**, **Disable Nagle's algorithm**: all confirmed to require a restart to take effect, which wasn't previously mentioned. Descriptions updated.

## [2.0.3] - 2026-07-18

### Fixed

- Reopening an app on deactivate (Quick Rules or a custom rule with "Reopen when deactivated") could run it with administrator rights, since it inherited this app's own elevation. OneDrive explicitly refuses to run this way and showed an error. Apps now reopen using a temporary Task Scheduler task configured for standard user rights, which reliably runs unelevated regardless of this app's own elevation.
- Apps reopened on deactivate even if they weren't actually running before you activated gaming mode, since the check only looked at whether the app was installed, not whether anything had actually been closed. Now only reopens an app if it was genuinely running before it was closed.

## [2.0.2] - 2026-07-18

### Fixed

- The AppUserModelID fix in v2.0.1 wasn't enough on its own: Windows notification click-to-focus is a known, still-unresolved issue in Electron itself for packaged (non-Squirrel) apps, even with a correctly configured AppUserModelID. Rather than depend on the notification click working, the game-closed prompt now reliably appears the next time the app window is shown or focused by any means (tray icon, taskbar, or a working notification click), instead of only firing through the unreliable click path.

## [2.0.1] - 2026-07-18

### Fixed

- Clicking the "game closed" notification did nothing in the installed app (it worked fine in development, which masked this). Windows requires an app to have a matching AppUserModelID for notification clicks to correctly bring the app to the foreground, which Electron only sets up automatically for Squirrel-based installers, not NSIS. Set explicitly now.

## [2.0.0] - 2026-07-18

### Added

- **Game detection**, the first v2.0.0 milestone feature. A new Games tab lets you add games to monitor (or scan your Steam and Epic libraries to find them automatically). When a monitored game launches, gaming mode auto-activates using that game's assigned preset, or the last active one. When the game closes, a notification lets you choose whether to deactivate, instead of doing it automatically.
- **Steam/Epic library scan**: a "Scan for installed games" button in the Games tab. Epic detection is exact, reading the real launch executable straight from the game's manifest. Steam detection is best-effort, since Steam's local files don't expose the actual executable name directly; results are added disabled by default so you can review them.

### Fixed

- Individual tweak toggles could visually get stuck "highlighted" after being turned off, caused by a duplicate HTML id shared between the real Tweaks tab row and background summary views of the same tweak elsewhere in the app.
- Extended the Games tab with the same active-state highlighting already used in Tweaks and Custom Rules.

## [1.12.0] - 2026-07-17

A full internal code review found several places where the app reported success without actually verifying anything happened. This release fixes all of them.

### Fixed

- **The "Add custom rule" feature never executed anything.** A user could create a rule, see it saved and listed, and it would have zero real effect. Kill process, CPU priority, and Disable service now actually run, with real tracking. "Registry tweak" removed from the type dropdown for now, pending a safer redesign.
- New optional "Reopen when deactivated" toggle for Kill-process custom rules, with automatic path detection or a file picker.
- "Disable service" custom rules now capture the real original startup type before disabling it and restore that exact value on revert, instead of guessing.
- None of the revert paths (Deactivate button, app quit, crash-recovery on next launch) checked whether the revert actually succeeded before declaring success. All now check real results.
- The 25 built-in Quick Rules discarded every apply/revert result. They now have real success/failure tracking and are protected by crash-recovery and quit-revert, which they previously weren't at all.
- The "Kill Teams" quick rule couldn't reopen the new, MSIX-based Teams client, only the classic one. Fixed with a fallback to the new client's stable launch path.
- Restore point creation always reported success regardless of the actual result, even hardcoding a success exit code into the script itself. Now verifies a restore point genuinely appeared, and reports the specific reason on failure (including Windows' 24-hour throttle limit, which silently no-ops instead of erroring).
- The three notification preference toggles in Settings had no effect at all. Now wired up, and the preference persists across restarts (it didn't before).
- Discord Rich Presence stayed stuck on-screen indefinitely after quitting the app.
- Fixed a bug in `saveConfig()` where a partial save from one part of the app could silently wipe out fields written by another part (specifically, this was erasing the crash-recovery state right after it was written).
- Fixed an unhandled Discord RPC transport error that could crash the entire app on launch if Discord wasn't running.

### Removed

- Dead, unused duplicate command data in the renderer (never executed, confirmed via full review) and a handful of orphaned CSS rules left over from an earlier naming convention.

## [1.11.0] - 2026-07-12

### Fixed

- **Individual tweak toggles were not persisting reliably.** A DOM re-serialization bug in `buildTweakRow()` destroyed the checkbox's checked state and click handler immediately after creation. Manually clicking a tweak on or off could silently fail to update the app's actual configuration
- 15 Windows paths in quick-rule revert commands had their backslashes silently stripped by JS string parsing, breaking several "relaunch app after deactivate" commands and the `cr_gamesprior` GPU/CPU priority registry tweak entirely
- GPU usage percentage was NVIDIA-only (`nvidia-smi`), always showing 0 on AMD and Intel systems. Added a fallback using Windows' native GPU Engine performance counters, the same data source Task Manager's GPU graph uses, working across all vendors
- The "Custom" preset card only tracked active Quick Rules, ignoring manual tweak overrides, so a hand-edited preset could still show the original preset name as active. Now any deviation switches to Custom, with an accurate combined count
- The Dropbox quick rule had no icon (the bundled icon font doesn't include one); switched to a generic cloud icon

### Added

- Toggle-all switch per Tweaks category (Windows System / Overlays and Apps / Network), matching the existing per-category toggle in Custom Rules

## [1.10.0] - 2026-07-11

### Added

- 5 new safe, fully revertible tweaks (closes #56, partial): Focus Assist off, Enhanced Pointer Precision off, Windows Update pause, network adapter power-saving off, USB selective suspend off. All individually verified, including crash-recovery revert testing
- Before/after activation impact (toast and Performance tab card) now also captures ping, alongside CPU, RAM, and GPU. Previously the feature couldn't show the effect of network-latency tweaks like Nagle's algorithm or QoS packet scheduling, since those don't move CPU/RAM/GPU usage at all

### Not included

A launcher/downloader bandwidth throttle tweak (Steam, Epic, Battle.net, EA App, Ubisoft Connect, Riot updater) was built and extensively tested using Windows policy-based QoS (`New-NetQosPolicy`), but enforcement proved unreliable on a standalone (non-domain) setup despite the policy being created correctly every time. Left out of this release pending further research; details on issue #56.

## [1.9.0] - 2026-07-10

### Added

- Network latency monitor in the Performance tab (closes #45): pings 8.8.8.8 every 3 seconds, color-coded (green under 50ms, amber 50 to 100ms, red over 100ms), with sparkline history. Runs independently from the CPU / RAM / GPU polling loop and is only active while the Performance tab itself is open, including when mini mode or bar mode is showing
- Import and export custom rules as JSON (closes #46): export button saves the current Quick Rules toggles and any custom-built rules to a shareable `.json` file, import restores them from a file with validation against unknown or malformed entries
- Mini mode and bar mode: CPU / RAM / GPU labels now use the GPU vendor accent color instead of plain gray, for quicker visual scanning

## [1.8.0] - 2026-07-09

### Added

- Before/after performance snapshot on activation (closes #42): CPU, RAM, and GPU are read right before applying tweaks and again after, shown as a toast on activation and as a persistent "Last activation impact" card in the Performance tab
- `metrics.js`: new `getSnapshot()` for a single averaged reading, separate from the existing continuous polling loop used by mini mode, bar mode, and the Performance tab

### Fixed

- Activation toast never appeared on a direct button click. `addEventListener('click', applyMode)` passes the DOM click Event as the function's first argument, which `applyMode(silent = false)` reads as the silent flag. An Event object is always truthy, so every real click silently ran as `silent = true` and suppressed the toast, with no error and no visible symptom besides the missing toast. The native Windows notification fired regardless, which is why this went unnoticed. Fixed by binding through named handlers (`onActivateClick`, `onRevertClick`) that call `applyMode()` / `revertMode()` with no arguments.
- The Activate/Deactivate button swap used `removeEventListener('click', applyMode)` / `removeEventListener('click', revertMode)`, which stopped matching once the bug above was fixed with wrapped handlers, leaving both listeners attached at once. Fixed by using the same named handler references for both the add and the remove calls.
- Before/after readings are now averaged from two samples 400ms apart, with a 1.5 second settle delay after tweaks finish, to reduce noise from the tweak-applying PowerShell processes still winding down.

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
