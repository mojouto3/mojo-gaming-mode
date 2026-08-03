'use strict';

const { app } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

// PresentMon (Intel, MIT licensed, github.com/GameTechDev/PresentMon) captures
// frame-presentation timing via ETW - no DLL injection into the game process,
// so no anti-cheat false-positive risk. Bundled as a standalone console exe
// under resources/presentmon/, spawned the same way src/metrics.js already
// spawns nvidia-smi. Requires administrator privilege for the ETW trace
// session - not a new constraint, MGM already runs elevated.
function getExePath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'presentmon', 'PresentMon-2.5.1-x64.exe')
    : path.join(__dirname, '..', 'resources', 'presentmon', 'PresentMon-2.5.1-x64.exe');
}

let pmProcess = null;
let onDataCallback = null;
let emitInterval = null;
let frameTimesMs = [];
let headerCols = null;
let msBetweenPresentsIdx = -1;

// Parsed once from the first CSV line PresentMon writes, rather than
// hardcoding a column position - column set/order can vary by version or
// flags, but the header name is stable.
function parseHeader(cols) {
  headerCols = cols;
  msBetweenPresentsIdx = cols.indexOf('MsBetweenPresents');
}

function start(processName, callback) {
  if (pmProcess) return;
  onDataCallback = callback;
  frameTimesMs = [];
  headerCols = null;
  msBetweenPresentsIdx = -1;

  pmProcess = spawn(getExePath(), [
    '--process_name', processName,
    '--output_stdout',
    '--no_console_stats'
  ], {
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'ignore']
  });

  let buffer = '';
  pmProcess.stdout.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop();
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const parts = trimmed.split(',');
      if (!headerCols) {
        parseHeader(parts);
        return;
      }
      if (msBetweenPresentsIdx === -1) return;
      const ms = parseFloat(parts[msBetweenPresentsIdx]);
      if (!isNaN(ms) && ms > 0) frameTimesMs.push(ms);
    });
  });

  pmProcess.on('error', () => {
    pmProcess = null;
  });

  pmProcess.on('close', () => {
    pmProcess = null;
  });

  // Frames arrive far more often than once per second at real framerates
  // (60-240+/sec) - aggregate to a single smoothed value per second instead
  // of pushing raw per-frame noise up through IPC.
  emitInterval = setInterval(() => {
    if (!onDataCallback) return;
    if (!frameTimesMs.length) {
      onDataCallback({ fps: null, frameTimeMs: null });
      return;
    }
    const avgMs = frameTimesMs.reduce((a, b) => a + b, 0) / frameTimesMs.length;
    onDataCallback({
      fps: Math.round(1000 / avgMs),
      frameTimeMs: Math.round(avgMs * 10) / 10
    });
    frameTimesMs = [];
  }, 1000);
}

function stop() {
  if (emitInterval) {
    clearInterval(emitInterval);
    emitInterval = null;
  }
  if (pmProcess) {
    pmProcess.kill();
    pmProcess = null;
  }
  onDataCallback = null;
  frameTimesMs = [];
}

module.exports = { start, stop };
