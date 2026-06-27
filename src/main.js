'use strict';

const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');
const ASSETS_PATH = path.join(__dirname, '..', 'assets');

let mainWindow = null;
let tray = null;
let gamingModeActive = false;
let detectedGPU = { vendor: 'nvidia', model: 'Unknown GPU' };

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
        app.exit(0);
      }
    }
  ]);
  tray.setContextMenu(menu);
}

// Suppress GPU cache errors when running as Administrator
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('no-sandbox');

app.whenReady().then(async () => {
  detectedGPU = await detectGPU();
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

app.on('activate', () => {
  if (!mainWindow) createWindow();
});

// IPC handlers

ipcMain.handle('get-gpu-info', () => detectedGPU);

ipcMain.handle('get-config', () => loadConfig());

ipcMain.handle('save-config', (e, config) => saveConfig(config));

ipcMain.handle('apply-mode', (e, config) => {
  gamingModeActive = true;
  updateTrayMenu();
  if (tray) {
    const onIcon = nativeImage.createFromPath(path.join(ASSETS_PATH, 'icons', 'tray-on.png'));
    tray.setImage(onIcon);
    tray.setToolTip('Mojo Gaming Mode — ACTIVE');
  }
  // PowerShell execution comes in v0.2.0
  return { success: true };
});

ipcMain.handle('revert-mode', () => {
  gamingModeActive = false;
  updateTrayMenu();
  if (tray) {
    const offIcon = nativeImage.createFromPath(path.join(ASSETS_PATH, 'icons', 'tray-off.png'));
    tray.setImage(offIcon);
    tray.setToolTip('Mojo Gaming Mode');
  }
  // PowerShell revert comes in v0.2.0
  return { success: true };
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.hide();
});

ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});
