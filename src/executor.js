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

module.exports = { runPS, executeTweaks };
