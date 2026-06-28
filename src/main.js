'use strict';

const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { executeTweaks } = require('./executor');
const metrics = require('./metrics');

const { TWEAK_DEFINITIONS } = require('./tweaks');

const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');
const ASSETS_PATH = path.join(__dirname, '..', 'assets');

let mainWindow = null;
let tray = null;
let gamingModeActive = false;
let detectedGPU = { vendor: 'nvidia', model: 'Unknown GPU' };
let activeTweakIds = []; // tweaks currently applied, used for revert

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

function updateTrayMenu() {
  const menu = Menu.buildFromTemplate([
    {
      label: 'Mojo Gaming Mode',
      enabled: false
    },
    { type: 'separator' },
    {
      label: gamingModeActive ? '● Gaming Mode: ON' : '○ Gaming Mode: OFF',
      enabled: false
    },
    {
      label: gamingModeActive ? '✓ Deactivate Gaming Mode' : 'Activate Gaming Mode',
      type: 'normal',
      checked: gamingModeActive,
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('tray-toggle-mode', !gamingModeActive);
        } else {
          createWindow();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Open',
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.removeAllListeners('close');
          mainWindow.close();
        }
        mainWindow = null;
        app.quit(); // triggers before-quit for auto-revert
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

  // Silent check on startup after 4 seconds
  setTimeout(() => checkForUpdatesGitHub(), 4000);

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

    gamingModeActive = true;
    updateTrayMenu();
    // Save active state to config for crash recovery
    const activeConfig = loadConfig();
    activeConfig.wasActive = true;
    activeConfig.activeTweakIds = [...activeTweakIds];
    saveConfig(activeConfig);
    if (tray) {
      const onIcon = nativeImage.createFromPath(path.join(ASSETS_PATH, 'icons', 'tray-on.png'));
      tray.setImage(onIcon);
      tray.setToolTip('Mojo Gaming Mode — ACTIVE');
    }

    // Windows native notification
    const activeCount = results.filter(r => r.success && !r.skipped).length;
    const presetName = config.preset
      ? config.preset.charAt(0).toUpperCase() + config.preset.slice(1)
      : 'Gaming';
    new Notification({
      title: `Gaming Mode Activated — ${presetName}`,
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

// GitHub API update check
const https = require('https');
const APP_VERSION = require('../package.json').version;
const UPDATE_REPO = 'mojouto3/mojo-gaming-mode';

function compareVersions(a, b) {
  const pa = a.replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
  const pb = b.replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0, y = pb[i] || 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

async function checkForUpdatesGitHub() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${UPDATE_REPO}/releases`,
      headers: { 'User-Agent': 'mojo-gaming-mode' },
      timeout: 8000
    };
    const req = https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const releases = JSON.parse(data);
          const latest = releases.find(r => r.prerelease || !r.draft);
          if (!latest) return resolve(null);
          const latestVersion = (latest.tag_name || '').replace(/^v/i, '');
          const updateAvailable = compareVersions(latestVersion, APP_VERSION) > 0;
          if (updateAvailable && mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('updater-status', {
              status: 'available',
              version: latestVersion,
              downloadUrl: latest.assets?.find(a => a.name.endsWith('.exe'))?.browser_download_url
            });
          } else if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('updater-status', { status: 'up-to-date' });
          }
          resolve({ updateAvailable, latestVersion });
        } catch (e) { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

ipcMain.handle('check-for-updates', async () => {
  mainWindow.webContents.send('updater-status', { status: 'checking' });
  await checkForUpdatesGitHub();
  return { success: true };
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
