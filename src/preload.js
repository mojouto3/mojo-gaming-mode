'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mgm', {
  getGPUInfo: () => ipcRenderer.invoke('get-gpu-info'),
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  applyMode: (config) => ipcRenderer.invoke('apply-mode', config),
  revertMode: () => ipcRenderer.invoke('revert-mode'),
  windowClose: () => ipcRenderer.send('window-close'),
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  onTrayToggle: (cb) => ipcRenderer.on('tray-toggle-mode', (e, val) => cb(val))
});
