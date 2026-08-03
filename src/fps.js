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

// Deliberately independent of the user's curated Games list (that list is
// for auto-applying tweaks, a separate concern) - FPS tracks whatever is
// currently the foreground window, so it works for any game without the
// user having to add it anywhere first. Processes that clearly aren't games
// (our own window, the desktop) are skipped rather than spawning PresentMon
// against them; anything else that isn't actually presenting frames (e.g. a
// text editor) simply yields no frame data, which already surfaces as the
// normal "no game running" placeholder - no further heuristics needed.
const OWN_PROCESS_NAMES = ['Mojo Gaming Mode', 'electron'];
const EXCLUDED_PROCESS_NAMES = ['explorer', 'SearchHost', 'ShellExperienceHost', 'StartMenuExperienceHost'];

const FOREGROUND_POLL_SCRIPT = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class MgmWin32 {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
"@
while ($true) {
  Try {
    $hwnd = [MgmWin32]::GetForegroundWindow()
    $procId = 0
    [MgmWin32]::GetWindowThreadProcessId($hwnd, [ref]$procId) | Out-Null
    if ($procId -gt 0) {
      $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
      if ($proc) {
        $result = @{ processName = $proc.ProcessName } | ConvertTo-Json -Compress
        Write-Output $result
      }
    }
  } Catch {}
  Start-Sleep -Milliseconds 1500
}
`;

let foregroundProcess = null;
let pmProcess = null;
let onDataCallback = null;
let emitInterval = null;
let frameTimesMs = [];
let headerCols = null;
let msBetweenPresentsIdx = -1;
let currentTarget = null;

function parseHeader(cols) {
  headerCols = cols;
  msBetweenPresentsIdx = cols.indexOf('MsBetweenPresents');
}

function stopCapture() {
  if (emitInterval) {
    clearInterval(emitInterval);
    emitInterval = null;
  }
  if (pmProcess) {
    pmProcess.kill();
    pmProcess = null;
  }
  frameTimesMs = [];
  headerCols = null;
  msBetweenPresentsIdx = -1;
  currentTarget = null;
}

function startCapture(processName) {
  currentTarget = processName;
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

  pmProcess.on('error', () => { pmProcess = null; });
  pmProcess.on('close', () => { pmProcess = null; });

  // Frames arrive far more often than once per second at real framerates
  // (60-240+/sec) - aggregate to a single smoothed value per second instead
  // of pushing raw per-frame noise up through IPC.
  emitInterval = setInterval(() => {
    if (!onDataCallback) return;
    if (!frameTimesMs.length) {
      onDataCallback({ fps: null, frameTimeMs: null, processName: null });
      return;
    }
    const avgMs = frameTimesMs.reduce((a, b) => a + b, 0) / frameTimesMs.length;
    onDataCallback({
      fps: Math.round(1000 / avgMs),
      frameTimeMs: Math.round(avgMs * 10) / 10,
      processName: currentTarget
    });
    frameTimesMs = [];
  }, 1000);
}

function startTracking(callback) {
  if (foregroundProcess) return;
  onDataCallback = callback;

  const encoded = Buffer.from(FOREGROUND_POLL_SCRIPT, 'utf16le').toString('base64');
  foregroundProcess = spawn('powershell.exe', [
    '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
    '-EncodedCommand', encoded
  ], {
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'ignore']
  });

  let buffer = '';
  foregroundProcess.stdout.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop();
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      let parsed;
      try {
        parsed = JSON.parse(trimmed);
      } catch (e) {
        return;
      }
      const name = parsed.processName;
      if (!name || name === currentTarget) return;

      const isExcluded = OWN_PROCESS_NAMES.includes(name) || EXCLUDED_PROCESS_NAMES.includes(name);
      if (isExcluded) {
        if (pmProcess) stopCapture();
        if (onDataCallback) onDataCallback({ fps: null, frameTimeMs: null, processName: null });
        return;
      }

      // Foreground app changed to something new - retarget capture.
      if (pmProcess) stopCapture();
      startCapture(name);
    });
  });

  foregroundProcess.on('error', () => { foregroundProcess = null; });
  foregroundProcess.on('close', () => { foregroundProcess = null; });
}

function stopTracking() {
  stopCapture();
  if (foregroundProcess) {
    foregroundProcess.kill();
    foregroundProcess = null;
  }
  onDataCallback = null;
}

module.exports = { startTracking, stopTracking };
