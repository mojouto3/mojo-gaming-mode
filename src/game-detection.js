'use strict';

const { spawn } = require('child_process');

let gdProcess = null;
let onEventCallback = null;
let gdRunning = false;

function buildScript(processNames) {
  const namesLiteral = processNames.map(n => `'${n.replace(/'/g, "''")}'`).join(',');
  return `
$ProgressPreference = 'SilentlyContinue'
$targets = @(${namesLiteral})
$running = @{}
foreach ($t in $targets) { $running[$t] = $false }
while ($true) {
  foreach ($t in $targets) {
    $proc = Get-Process -Name $t -ErrorAction SilentlyContinue
    $isRunning = $null -ne $proc
    $wasRunning = $running[$t]
    if ($isRunning -and -not $wasRunning) {
      $result = @{ event='started'; process=$t } | ConvertTo-Json -Compress
      Write-Output $result
    } elseif (-not $isRunning -and $wasRunning) {
      $result = @{ event='stopped'; process=$t } | ConvertTo-Json -Compress
      Write-Output $result
    }
    $running[$t] = $isRunning
  }
  Start-Sleep -Seconds 5
}
`;
}

function start(processNames, callback) {
  if (gdRunning) return;
  if (!processNames || !processNames.length) return;
  gdRunning = true;
  onEventCallback = callback;

  const script = buildScript(processNames);
  const encoded = Buffer.from(script, 'utf16le').toString('base64');
  gdProcess = spawn('powershell.exe', [
    '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
    '-EncodedCommand', encoded
  ], {
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'ignore']
  });

  let buffer = '';
  gdProcess.stdout.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop();
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      try {
        const parsed = JSON.parse(trimmed);
        if (onEventCallback) onEventCallback(parsed);
      } catch (e) {}
    });
  });

  gdProcess.on('close', () => {
    gdRunning = false;
    gdProcess = null;
  });
}

function stop() {
  if (gdProcess) {
    gdProcess.kill();
    gdProcess = null;
  }
  gdRunning = false;
  onEventCallback = null;
}

module.exports = { start, stop };
