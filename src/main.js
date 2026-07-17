'use strict';

const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, Notification, globalShortcut, shell, dialog, screen } = require('electron');

// The @xhayper/discord-rpc library can emit a raw 'error' event on its
// internal IPC socket (e.g. EPIPE when Discord isn't running or closes the
// pipe mid-connect) that bypasses the .catch() on login() entirely and
// crashes the whole process. Discord presence is a cosmetic, best-effort
// feature, so specifically that failure mode is not allowed to take down
// the app (including the crash-recovery/revert logic that runs at startup).
// Anything else uncaught is NOT swallowed here, so real, unexpected bugs
// still crash loudly instead of limping along silently broken.
process.on('uncaughtException', (err) => {
  const msg = (err && err.stack) || String(err);
  if (msg.includes('discord-rpc') || msg.includes('IPCTransport')) {
    console.error('Discord RPC transport error (non-fatal, ignored):', err.message);
    return;
  }
  console.error('Uncaught exception:', err);
  app.exit(1);
});

// Discord Rich Presence
let discordRPC = null;
let rpcClient = null;
const DISCORD_CLIENT_ID = '1524081804619808768';

function initDiscordRPC() {
  try {
    const { Client } = require('@xhayper/discord-rpc');
    rpcClient = new Client({ clientId: DISCORD_CLIENT_ID });
    rpcClient.on('ready', () => {
      console.log('Discord RPC connected!');
      updateDiscordPresence();
    });
    rpcClient.login().catch((e) => {
      console.log('Discord RPC error:', e.message);
    });
  } catch(e) {
    console.log('Discord RPC init error:', e.message);
  }
}

function updateDiscordPresence(preset, tweakCount, sessionStart) {
  if (!rpcClient) return;
  try {
    if (!rpcClient) return;
    if (gamingModeActive) {
      rpcClient.user?.setActivity({
        details: `Gaming Mode: ON`,
        state: `${preset || currentPreset || 'Balanced'} preset - ${tweakCount || activeTweakIds.length} tweaks active`,
        startTimestamp: sessionStart || Date.now(),
        largeImageKey: 'mgm_logo',
        largeImageText: 'Mojo Gaming Mode',
        instance: false
      });
    } else {
      rpcClient.user?.setActivity({
        details: 'Gaming Mode: OFF',
        state: 'Ready to optimize',
        largeImageKey: 'mgm_logo',
        largeImageText: 'Mojo Gaming Mode',
        instance: false
      });
    }
  } catch(e) {}
}

function clearDiscordPresence() {
  if (!rpcClient) return;
  try { rpcClient.user?.clearActivity(); } catch(e) {}
}
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { executeTweaks, runPS, executeCustomRules } = require('./executor');
const metrics = require('./metrics');
const { autoUpdater } = require('electron-updater');

const { TWEAK_DEFINITIONS } = require('./tweaks');

const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');
const ASSETS_PATH = path.join(__dirname, '..', 'assets');

let mainWindow = null;
let tray = null;
let gamingModeActive = false;
let detectedGPU = { vendor: 'nvidia', model: 'Unknown GPU' };
let activeTweakIds = []; // tweaks currently applied, used for revert
let activeCustomRules = []; // user-created custom rules currently applied (with captured revert state), used for revert
let trayAnimInterval = null;
let notifPrefs = { activate: true, deactivate: true, update: true };
let currentPreset = 'balanced';

// Window size constants — keep createWindow() and the mini-mode toggle in sync
const NORMAL_MIN_SIZE = { width: 760, height: 580 };
const NORMAL_SIZE = { width: 860, height: 680 };
const MINI_SIZE = { width: 220, height: 280 };
const BAR_SIZE = { width: 420, height: 44 };

const DEFAULT_CONFIG = {
  gpu: null,
  preset: 'balanced',
  windowOpacity: 1,
  tweaks: {
    gm: true,
    sysmain: true,
    onedrive: true,
    hp: false,
    wsearch: false,
    xbox: false,
    steam: false,
    nvoverlay: false,
    qos: false,
    nagle: false,
    msi: false,
    discord: false,
    telemetry: false,
    fso: false,
    hpet: false,
    focusassist: false,
    pointerprecision: false,
    winupdate: false,
    nicpower: false,
    usbsuspend: false
  },
  customRules: []
};

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    }
  } catch (e) {}
  return { ...DEFAULT_CONFIG };
}

function saveConfig(config) {
  try {
    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
    // Merge with whatever is already on disk instead of a full replace.
    // A partial config object (e.g. the renderer's persistConfig(), which
    // only sends UI-facing fields) must not silently wipe out fields owned
    // by other code paths, like the crash-recovery state written by
    // apply-mode (wasActive/activeTweakIds/activeCustomRules).
    let existing = {};
    try {
      if (fs.existsSync(CONFIG_PATH)) existing = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    } catch (e) {}
    const merged = { ...existing, ...config };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2));
    return true;
  } catch (e) {
    return false;
  }
}

function detectGPU() {
  return new Promise((resolve) => {
    // wmic is deprecated on Windows 11 — use PowerShell Get-WmiObject instead
    const cmd = 'powershell -NoProfile -Command "Get-WmiObject Win32_VideoController | Select-Object -ExpandProperty Name"';
    exec(cmd, (err, stdout) => {
      if (err || !stdout) {
        resolve({ vendor: 'intel', model: 'Unknown GPU' });
        return;
      }

      // Filter out virtual/display adapters, find the real GPU
      const lines = stdout.split(/\r?\n/)
        .map(l => l.trim())
        .filter(l => l.length > 0)
        .filter(l => !l.toLowerCase().includes('virtual') &&
                     !l.toLowerCase().includes('meta') &&
                     !l.toLowerCase().includes('remote'));

      const gpuName = lines[0] || '';
      const lower = gpuName.toLowerCase();

      if (lower.includes('nvidia')) {
        resolve({ vendor: 'nvidia', model: gpuName });
      } else if (lower.includes('amd') || lower.includes('radeon')) {
        resolve({ vendor: 'amd', model: gpuName });
      } else {
        resolve({ vendor: 'intel', model: gpuName || 'Unknown GPU' });
      }
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: NORMAL_SIZE.width,
    height: NORMAL_SIZE.height,
    minWidth: NORMAL_MIN_SIZE.width,
    minHeight: NORMAL_MIN_SIZE.height,
    frame: false,
    backgroundColor: detectedGPU.vendor === 'amd' ? '#1c1c1e' : '#1a1a1a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: true
    },
    show: false,
    icon: path.join(ASSETS_PATH, 'icons', 'icon.ico')
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    const savedOpacity = loadConfig().windowOpacity;
    if (typeof savedOpacity === 'number') mainWindow.setOpacity(savedOpacity);
  });

  mainWindow.on('close', (e) => {
    e.preventDefault();
    metrics.stop();
    metrics.stopPing();
    mainWindow.hide();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  const iconPath = path.join(ASSETS_PATH, 'icons', 'tray-off.png');
  const icon = nativeImage.createFromPath(iconPath);

  tray = new Tray(icon);
  tray.setToolTip('Mojo Gaming Mode');
  updateTrayMenu();

  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    } else {
      createWindow();
    }
  });

  tray.on('double-click', () => {
    if (mainWindow) mainWindow.show();
  });
}

function sendToRenderer(channel, ...args) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, ...args);
  }
}

function switchPresetFromTray(preset) {
  currentPreset = preset;
  updateTrayMenu();
  if (!mainWindow || mainWindow.isDestroyed()) createWindow();
  setTimeout(() => sendToRenderer('tray-switch-preset', preset), 300);
}

function updateTrayMenu() {
  const presetLabels = { balanced: 'Balanced', performance: 'Performance', esports: 'Esports' };
  const activePreset = currentPreset || 'balanced';

  const presetItems = ['balanced', 'performance', 'esports'].map(p => ({
    label: (p === activePreset ? '● ' : '  ') + presetLabels[p],
    enabled: !gamingModeActive,
    click: () => switchPresetFromTray(p)
  }));

  const tweakCount = activeTweakIds.length;
  const tooltipText = gamingModeActive
    ? `Mojo Gaming Mode: ${tweakCount} tweak${tweakCount !== 1 ? 's' : ''} active`
    : `Mojo Gaming Mode v${APP_VERSION}`;
  tray.setToolTip(tooltipText);

  const menu = Menu.buildFromTemplate([
    { label: `Mojo Gaming Mode v${APP_VERSION}`, enabled: false },
    { type: 'separator' },
    { label: gamingModeActive ? '● Gaming Mode: ON' : '○ Gaming Mode: OFF', enabled: false },
    {
      label: gamingModeActive ? '✓ Deactivate' : 'Activate',
      click: () => {
        if (!mainWindow || mainWindow.isDestroyed()) createWindow();
        setTimeout(() => sendToRenderer('tray-toggle-mode', !gamingModeActive), 300);
      }
    },
    { type: 'separator' },
    { label: 'Preset', enabled: false },
    ...presetItems,
    { type: 'separator' },
    {
      label: 'Open',
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) { mainWindow.show(); mainWindow.focus(); }
        else createWindow();
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) { mainWindow.removeAllListeners('close'); mainWindow.close(); }
        mainWindow = null;
        app.quit();
      }
    }
  ]);
  tray.setContextMenu(menu);
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.exit(0);
}
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized() || !mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
  }
});

// Suppress GPU cache errors when running as Administrator
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('no-sandbox');



app.whenReady().then(async () => {
  detectedGPU = await detectGPU();

  // Global keyboard shortcut Ctrl+G to toggle gaming mode
  globalShortcut.register('CommandOrControl+G', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('tray-toggle-mode', !gamingModeActive);
    }
  });

  // Preset shortcuts
  globalShortcut.register('CommandOrControl+B', () => switchPresetFromTray('balanced'));
  globalShortcut.register('CommandOrControl+P', () => switchPresetFromTray('performance'));
  globalShortcut.register('CommandOrControl+E', () => switchPresetFromTray('esports'));

  // Init Discord Rich Presence
  initDiscordRPC();

  // Init auto-updater and check on startup
  initAutoUpdater();
  setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 4000);

  // Check if app crashed while active and auto-revert
  const startupConfig = loadConfig();
  const hadActiveTweaks = startupConfig.wasActive && startupConfig.activeTweakIds && startupConfig.activeTweakIds.length > 0;
  const hadActiveCustomRules = startupConfig.activeCustomRules && startupConfig.activeCustomRules.length > 0;
  if (hadActiveTweaks || hadActiveCustomRules) {
    let recoveryFailedCount = 0;

    if (hadActiveTweaks) {
      activeTweakIds = [...startupConfig.activeTweakIds];
      try {
        const recoveryResults = await executeTweaks(activeTweakIds, TWEAK_DEFINITIONS, 'revert');
        const recoveryFailed = recoveryResults.filter(r => !r.success && !r.skipped);
        if (recoveryFailed.length) {
          console.error('Crash-recovery: failed to revert tweaks:', recoveryFailed.map(r => r.id + ' (' + r.error + ')').join(', '));
          recoveryFailedCount += recoveryFailed.length;
        }
      } catch(e) {
        console.error('Crash-recovery: tweak revert threw:', e.message);
        recoveryFailedCount += activeTweakIds.length;
      }
      activeTweakIds = [];
    }

    if (hadActiveCustomRules) {
      try {
        const ruleResults = await executeCustomRules(startupConfig.activeCustomRules, 'revert');
        const ruleFailed = ruleResults.filter(r => !r.success && !r.skipped);
        if (ruleFailed.length) {
          console.error('Crash-recovery: failed to revert custom rules:', ruleFailed.map(r => r.id + ' (' + r.error + ')').join(', '));
          recoveryFailedCount += ruleFailed.length;
        }
      } catch(e) {
        console.error('Crash-recovery: custom rule revert threw:', e.message);
        recoveryFailedCount += startupConfig.activeCustomRules.length;
      }
    }

    startupConfig.wasActive = false;
    startupConfig.activeTweakIds = [];
    startupConfig.activeCustomRules = [];
    saveConfig(startupConfig);

    if (recoveryFailedCount > 0) {
      new Notification({
        title: 'Mojo Gaming Mode',
        body: `Recovered from an unexpected close, but ${recoveryFailedCount} item${recoveryFailedCount !== 1 ? 's' : ''} may not have reverted correctly. Check Settings if something seems off.`,
        icon: path.join(ASSETS_PATH, 'icons', 'icon.ico')
      }).show();
    }

  }
  const config = loadConfig();
  if (!config.gpu) {
    config.gpu = detectedGPU.vendor;
    saveConfig(config);
  }
  createTray();
  createWindow();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', (e) => {
  e.preventDefault();
});

app.on('quit', () => {
  try { metrics.stop(); metrics.stopPing(); clearDiscordPresence(); } catch(e) {}
});

app.on('activate', () => {
  if (!mainWindow) createWindow();
});

// IPC handlers

ipcMain.handle('get-gpu-info', () => detectedGPU);

ipcMain.handle('get-config', () => loadConfig());

ipcMain.handle('save-config', (e, config) => saveConfig(config));

ipcMain.handle('create-restore-point', async () => {
  return new Promise((resolve) => {
    const { spawn } = require('child_process');
    const cmd = `
      $ProgressPreference = 'SilentlyContinue'
      Checkpoint-Computer -Description 'Mojo Gaming Mode' -RestorePointType 'MODIFY_SETTINGS'
      Exit 0
    `;
    const encoded = Buffer.from(cmd, 'utf16le').toString('base64');
    const ps = spawn('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
      '-EncodedCommand', encoded
    ], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });

    ps.on('close', (code) => {
      resolve({ success: true });
    });
    ps.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });
    setTimeout(() => {
      ps.kill();
      resolve({ success: true }); // timeout = likely succeeded (slow operation)
    }, 60000);
  });
});

// Custom Rules definitions (mirrored from renderer for execution)
const CUSTOM_RULE_CMDS = {
  cr_teams: {
    apply: `Get-Process -Name 'Teams','ms-teams' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revert: `$t = "$env:LOCALAPPDATA\\Microsoft\\Teams\\Update.exe"; If (Test-Path $t) { Start-Process $t -ArgumentList '--processStart Teams.exe' -ErrorAction SilentlyContinue }; Exit 0`
  },
  cr_phonelink: {
    apply: `Get-Process -Name 'PhoneExperienceHost' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revert: `Exit 0`
  },
  cr_copilot: {
    apply: `Get-Process -Name 'Copilot' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revert: `Exit 0`
  },
  cr_widgets: {
    apply: `Get-Process -Name 'Widgets' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revert: `Exit 0`
  },
  cr_epicgames: {
    apply: `Get-Process -Name 'EpicGamesLauncher','EpicWebHelper' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revert: `$e = "C:\\Program Files (x86)\\Epic Games\\Launcher\\Portal\\Binaries\\Win32\\EpicGamesLauncher.exe"; If (Test-Path $e) { Start-Process $e -ErrorAction SilentlyContinue }; Exit 0`
  },
  cr_eaapp: {
    apply: `Get-Process -Name 'EABackgroundService','EAGD' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revert: `Exit 0`
  },
  cr_spotify: {
    apply: `Get-Process -Name 'Spotify' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revert: `$s = "$env:APPDATA\\Spotify\\Spotify.exe"; If (Test-Path $s) { Start-Process $s -ErrorAction SilentlyContinue }; Exit 0`
  },
  cr_minecraft: {
    apply: `Get-Process -Name 'MinecraftLauncher','Minecraft' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revert: `Exit 0`
  },
  cr_itunes: {
    apply: `Get-Process -Name 'iTunes','AppleMusic' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revert: `Exit 0`
  },
  cr_riot: {
    apply: `Get-Process -Name 'RiotClientServices','RiotClientUx','RiotClientUxRender' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revert: `Exit 0`
  },
  cr_onedrive_close: {
    apply: `Get-Process -Name 'OneDrive' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revert: `$o = "$env:LOCALAPPDATA\\Microsoft\\OneDrive\\OneDrive.exe"; If (Test-Path $o) { Start-Process $o -ErrorAction SilentlyContinue }; Exit 0`
  },
  cr_icloud: {
    apply: `Get-Process -Name 'iCloudDrive','iCloudPhotos','iCloudServices' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revert: `Exit 0`
  },
  cr_skype: {
    apply: `Get-Process -Name 'Skype' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revert: `Exit 0`
  },
  cr_slack: {
    apply: `Get-Process -Name 'slack' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revert: `$s = "$env:LOCALAPPDATA\\slack\\slack.exe"; If (Test-Path $s) { Start-Process $s -ErrorAction SilentlyContinue }; Exit 0`
  },
  cr_zoom: {
    apply: `Get-Process -Name 'Zoom','ZoomOutlookIMPlugin' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revert: `Exit 0`
  },
  cr_whatsapp: {
    apply: `Get-Process -Name 'WhatsApp' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revert: `$w = "$env:LOCALAPPDATA\\WhatsApp\\WhatsApp.exe"; If (Test-Path $w) { Start-Process $w -ErrorAction SilentlyContinue }; Exit 0`
  },
  cr_telegram: {
    apply: `Get-Process -Name 'Telegram' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revert: `$t = "$env:APPDATA\\Telegram Desktop\\Telegram.exe"; If (Test-Path $t) { Start-Process $t -ErrorAction SilentlyContinue }; Exit 0`
  },
  cr_googledrive: {
    apply: `Get-Process -Name 'GoogleDriveFS','GoogleDrive' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revert: `$g = "C:\\Program Files\\Google\\Drive File Stream\\GoogleDriveFS.exe"; If (Test-Path $g) { Start-Process $g -ErrorAction SilentlyContinue }; Exit 0`
  },
  cr_dropbox: {
    apply: `Get-Process -Name 'Dropbox' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revert: `$d = "$env:LOCALAPPDATA\\Dropbox\\client\\Dropbox.exe"; If (Test-Path $d) { Start-Process $d -ErrorAction SilentlyContinue }; Exit 0`
  },
  cr_battlenet: {
    apply: `Get-Process -Name 'Battle.net','Battle.net Helper' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revert: `$b = "C:\\Program Files (x86)\\Battle.net\\Battle.net.exe"; If (Test-Path $b) { Start-Process $b -ErrorAction SilentlyContinue }; Exit 0`
  },
  cr_ubisoft: {
    apply: `Get-Process -Name 'UbisoftConnect','UplayWebCore' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revert: `$u = "C:\\Program Files (x86)\\Ubisoft\\Ubisoft Game Launcher\\UbisoftConnect.exe"; If (Test-Path $u) { Start-Process $u -ErrorAction SilentlyContinue }; Exit 0`
  },
  cr_gog: {
    apply: `Get-Process -Name 'GalaxyClient','GalaxyClientService' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revert: `$g = "C:\\Program Files (x86)\\GOG Galaxy\\GalaxyClient.exe"; If (Test-Path $g) { Start-Process $g -ErrorAction SilentlyContinue }; Exit 0`
  },
  cr_xbox: {
    apply: `Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "Xbox*" -or $_.Name -like "GameBar*" } | Stop-Process -Force -ErrorAction SilentlyContinue; Exit 0`,
    revert: `Exit 0`
  },
  cr_rockstar: {
    apply: `Get-Process -Name 'RockstarService','Launcher' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revert: `$r = "C:\\Program Files\\Rockstar Games\\Launcher\\Launcher.exe"; If (Test-Path $r) { Start-Process $r -ErrorAction SilentlyContinue }; Exit 0`
  },
  cr_gamesprior: {
    apply: `$p = 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games'; If (!(Test-Path $p)) { New-Item -Path $p -Force | Out-Null }; Set-ItemProperty -Path $p -Name 'GPU Priority' -Value 8 -Type DWord; Set-ItemProperty -Path $p -Name 'Priority' -Value 6 -Type DWord; Set-ItemProperty -Path $p -Name 'Scheduling Category' -Value 'High' -Type String; Set-ItemProperty -Path $p -Name 'SFIO Priority' -Value 'High' -Type String; Exit 0`,
    revert: `$p = 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games'; Set-ItemProperty -Path $p -Name 'GPU Priority' -Value 2 -Type DWord -ErrorAction SilentlyContinue; Set-ItemProperty -Path $p -Name 'Priority' -Value 2 -Type DWord -ErrorAction SilentlyContinue; Set-ItemProperty -Path $p -Name 'Scheduling Category' -Value 'Medium' -Type String -ErrorAction SilentlyContinue; Set-ItemProperty -Path $p -Name 'SFIO Priority' -Value 'Normal' -Type String -ErrorAction SilentlyContinue; Exit 0`
  }
};

ipcMain.handle('apply-mode', async (e, config) => {
  try {
    // Get list of enabled tweak IDs
    const enabledTweaks = Object.entries(config.tweaks || {})
      .filter(([id, enabled]) => enabled)
      .map(([id]) => id);

    // Store active tweaks for revert
    activeTweakIds = [...enabledTweaks];
    

    // Execute all enabled tweaks
    let results;
    try {
      results = await executeTweaks(enabledTweaks, TWEAK_DEFINITIONS, 'apply');
    } catch(ex) {
      console.log('EXECUTOR ERROR:', ex.message, ex.stack);
      return { success: false, error: ex.message };
    }
    const failed = results.filter(r => !r.success && !r.skipped);

    // Execute active custom rules (built-in Quick Rules)
    if (config.customRulesActive) {
      for (const [id, active] of Object.entries(config.customRulesActive)) {
        if (active && CUSTOM_RULE_CMDS[id]) {
          try { await runPS(CUSTOM_RULE_CMDS[id].apply); } catch(e) {}
        }
      }
    }

    // Execute user-created custom rules (Add custom rule modal), with real
    // per-rule success/failure tracking instead of firing and forgetting.
    // Store a deep copy as activeCustomRules so revert uses the exact state
    // that was actually applied (including any captured service startup
    // type), not whatever the renderer's config currently says.
    let customRuleResults = [];
    activeCustomRules = Array.isArray(config.rules) ? JSON.parse(JSON.stringify(config.rules)) : [];
    if (activeCustomRules.length) {
      customRuleResults = await executeCustomRules(activeCustomRules, 'apply');
      // Merge captured service startup types back so revert can restore
      // the real original state instead of guessing.
      customRuleResults.forEach((r, i) => {
        if (r.capturedStartType && activeCustomRules[i]) {
          activeCustomRules[i].capturedStartType = r.capturedStartType;
        }
      });
    }
    const customRuleFailed = customRuleResults.filter(r => !r.success && !r.skipped);

    gamingModeActive = true;
    if (config.preset) currentPreset = config.preset;
    updateTrayMenu();
    updateDiscordPresence(config.preset, activeTweakIds.length, Date.now());
    // Save active state to config for crash recovery
    const activeConfig = loadConfig();
    activeConfig.wasActive = true;
    activeConfig.activeTweakIds = [...activeTweakIds];
    activeConfig.activeCustomRules = activeCustomRules;
    saveConfig(activeConfig);
    if (tray) {
      const onIcon = nativeImage.createFromPath(path.join(ASSETS_PATH, 'icons', 'tray-on.png'));
      const offIcon = nativeImage.createFromPath(path.join(ASSETS_PATH, 'icons', 'tray-off.png'));
      tray.setImage(onIcon);
      tray.setToolTip(`Mojo Gaming Mode: ${activeTweakIds.length} tweaks active`);
      // Start blink animation
      let blinkState = true;
      trayAnimInterval = setInterval(() => {
        blinkState = !blinkState;
        tray.setImage(blinkState ? onIcon : offIcon);
      }, 800);
    }

    // Windows native notification
    const activeCount = results.filter(r => r.success && !r.skipped).length;
    const totalFailedCount = failed.length + customRuleFailed.length;
    const presetName = config.preset
      ? config.preset.charAt(0).toUpperCase() + config.preset.slice(1)
      : 'Gaming';
    if (notifPrefs.activate) {
      new Notification({
        title: `Gaming Mode Activated: ${presetName}`,
        body: totalFailedCount > 0
          ? `${activeCount} tweak${activeCount !== 1 ? 's' : ''} applied, ${totalFailedCount} item${totalFailedCount !== 1 ? 's' : ''} failed. Check the app for details.`
          : `${activeCount} tweak${activeCount !== 1 ? 's' : ''} applied successfully. System optimized for gaming.`,
        icon: path.join(ASSETS_PATH, 'icons', 'tray-on.png'),
        silent: true
      }).show();
    }

    return { success: true, results, failed, customRuleResults, customRuleFailed };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('revert-mode', async (e, config) => {
  try {
    // Use the tweaks that were actually applied, not the config
    const tweaksToRevert = [...activeTweakIds];
    

    const results = await executeTweaks(tweaksToRevert, TWEAK_DEFINITIONS, 'revert');
    const failed = results.filter(r => !r.success && !r.skipped);
    activeTweakIds = []; // clear after revert
    // Clear active state from config
    const revertConfig = loadConfig();
    revertConfig.wasActive = false;
    revertConfig.activeTweakIds = [];
    revertConfig.activeCustomRules = [];
    saveConfig(revertConfig);

    // Revert active custom rules (built-in Quick Rules)
    const savedConfig = loadConfig();
    if (savedConfig.customRulesActive) {
      for (const [id, active] of Object.entries(savedConfig.customRulesActive)) {
        if (active && CUSTOM_RULE_CMDS[id]) {
          try { await runPS(CUSTOM_RULE_CMDS[id].revert); } catch(e) {}
        }
      }
    }

    // Revert user-created custom rules, using the state that was actually
    // applied (activeCustomRules), not the renderer's current config, so a
    // rule edited or deleted mid-session still reverts correctly.
    let customRuleResults = [];
    if (activeCustomRules.length) {
      customRuleResults = await executeCustomRules(activeCustomRules, 'revert');
    }
    const customRuleFailed = customRuleResults.filter(r => !r.success && !r.skipped);
    activeCustomRules = [];

    gamingModeActive = false;
    updateTrayMenu();
    updateDiscordPresence();
    if (tray) {
      // Stop blink animation
      if (trayAnimInterval) { clearInterval(trayAnimInterval); trayAnimInterval = null; }
      const offIcon = nativeImage.createFromPath(path.join(ASSETS_PATH, 'icons', 'tray-off.png'));
      tray.setImage(offIcon);
      tray.setToolTip('Mojo Gaming Mode');
    }

    // Windows native notification
    const totalFailedCount = failed.length + customRuleFailed.length;
    if (notifPrefs.deactivate) {
      new Notification({
        title: 'Gaming Mode Deactivated',
        body: totalFailedCount > 0
          ? `System mostly restored, but ${totalFailedCount} item${totalFailedCount !== 1 ? 's' : ''} failed to revert. Check the app for details.`
          : 'All tweaks reverted. System restored to normal.',
        icon: path.join(ASSETS_PATH, 'icons', 'tray-off.png'),
        silent: true
      }).show();
    }

    return { success: true, results, failed, customRuleResults, customRuleFailed };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.on('set-notif-prefs', (e, prefs) => {
  notifPrefs = { ...notifPrefs, ...prefs };
});

ipcMain.handle('set-autostart', (e, enabled) => {
  const { app } = require('electron');
  app.setLoginItemSettings({
    openAtLogin: enabled,
    openAsHidden: true,
    name: 'Mojo Gaming Mode'
  });
  return { success: true };
});

ipcMain.handle('open-external', (e, url) => {
  const { shell } = require('electron');
  shell.openExternal(url);
});

ipcMain.handle('get-version', () => {
  return APP_VERSION;
});

ipcMain.handle('get-whats-new', () => {
  try {
    const fs = require('fs');
    const nodepath = require('path');
    const changelogPath = nodepath.join(__dirname, '..', 'CHANGELOG.md');
    const lines = fs.readFileSync(changelogPath, 'utf8').split('\n');
    let version = APP_VERSION;
    const items = [];
    let inBlock = false;
    for (const line of lines) {
      if (!inBlock && line.startsWith('## [')) {
        const bracket = line.indexOf(']');
        if (bracket > 4) { version = line.slice(4, bracket); inBlock = true; }
      } else if (inBlock && line.startsWith('## [')) {
        break;
      } else if (inBlock && line.trim().startsWith('- ')) {
        items.push(line.trim().slice(2));
        if (items.length >= 8) break;
      }
    }
    return { version, items };
  } catch(e) {
    return { version: APP_VERSION, items: [] };
  }
});

const APP_VERSION = require('../package.json').version;

function initAutoUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = true;

  autoUpdater.on('checking-for-update', () => {
    if (mainWindow && !mainWindow.isDestroyed())
      mainWindow.webContents.send('updater-status', { status: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    if (mainWindow && !mainWindow.isDestroyed())
      mainWindow.webContents.send('updater-status', { status: 'available', version: info.version });
    if (notifPrefs.update) {
      new Notification({
        title: 'Mojo Gaming Mode',
        body: `v${info.version} is available. Open the app to download.`,
        icon: path.join(ASSETS_PATH, 'icons', 'icon.ico')
      }).show();
    }
  });

  autoUpdater.on('update-not-available', () => {
    if (mainWindow && !mainWindow.isDestroyed())
      mainWindow.webContents.send('updater-status', { status: 'up-to-date' });
  });

  autoUpdater.on('download-progress', (progress) => {
    if (mainWindow && !mainWindow.isDestroyed())
      mainWindow.webContents.send('updater-status', {
        status: 'downloading',
        percent: Math.round(progress.percent)
      });
  });

  autoUpdater.on('update-downloaded', (info) => {
    if (mainWindow && !mainWindow.isDestroyed())
      mainWindow.webContents.send('updater-status', { status: 'downloaded', version: info.version });
  });

  autoUpdater.on('error', (err) => {
    const isCheckError = err.message?.includes('latest.yml') || err.message?.includes('404');
    if (!isCheckError && mainWindow && !mainWindow.isDestroyed())
      mainWindow.webContents.send('updater-status', { status: 'error', message: err.message });
  });
}

ipcMain.on('preset-changed', (e, preset) => {
  currentPreset = preset;
  updateTrayMenu();
});

ipcMain.handle('check-for-updates', async () => {
  try {
    await autoUpdater.checkForUpdates();
    return { success: true };
  } catch(e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('download-update', async () => {
  try {
    await autoUpdater.downloadUpdate();
    return { ok: true };
  } catch(e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('install-update', async () => {
  await revertOnExit();
  autoUpdater.quitAndInstall(false, true);
});

ipcMain.on('metrics-start', () => {
  metrics.start((data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('metrics-data', data);
    }
  });
});

ipcMain.on('metrics-stop', () => {
  metrics.stop();
});

ipcMain.handle('get-metrics-snapshot', async () => {
  try {
    return await metrics.getSnapshot();
  } catch (e) {
    return null;
  }
});

ipcMain.handle('get-ping-snapshot', async () => {
  try {
    return await metrics.getPingSnapshot();
  } catch (e) {
    return null;
  }
});

ipcMain.handle('find-process-path', async (e, processName) => {
  try {
    const safe = String(processName || '').replace(/'/g, "''");
    const result = await runPS(`(Get-Process -Name '${safe}' -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Path)`);
    const p = (result.output || '').trim();
    if (result.success && p) return { path: p };
    return { path: null };
  } catch (e) {
    return { path: null };
  }
});

ipcMain.handle('browse-for-exe', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select executable',
      filters: [{ name: 'Executable', extensions: ['exe'] }],
      properties: ['openFile']
    });
    if (result.canceled || !result.filePaths.length) return { canceled: true };
    return { canceled: false, filePath: result.filePaths[0] };
  } catch (e) {
    return { canceled: true, error: e.message };
  }
});

ipcMain.handle('export-custom-rules', async (e, jsonContent) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Custom Rules',
      defaultPath: 'mgm-custom-rules.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    if (result.canceled || !result.filePath) return { success: false, canceled: true };
    fs.writeFileSync(result.filePath, jsonContent, 'utf8');
    return { success: true, path: result.filePath };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('import-custom-rules', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Import Custom Rules',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile']
    });
    if (result.canceled || !result.filePaths.length) return { success: false, canceled: true };
    const content = fs.readFileSync(result.filePaths[0], 'utf8');
    return { success: true, content };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.on('ping-start', () => {
  metrics.startPing((data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('ping-data', data);
    }
  });
});

ipcMain.on('ping-stop', () => {
  metrics.stopPing();
});

ipcMain.on('set-mini-mode', (e, enabled) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (enabled) {
    // Must lower the minimum size FIRST — Electron clamps setSize() to
    // whatever minWidth/minHeight is currently set, so without this the
    // window stayed stuck at the normal-mode minimum (760x580) instead of
    // shrinking down to the mini-mode size.
    mainWindow.setMinimumSize(MINI_SIZE.width, MINI_SIZE.height);
    mainWindow.setSize(MINI_SIZE.width, MINI_SIZE.height);
    mainWindow.setResizable(false);
    // Mini-mode is meant to float over a game, so keep it on top
    mainWindow.setAlwaysOnTop(true, 'floating');
  } else {
    mainWindow.setMinimumSize(NORMAL_MIN_SIZE.width, NORMAL_MIN_SIZE.height);
    mainWindow.setSize(NORMAL_SIZE.width, NORMAL_SIZE.height);
    mainWindow.setResizable(true);
    mainWindow.setAlwaysOnTop(false);
  }
});

ipcMain.on('set-bar-mode', (e, enabled) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (enabled) {
    mainWindow.setMinimumSize(BAR_SIZE.width, BAR_SIZE.height);
    mainWindow.setSize(BAR_SIZE.width, BAR_SIZE.height);
    mainWindow.setResizable(false);
    mainWindow.setAlwaysOnTop(true, 'floating');
    // Start centered near the top of the primary display; the user can
    // then drag it wherever they like for the rest of the session.
    const display = screen.getPrimaryDisplay();
    const x = Math.round(display.workArea.x + (display.workArea.width - BAR_SIZE.width) / 2);
    const y = display.workArea.y + 12;
    mainWindow.setPosition(x, y);
  } else {
    mainWindow.setMinimumSize(NORMAL_MIN_SIZE.width, NORMAL_MIN_SIZE.height);
    mainWindow.setSize(NORMAL_SIZE.width, NORMAL_SIZE.height);
    mainWindow.setResizable(true);
    mainWindow.setAlwaysOnTop(false);
  }
});

ipcMain.on('set-window-opacity', (e, value) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const v = Math.min(1, Math.max(0.3, value));
  mainWindow.setOpacity(v);
  const cfg = loadConfig();
  cfg.windowOpacity = v;
  saveConfig(cfg);
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.hide();
});

// Auto-revert on app quit (tray Quit or system shutdown)
async function revertOnExit() {
  if (gamingModeActive && (activeTweakIds.length > 0 || activeCustomRules.length > 0)) {
    try {
      if (activeTweakIds.length > 0) {
        const results = await executeTweaks([...activeTweakIds], TWEAK_DEFINITIONS, 'revert');
        const failed = results.filter(r => !r.success && !r.skipped);
        if (failed.length) console.error('revertOnExit: failed to revert tweaks:', failed.map(r => r.id + ' (' + r.error + ')').join(', '));
      }
      if (activeCustomRules.length > 0) {
        const ruleResults = await executeCustomRules(activeCustomRules, 'revert');
        const ruleFailed = ruleResults.filter(r => !r.success && !r.skipped);
        if (ruleFailed.length) console.error('revertOnExit: failed to revert custom rules:', ruleFailed.map(r => r.id + ' (' + r.error + ')').join(', '));
      }
      activeTweakIds = [];
      activeCustomRules = [];
      gamingModeActive = false;
      // Save inactive state to config
      const config = loadConfig();
      config.wasActive = false;
      config.activeCustomRules = [];
      saveConfig(config);
    } catch(e) {
      console.error('revertOnExit threw:', e.message);
    }
  }
}

app.on('before-quit', async (e) => {
  if (gamingModeActive && (activeTweakIds.length > 0 || activeCustomRules.length > 0)) {
    e.preventDefault();
    await revertOnExit();
    app.exit(0);
  }
});

ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});
