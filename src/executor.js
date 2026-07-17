'use strict';

const { spawn } = require('child_process');

// Run PowerShell command silently.
// App already runs as Administrator via manifest, so no elevation needed.
function runPS(command) {
  return new Promise((resolve) => {
    const encoded = Buffer.from(command, 'utf16le').toString('base64');

    const ps = spawn('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-WindowStyle', 'Hidden',
      '-ExecutionPolicy', 'Bypass',
      '-EncodedCommand', encoded
    ], {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false
    });

    let stdout = '';
    let stderr = '';
    ps.stdout.on('data', d => stdout += d);
    ps.stderr.on('data', d => stderr += d);

    ps.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, output: stdout, error: null });
      } else {
        resolve({ success: false, output: stdout, error: stderr || `Exit code ${code}` });
      }
    });

    ps.on('error', (err) => {
      resolve({ success: false, output: '', error: err.message });
    });

    setTimeout(() => {
      try { ps.kill(); } catch(e) {}
      resolve({ success: false, output: '', error: 'Timeout' });
    }, 30000);
  });
}

async function executeTweaks(tweakIds, tweak_definitions, mode = 'apply') {
  const promises = tweakIds.map(async (id) => {
    const def = tweak_definitions[id];
    if (!def) return { id, success: false, error: 'Unknown tweak' };

    const command = mode === 'apply' ? def.applyCmd : def.revertCmd;
    if (!command) return { id, success: true, skipped: true };

    try {
      const result = await runPS(command);
      return { id, success: result.success, error: result.error };
    } catch (e) {
      return { id, success: false, error: e.message };
    }
  });

  return Promise.all(promises);
}

// Escape a value for use inside a single-quoted PowerShell string.
// User-created custom rules take free-text process/service names, so this
// is needed to avoid a stray quote breaking (or injecting into) the command.
function psEscape(str) {
  return String(str).replace(/'/g, "''");
}

const SC_START_MAP = { Auto: 'auto', Manual: 'demand', Disabled: 'disabled', Boot: 'boot', System: 'system' };

// Executes a single user-created custom rule (Kill process / CPU priority /
// Disable service) with real success/failure tracking, unlike the old
// fire-and-forget pattern. Returns capturedStartType for 'service' rules on
// apply, so the caller can persist it and use the real original value on
// revert instead of guessing.
async function executeCustomRule(rule, mode) {
  const target = psEscape((rule.target || '').replace(/\.exe$/i, ''));
  let command;

  if (rule.type === 'kill') {
    if (mode === 'apply') {
      command = `Get-Process -Name '${target}' -ErrorAction SilentlyContinue | Stop-Process -Force; Exit 0`;
    } else {
      if (rule.reopenOnDeactivate && rule.exePath) {
        const exePath = psEscape(rule.exePath);
        command = `If (Test-Path '${exePath}') { Start-Process '${exePath}' -ErrorAction SilentlyContinue }; Exit 0`;
      } else {
        return { id: rule.name, success: true, skipped: true };
      }
    }
  } else if (rule.type === 'priority') {
    const priority = mode === 'apply' ? 'High' : 'Normal';
    command = `Get-Process -Name '${target}' -ErrorAction SilentlyContinue | ForEach-Object { $_.PriorityClass = '${priority}' }; Exit 0`;
  } else if (rule.type === 'service') {
    if (mode === 'apply') {
      command = `$svc = Get-CimInstance Win32_Service -Filter "Name='${target}'" -ErrorAction SilentlyContinue; $startMode = if ($svc) { $svc.StartMode } else { 'Manual' }; Stop-Service -Name '${target}' -Force -ErrorAction SilentlyContinue; Set-Service -Name '${target}' -StartupType Disabled -ErrorAction SilentlyContinue; Write-Output $startMode`;
    } else {
      const scStart = SC_START_MAP[rule.capturedStartType] || 'demand';
      command = `sc.exe config "${target}" start= ${scStart}; sc.exe start "${target}"; Exit 0`;
    }
  } else {
    return { id: rule.name, success: false, error: 'Unknown rule type: ' + rule.type };
  }

  try {
    const result = await runPS(command);
    const out = { id: rule.name, success: result.success, error: result.error };
    if (rule.type === 'service' && mode === 'apply' && result.success) {
      const captured = (result.output || '').trim();
      if (captured) out.capturedStartType = captured;
    }
    return out;
  } catch (e) {
    return { id: rule.name, success: false, error: e.message };
  }
}

async function executeCustomRules(rules, mode = 'apply') {
  const results = [];
  for (const rule of rules) {
    results.push(await executeCustomRule(rule, mode));
  }
  return results;
}

module.exports = { runPS, executeTweaks, executeCustomRule, executeCustomRules };
