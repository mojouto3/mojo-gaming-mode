'use strict';

const { spawn } = require('child_process');

let psProcess = null;
let onDataCallback = null;
let isRunning = false;

const PS_SCRIPT = `
$ProgressPreference = 'SilentlyContinue'
while ($true) {
  # Win32_Processor.LoadPercentage only reflects the first core of each
  # physical processor, not true overall usage (confirmed: pinning load to
  # different cores gives wildly different readings for the same real load).
  # Use the same Performance Counter Task Manager itself reads from instead.
  $cpuSample = Get-Counter '\\Processor(_Total)\\% Processor Time' -SampleInterval 1 -MaxSamples 2 -ErrorAction SilentlyContinue
  $cpu = if ($cpuSample) { [math]::Round($cpuSample.CounterSamples[-1].CookedValue, 1) } else { 0 }
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
  $gpuTemp = 0
  if ($nvidiaSmi) {
    $smi = & nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total,temperature.gpu --format=csv,noheader,nounits 2>$null
    if ($smi) {
      $parts = $smi.Trim().Split(',')
      if ($parts.Count -ge 4) {
        $gpuUsage = [int]$parts[0].Trim()
        $gpuVramUsed = [math]::Round([int]$parts[1].Trim() / 1024, 1)
        $gpuVramTotal = [math]::Round([int]$parts[2].Trim() / 1024, 1)
        $gpuVramPct = if ($gpuVramTotal -gt 0) { [math]::Round(($gpuVramUsed / $gpuVramTotal) * 100, 1) } else { 0 }
        $gpuTemp = [int]$parts[3].Trim()
      }
    }
  } else {
    # AMD/Intel: use Windows' native GPU Engine performance counters, the
    # same data source Task Manager's GPU graph uses, works across all vendors
    Try {
      $counters = Get-Counter '\\GPU Engine(*engtype_3D)\\Utilization Percentage' -ErrorAction SilentlyContinue
      if ($counters) {
        $sum = ($counters.CounterSamples | Where-Object { $_.CookedValue -gt 0 } | Measure-Object -Property CookedValue -Sum).Sum
        $gpuUsage = [math]::Round($sum, 0)
        if ($gpuUsage -gt 100) { $gpuUsage = 100 }
      }
    } Catch {}
    # Try AMD/Intel via WMI MSAcpi_ThermalZoneTemperature (approximate)
    Try {
      $temp = Get-CimInstance -Namespace root/WMI -ClassName MSAcpi_ThermalZoneTemperature -ErrorAction SilentlyContinue | Select-Object -First 1
      if ($temp) { $gpuTemp = [math]::Round(($temp.CurrentTemperature / 10) - 273.15, 0) }
    } Catch {}
  }
  $result = @{ cpu=$cpu; ramPct=$ramPct; ramUsed=$ramUsed; ramTotal=$ramTotal; gpuName=$gpuName; gpuUsage=$gpuUsage; gpuVramUsed=$gpuVramUsed; gpuVramTotal=$gpuVramTotal; gpuVramPct=$gpuVramPct; gpuTemp=$gpuTemp } | ConvertTo-Json -Compress
  Write-Output $result
  Start-Sleep -Seconds 1
}
`;

const PS_SNAPSHOT_SCRIPT = `
$ProgressPreference = 'SilentlyContinue'
$cpuSample = Get-Counter '\\Processor(_Total)\\% Processor Time' -SampleInterval 1 -MaxSamples 2 -ErrorAction SilentlyContinue
$cpu = if ($cpuSample) { [math]::Round($cpuSample.CounterSamples[-1].CookedValue, 1) } else { 0 }
$os = Get-CimInstance -ClassName Win32_OperatingSystem
$ramTotal = [math]::Round($os.TotalVisibleMemorySize / 1MB, 1)
$ramFree = [math]::Round($os.FreePhysicalMemory / 1MB, 1)
$ramUsed = [math]::Round($ramTotal - $ramFree, 1)
$ramPct = [math]::Round(($ramUsed / $ramTotal) * 100, 1)
$gpuUsage = 0
$nvidiaSmi = Get-Command 'nvidia-smi' -ErrorAction SilentlyContinue
if ($nvidiaSmi) {
  $smi = & nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits 2>$null
  if ($smi) { $gpuUsage = [int]$smi.Trim() }
}
$result = @{ cpu=$cpu; ramPct=$ramPct; ramUsed=$ramUsed; ramTotal=$ramTotal; gpuUsage=$gpuUsage } | ConvertTo-Json -Compress
Write-Output $result
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

const PING_TARGET = '8.8.8.8';
const PS_PING_SCRIPT = `
$ProgressPreference = 'SilentlyContinue'
while ($true) {
  $ping = 0
  Try {
    $result = Test-Connection -ComputerName ${PING_TARGET} -Count 1 -ErrorAction SilentlyContinue
    if ($result) { $ping = [int]$result.ResponseTime }
  } Catch {}
  $result = @{ ping=$ping } | ConvertTo-Json -Compress
  Write-Output $result
  Start-Sleep -Seconds 3
}
`;

let pingProcess = null;
let onPingCallback = null;
let pingRunning = false;

function startPing(callback) {
  if (pingRunning) return;
  pingRunning = true;
  onPingCallback = callback;

  const encoded = Buffer.from(PS_PING_SCRIPT, 'utf16le').toString('base64');
  pingProcess = spawn('powershell.exe', [
    '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
    '-EncodedCommand', encoded
  ], {
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'ignore']
  });

  let buffer = '';
  pingProcess.stdout.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop();
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      try {
        const parsed = JSON.parse(trimmed);
        if (onPingCallback) onPingCallback(parsed);
      } catch (e) {}
    });
  });

  pingProcess.on('close', () => {
    pingRunning = false;
    pingProcess = null;
  });
}

function stopPing() {
  if (pingProcess) {
    pingProcess.kill();
    pingProcess = null;
  }
  pingRunning = false;
  onPingCallback = null;
}

const PS_PING_SNAPSHOT_SCRIPT = `
$ProgressPreference = 'SilentlyContinue'
$ping = 0
Try {
  $result = Test-Connection -ComputerName ${PING_TARGET} -Count 1 -ErrorAction SilentlyContinue
  if ($result) { $ping = [int]$result.ResponseTime }
} Catch {}
$result = @{ ping=$ping } | ConvertTo-Json -Compress
Write-Output $result
`;

function getPingSnapshot() {
  return new Promise((resolve, reject) => {
    const encoded = Buffer.from(PS_PING_SNAPSHOT_SCRIPT, 'utf16le').toString('base64');
    const snap = spawn('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
      '-EncodedCommand', encoded
    ], {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'ignore']
    });

    let output = '';
    const timeout = setTimeout(() => {
      snap.kill();
      reject(new Error('ping snapshot timed out'));
    }, 6000);

    snap.stdout.on('data', (data) => { output += data.toString(); });

    snap.on('close', () => {
      clearTimeout(timeout);
      try {
        resolve(JSON.parse(output.trim()));
      } catch (e) {
        reject(e);
      }
    });

    snap.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
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

function getSnapshot() {
  return new Promise((resolve, reject) => {
    const encoded = Buffer.from(PS_SNAPSHOT_SCRIPT, 'utf16le').toString('base64');
    const snap = spawn('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
      '-EncodedCommand', encoded
    ], {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'ignore']
    });

    let output = '';
    const timeout = setTimeout(() => {
      snap.kill();
      reject(new Error('metrics snapshot timed out'));
    }, 6000);

    snap.stdout.on('data', (data) => { output += data.toString(); });

    snap.on('close', () => {
      clearTimeout(timeout);
      try {
        resolve(JSON.parse(output.trim()));
      } catch (e) {
        reject(e);
      }
    });

    snap.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

module.exports = { start, stop, getSnapshot, startPing, stopPing, getPingSnapshot };
