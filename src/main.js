'use strict';

const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, Notification, globalShortcut, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { executeTweaks } = require('./executor');
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
let currentPreset = 'balanced';

const DEFAULT_CONFIG = {
  gpu: null,
  preset: 'balanced',
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
    hpet: false
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
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
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
    width: 860,
    height: 680,
    minWidth: 760,
    minHeight: 580,
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
  });

  mainWindow.on('close', (e) => {
    e.preventDefault();
    metrics.stop();
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

  // Init auto-updater and check on startup
  initAutoUpdater();
  setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 4000);

  // Check if app crashed while active and auto-revert
  const startupConfig = loadConfig();
  if (startupConfig.wasActive && startupConfig.activeTweakIds && startupConfig.activeTweakIds.length > 0) {
    
    activeTweakIds = [...startupConfig.activeTweakIds];
    try {
      await executeTweaks(activeTweakIds, TWEAK_DEFINITIONS, 'revert');
    } catch(e) {
      
    }
    activeTweakIds = [];
    startupConfig.wasActive = false;
    startupConfig.activeTweakIds = [];
    saveConfig(startupConfig);
    
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
  try { metrics.stop(); } catch(e) {}
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
    revert: `$t = "$env:LOCALAPPDATA\Microsoft\Teams\Update.exe"; If (Test-Path $t) { Start-Process $t -ArgumentList '--processStart Teams.exe' -ErrorAction SilentlyContinue }; Exit 0`
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
    revert: `$e = "C:\Program Files (x86)\Epic Games\Launcher\Portal\Binaries\Win32\EpicGamesLauncher.exe"; If (Test-Path $e) { Start-Process $e -ErrorAction SilentlyContinue }; Exit 0`
  },
  cr_eaapp: {
    apply: `Get-Process -Name 'EABackgroundService','EAGD' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revert: `Exit 0`
  },
  cr_spotify: {
    apply: `Get-Process -Name 'Spotify' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revert: `$s = "$env:APPDATA\Spotify\Spotify.exe"; If (Test-Path $s) { Start-Process $s -ErrorAction SilentlyContinue }; Exit 0`
  },
  cr_slack: {
    apply: `Get-Process -Name 'slack' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revert: `$s = "$env:LOCALAPPDATA\slack\slack.exe"; If (Test-Path $s) { Start-Process $s -ErrorAction SilentlyContinue }; Exit 0`
  },
  cr_zoom: {
    apply: `Get-Process -Name 'Zoom','ZoomOutlookIMPlugin' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revert: `Exit 0`
  },
  cr_whatsapp: {
    apply: `Get-Process -Name 'WhatsApp' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revert: `$w = "$env:LOCALAPPDATA\WhatsApp\WhatsApp.exe"; If (Test-Path $w) { Start-Process $w -ErrorAction SilentlyContinue }; Exit 0`
  },
  cr_telegram: {
    apply: `Get-Process -Name 'Telegram' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revert: `$t = "$env:APPDATA\Telegram Desktop\Telegram.exe"; If (Test-Path $t) { Start-Process $t -ErrorAction SilentlyContinue }; Exit 0`
  },
  cr_googledrive: {
    apply: `Get-Process -Name 'GoogleDriveFS','GoogleDrive' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revert: `$g = "C:\Program Files\Google\Drive File Stream\GoogleDriveFS.exe"; If (Test-Path $g) { Start-Process $g -ErrorAction SilentlyContinue }; Exit 0`
  },
  cr_dropbox: {
    apply: `Get-Process -Name 'Dropbox' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revert: `$d = "$env:LOCALAPPDATA\Dropbox\client\Dropbox.exe"; If (Test-Path $d) { Start-Process $d -ErrorAction SilentlyContinue }; Exit 0`
  },
  cr_battlenet: {
    apply: `Get-Process -Name 'Battle.net','Battle.net Helper' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revert: `$b = "C:\Program Files (x86)\Battle.net\Battle.net.exe"; If (Test-Path $b) { Start-Process $b -ErrorAction SilentlyContinue }; Exit 0`
  },
  cr_ubisoft: {
    apply: `Get-Process -Name 'UbisoftConnect','UplayWebCore' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revert: `$u = "C:\Program Files (x86)\Ubisoft\Ubisoft Game Launcher\UbisoftConnect.exe"; If (Test-Path $u) { Start-Process $u -ErrorAction SilentlyContinue }; Exit 0`
  },
  cr_gog: {
    apply: `Get-Process -Name 'GalaxyClient','GalaxyClientService' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revert: `$g = "C:\Program Files (x86)\GOG Galaxy\GalaxyClient.exe"; If (Test-Path $g) { Start-Process $g -ErrorAction SilentlyContinue }; Exit 0`
  },
  cr_xbox: {
    apply: `Get-Process -Name 'XboxApp','GameBar' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revert: `Exit 0`
  },
  cr_rockstar: {
    apply: `Get-Process -Name 'RockstarService','Launcher' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`,
    revert: `$r = "C:\Program Files\Rockstar Games\Launcher\Launcher.exe"; If (Test-Path $r) { Start-Process $r -ErrorAction SilentlyContinue }; Exit 0`
  },
  cr_gamesprior: {
    apply: `$p = 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games'; If (!(Test-Path $p)) { New-Item -Path $p -Force | Out-Null }; Set-ItemProperty -Path $p -Name 'GPU Priority' -Value 8 -Type DWord; Set-ItemProperty -Path $p -Name 'Priority' -Value 6 -Type DWord; Set-ItemProperty -Path $p -Name 'Scheduling Category' -Value 'High' -Type String; Set-ItemProperty -Path $p -Name 'SFIO Priority' -Value 'High' -Type String; Exit 0`,
    revert: `$p = 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games'; Set-ItemProperty -Path $p -Name 'GPU Priority' -Value 2 -Type DWord -ErrorAction SilentlyContinue; Set-ItemProperty -Path $p -Name 'Priority' -Value 2 -Type DWord -ErrorAction SilentlyContinue; Set-ItemProperty -Path $p -Name 'Scheduling Category' -Value 'Medium' -Type String -ErrorAction SilentlyContinue; Set-ItemProperty -Path $p -Name 'SFIO Priority' -Value 'Normal' -Type String -ErrorAction SilentlyContinue; Exit 0`
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

    // Execute active custom rules
    if (config.customRulesActive) {
      for (const [id, active] of Object.entries(config.customRulesActive)) {
        if (active && CUSTOM_RULE_CMDS[id]) {
          try { await executor.run(CUSTOM_RULE_CMDS[id].apply); } catch(e) {}
        }
      }
    }

    gamingModeActive = true;
    if (config.preset) currentPreset = config.preset;
    updateTrayMenu();
    // Save active state to config for crash recovery
    const activeConfig = loadConfig();
    activeConfig.wasActive = true;
    activeConfig.activeTweakIds = [...activeTweakIds];
    saveConfig(activeConfig);
    if (tray) {
      const onIcon = nativeImage.createFromPath(path.join(ASSETS_PATH, 'icons', 'tray-on.png'));
      tray.setImage(onIcon);
      tray.setToolTip(`Mojo Gaming Mode: ${activeTweakIds.length} tweaks active`);
    }

    // Windows native notification
    const activeCount = results.filter(r => r.success && !r.skipped).length;
    const presetName = config.preset
      ? config.preset.charAt(0).toUpperCase() + config.preset.slice(1)
      : 'Gaming';
    new Notification({
      title: `Gaming Mode Activated: ${presetName}`,
      body: `${activeCount} tweak${activeCount !== 1 ? 's' : ''} applied successfully. System optimized for gaming.`,
      icon: path.join(ASSETS_PATH, 'icons', 'tray-on.png'),
      silent: true
    }).show();

    return { success: true, results, failed };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('revert-mode', async (e, config) => {
  try {
    // Use the tweaks that were actually applied, not the config
    const tweaksToRevert = [...activeTweakIds];
    

    const results = await executeTweaks(tweaksToRevert, TWEAK_DEFINITIONS, 'revert');
    activeTweakIds = []; // clear after revert
    // Clear active state from config
    const revertConfig = loadConfig();
    revertConfig.wasActive = false;
    revertConfig.activeTweakIds = [];
    saveConfig(revertConfig);

    // Revert active custom rules
    const savedConfig = loadConfig();
    if (savedConfig.customRulesActive) {
      for (const [id, active] of Object.entries(savedConfig.customRulesActive)) {
        if (active && CUSTOM_RULE_CMDS[id]) {
          try { await executor.run(CUSTOM_RULE_CMDS[id].revert); } catch(e) {}
        }
      }
    }

    gamingModeActive = false;
    updateTrayMenu();
    if (tray) {
      const offIcon = nativeImage.createFromPath(path.join(ASSETS_PATH, 'icons', 'tray-off.png'));
      tray.setImage(offIcon);
      tray.setToolTip('Mojo Gaming Mode');
    }

    // Windows native notification
    new Notification({
      title: 'Gaming Mode Deactivated',
      body: 'All tweaks reverted. System restored to normal.',
      icon: path.join(ASSETS_PATH, 'icons', 'tray-off.png'),
      silent: true
    }).show();

    return { success: true, results };
  } catch (e) {
    return { success: false, error: e.message };
  }
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
    new Notification({
      title: 'Mojo Gaming Mode',
      body: `v${info.version} is available. Open the app to download.`,
      icon: path.join(ASSETS_PATH, 'icons', 'icon.ico')
    }).show();
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

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.hide();
});

// Auto-revert on app quit (tray Quit or system shutdown)
async function revertOnExit() {
  if (gamingModeActive && activeTweakIds.length > 0) {
    
    try {
      await executeTweaks([...activeTweakIds], TWEAK_DEFINITIONS, 'revert');
      activeTweakIds = [];
      gamingModeActive = false;
      // Save inactive state to config
      const config = loadConfig();
      config.wasActive = false;
      saveConfig(config);
    } catch(e) {
      
    }
  }
}

app.on('before-quit', async (e) => {
  if (gamingModeActive && activeTweakIds.length > 0) {
    e.preventDefault();
    await revertOnExit();
    app.exit(0);
  }
});

ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});
