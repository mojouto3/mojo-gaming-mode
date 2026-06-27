'use strict';

const { spawn } = require('child_process');

// Run PowerShell command completely hidden - no window, no flash
function runPS(command, requiresAdmin = false) {
  return new Promise((resolve) => {
    const encoded = Buffer.from(command, 'utf16le').toString('base64');

    let args;
    if (requiresAdmin) {
      // Wrap in Start-Process RunAs - still hidden via windowsHide
      const inner = `-NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand ${encoded}`;
      const wrapper = `Start-Process powershell.exe -ArgumentList "${inner}" -Verb RunAs -Wait -WindowStyle Hidden`;
      const wrapperEncoded = Buffer.from(wrapper, 'utf16le').toString('base64');
      args = ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', wrapperEncoded];
    } else {
      args = ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded];
    }

    const ps = spawn('powershell.exe', args, {
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

    // Timeout safety
    setTimeout(() => {
      ps.kill();
      resolve({ success: false, output: '', error: 'Timeout' });
    }, 30000);
  });
}

async function executeTweaks(tweakIds, tweak_definitions, mode = 'apply') {
  // Run all tweaks in parallel for speed
  const promises = tweakIds.map(async (id) => {
    const def = tweak_definitions[id];
    if (!def) return { id, success: false, error: 'Unknown tweak' };

    const command = mode === 'apply' ? def.applyCmd : def.revertCmd;
    if (!command) return { id, success: true, skipped: true };

    try {
      const result = await runPS(command, def.requiresAdmin);
      return { id, success: result.success, error: result.error };
    } catch (e) {
      return { id, success: false, error: e.message };
    }
  });

  return Promise.all(promises);
}

module.exports = { runPS, executeTweaks };
