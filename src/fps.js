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
// against them.
//
// Ordinary desktop apps (browsers, editors, chat clients) DO still present
// real frames via DXGI, just sparsely and irregularly since they only
// redraw on interaction rather than running a continuous render loop - that
// shows up as a low, jittery, misleading "FPS" number and a scary-looking
// red/danger color for something that was never a game to begin with. There
// is no reliable "is this a game" API to check instead, so the practical
// fix is excluding the common non-game apps a gaming PC is actually likely
// to have in the foreground - not exhaustive (no blocklist ever is), but
// covers the overwhelming majority of cases. The Custom Rules list (already
// maintained for a related reason - closing background apps during gaming)
// doubles as a solid base set here, since virtually everything on it is a
// companion/utility app, never a game itself.
const OWN_PROCESS_NAMES = ['Mojo Gaming Mode', 'electron'];
const EXCLUDED_PROCESS_NAMES = [
  // Shell / desktop
  'explorer', 'SearchHost', 'ShellExperienceHost', 'StartMenuExperienceHost', 'SnippingTool',
  // Browsers
  'chrome', 'firefox', 'msedge', 'opera', 'brave', 'vivaldi',
  // Editors, IDEs, terminals
  'Code', 'devenv', 'sublime_text', 'notepad++', 'notepad', 'idea64', 'pycharm64',
  'WindowsTerminal', 'cmd', 'powershell', 'pwsh', 'conhost',
  // Office
  'WINWORD', 'EXCEL', 'POWERPNT', 'OUTLOOK',
  // AI assistants / chat tools
  'claude', 'ChatGPT',
  // Same companion/utility apps already targeted by Custom Rules (chat,
  // launchers, cloud sync, peripheral managers) - see renderer/js/tweaks.js
  'Teams', 'PhoneExperienceHost', 'Copilot', 'Widgets', 'EpicGamesLauncher',
  'EABackgroundService', 'EADesktop', 'Spotify', 'Battle.net', 'UbisoftConnect',
  'GalaxyClient', 'XboxApp', 'RockstarService', 'slack', 'Zoom', 'WhatsApp',
  'Telegram', 'GoogleDriveFS', 'Dropbox', 'MinecraftLauncher', 'iTunes',
  'RiotClientServices', 'OneDrive', 'iCloudDrive', 'Viber', 'Signal', 'Messenger',
  'Box', 'MEGAsync', 'pCloud', 'Razer Synapse Service', 'RzSynapse', 'lghub',
  'lghub_agent', 'iCUE', 'SteelSeriesGG', 'NZXT CAM'
];

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
let onDebugCallback = null;
let emitInterval = null;
let frameTimesMs = [];
let headerCols = null;
let msBetweenPresentsIdx = -1;
let currentTarget = null;

// 1% lows need more than a single second of samples to mean anything (at
// 60fps that's only ~1 worst frame) - a rolling window gives a stable
// enough sample size while still reflecting recent performance rather than
// the whole session.
const ONE_PCT_LOW_WINDOW_MS = 10000;
let rollingFrames = []; // { t: Date.now(), ms: frameTimeMs }

function computeOnePercentLow(now) {
  rollingFrames = rollingFrames.filter((f) => now - f.t <= ONE_PCT_LOW_WINDOW_MS);
  if (!rollingFrames.length) return null;
  const worstCount = Math.max(1, Math.ceil(rollingFrames.length * 0.01));
  const worstMs = rollingFrames
    .map((f) => f.ms)
    .sort((a, b) => b - a)
    .slice(0, worstCount);
  const avgWorstMs = worstMs.reduce((a, b) => a + b, 0) / worstMs.length;
  return Math.round(1000 / avgWorstMs);
}

function debugLog(msg) {
  if (onDebugCallback) onDebugCallback(msg);
}

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
  rollingFrames = [];
  headerCols = null;
  msBetweenPresentsIdx = -1;
  currentTarget = null;
}

function startCapture(processName) {
  currentTarget = processName;
  frameTimesMs = [];
  rollingFrames = [];
  headerCols = null;
  msBetweenPresentsIdx = -1;

  const exePath = getExePath();
  debugLog(`starting PresentMon for "${processName}" (${exePath})`);
  const thisProcess = spawn(exePath, [
    '--process_name', processName,
    '--output_stdout',
    '--no_console_stats',
    '--terminate_on_proc_exit',
    '--stop_existing_session'
  ], {
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  pmProcess = thisProcess;

  let buffer = '';
  thisProcess.stdout.on('data', (data) => {
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
      if (!isNaN(ms) && ms > 0) {
        frameTimesMs.push(ms);
        rollingFrames.push({ t: Date.now(), ms });
      }
    });
  });

  thisProcess.stderr.on('data', (data) => {
    debugLog(`PresentMon stderr: ${data.toString().trim()}`);
  });
  thisProcess.on('error', (err) => {
    debugLog(`PresentMon spawn error: ${err.message}`);
    if (pmProcess !== thisProcess) return; // superseded by a newer capture, ignore
    pmProcess = null;
    stopCapture();
    if (onDataCallback) onDataCallback({ fps: null, frameTimeMs: null, fps1Low: null, processName: null });
  });
  thisProcess.on('close', (code) => {
    debugLog(`PresentMon exited (code ${code}) - target process likely closed`);
    if (pmProcess !== thisProcess) return; // superseded by a newer capture, ignore
    pmProcess = null;
    stopCapture();
    if (onDataCallback) onDataCallback({ fps: null, frameTimeMs: null, fps1Low: null, processName: null });
  });

  // Frames arrive far more often than once per second at real framerates
  // (60-240+/sec) - aggregate to a single smoothed value per second instead
  // of pushing raw per-frame noise up through IPC.
  emitInterval = setInterval(() => {
    if (!onDataCallback) return;
    const now = Date.now();
    const fps1Low = computeOnePercentLow(now);
    if (!frameTimesMs.length) {
      onDataCallback({ fps: null, frameTimeMs: null, fps1Low: null, processName: null });
      return;
    }
    const avgMs = frameTimesMs.reduce((a, b) => a + b, 0) / frameTimesMs.length;
    onDataCallback({
      fps: Math.round(1000 / avgMs),
      frameTimeMs: Math.round(avgMs * 10) / 10,
      fps1Low,
      processName: currentTarget
    });
    frameTimesMs = [];
  }, 1000);
}

function startTracking(callback, debugCallback) {
  onDebugCallback = debugCallback || null;
  if (foregroundProcess) {
    debugLog('startTracking called but foreground poller already running - ignored');
    return;
  }
  onDataCallback = callback;
  debugLog('starting foreground-window poller');

  const encoded = Buffer.from(FOREGROUND_POLL_SCRIPT, 'utf16le').toString('base64');
  foregroundProcess = spawn('powershell.exe', [
    '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
    '-EncodedCommand', encoded
  ], {
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe']
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
        // MGM itself (or the desktop/shell) took focus - e.g. the user tabbed
        // back to check the Performance tab. The previous game, if any, is
        // presumably still running in the background, so keep its capture
        // going instead of blanking the number the moment focus leaves it;
        // capture only stops when PresentMon itself reports the process gone
        // (see the 'close' handler in startCapture) or a different real
        // foreground app takes over below.
        if (!pmProcess) {
          debugLog(`foreground is "${name}" (excluded), no game running - no capture`);
          if (onDataCallback) onDataCallback({ fps: null, frameTimeMs: null, fps1Low: null, processName: null });
        } else {
          debugLog(`foreground is "${name}" (excluded) - keeping existing capture on "${currentTarget}"`);
        }
        return;
      }

      // Foreground app changed to something new - retarget capture.
      debugLog(`foreground changed to "${name}" - retargeting capture`);
      if (pmProcess) stopCapture();
      startCapture(name);
    });
  });

  foregroundProcess.stderr.on('data', (data) => {
    debugLog(`foreground poller stderr: ${data.toString().trim()}`);
  });
  foregroundProcess.on('error', (err) => {
    debugLog(`foreground poller spawn error: ${err.message}`);
    foregroundProcess = null;
  });
  foregroundProcess.on('close', (code) => {
    debugLog(`foreground poller exited (code ${code})`);
    foregroundProcess = null;
  });
}

function stopTracking() {
  stopCapture();
  if (foregroundProcess) {
    foregroundProcess.kill();
    foregroundProcess = null;
  }
  onDataCallback = null;
  onDebugCallback = null;
}

module.exports = { startTracking, stopTracking };
