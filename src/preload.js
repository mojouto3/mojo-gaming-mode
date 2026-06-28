'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mgm', {
  getGPUInfo: () => ipcRenderer.invoke('get-gpu-info'),
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  createRestorePoint: () => ipcRenderer.invoke('create-restore-point'),
  setAutostart: (enabled) => ipcRenderer.invoke('set-autostart', enabled),
  applyMode: (config) => ipcRenderer.invoke('apply-mode', config),
  revertMode: () => ipcRenderer.invoke('revert-mode'),
  windowClose: () => ipcRenderer.send('window-close'),
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  onTrayToggle: (cb) => ipcRenderer.on('tray-toggle-mode', (e, val) => cb(val)),
  metricsStart: () => ipcRenderer.send('metrics-start'),
  metricsStop: () => ipcRenderer.send('metrics-stop'),
  onMetricsData: (cb) => ipcRenderer.on('metrics-data', (e, data) => cb(data)),
  onUpdateAvailable: (cb) => ipcRenderer.on('update-available', (e, version) => cb(version)),
  onUpdateDownloaded: (cb) => ipcRenderer.on('update-downloaded', (e, version) => cb(version))
});
