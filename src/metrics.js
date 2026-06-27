'use strict';

const { spawn } = require('child_process');

let psProcess = null;
let onDataCallback = null;
let isRunning = false;

const PS_SCRIPT = `
$ProgressPreference = 'SilentlyContinue'
while ($true) {
  $cpu = [math]::Round((Get-CimInstance -ClassName Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average, 1)
  $os = Get-CimInstance -ClassName Win32_OperatingSystem
  $ramTotal = [math]::Round($os.TotalVisibleMemorySize / 1MB, 1)
  $ramFree = [math]::Round($os.FreePhysicalMemory / 1MB, 1)
  $ramUsed = [math]::Round($ramTotal - $ramFree, 1)
  $ramPct = [math]::Round(($ramUsed / $ramTotal) * 100, 1)
  $gpu = Get-CimInstance -ClassName Win32_VideoController | Where-Object { $_.Name -notlike '*Virtual*' -and $_.Name -notlike '*Meta*' } | Select-Object -First 1
  $gpuName = if ($gpu) { $gpu.Name } else { 'Unknown' }
  $gpuVramTotal = if ($gpu) { [math]::Round($gpu.AdapterRAM / 1GB, 1) } else { 0 }
  $gpuUsage = 0
  $gpuVramUsed = 0
  $gpuVramPct = 0
  $nvidiaSmi = Get-Command 'nvidia-smi' -ErrorAction SilentlyContinue
  if ($nvidiaSmi) {
    $smi = & nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total --format=csv,noheader,nounits 2>$null
    if ($smi) {
      $parts = $smi.Trim().Split(',')
      if ($parts.Count -ge 3) {
        $gpuUsage = [int]$parts[0].Trim()
        $gpuVramUsed = [math]::Round([int]$parts[1].Trim() / 1024, 1)
        $gpuVramTotal = [math]::Round([int]$parts[2].Trim() / 1024, 1)
        $gpuVramPct = if ($gpuVramTotal -gt 0) { [math]::Round(($gpuVramUsed / $gpuVramTotal) * 100, 1) } else { 0 }
      }
    }
  }
  $result = @{ cpu=$cpu; ramPct=$ramPct; ramUsed=$ramUsed; ramTotal=$ramTotal; gpuName=$gpuName; gpuUsage=$gpuUsage; gpuVramUsed=$gpuVramUsed; gpuVramTotal=$gpuVramTotal; gpuVramPct=$gpuVramPct } | ConvertTo-Json -Compress
  Write-Output $result
  Start-Sleep -Seconds 2
}
`;

function start(callback) {
  if (isRunning) return;
  isRunning = true;
  onDataCallback = callback;

  const encoded = Buffer.from(PS_SCRIPT, 'utf16le').toString('base64');
  psProcess = spawn('powershell.exe', [
    '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
    '-EncodedCommand', encoded
  ], {
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'ignore']
  });

  let buffer = '';
  psProcess.stdout.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop();
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      try {
        const parsed = JSON.parse(trimmed);
        if (onDataCallback) onDataCallback(parsed);
      } catch (e) {}
    });
  });

  psProcess.on('close', () => {
    isRunning = false;
    psProcess = null;
  });
}

function stop() {
  if (psProcess) {
    psProcess.kill();
    psProcess = null;
  }
  isRunning = false;
  onDataCallback = null;
}

module.exports = { start, stop };
