'use strict';

const state = {
  gpu: { vendor: 'nvidia', model: '' },
  preset: 'balanced',
  tweaks: {},
  manualOverrides: {},
  rules: [],
  active: false,
  sessions: 0,
  autostart: false,
  lastRestorePoint: null,
  lang: 'en',
  manualTheme: null
};

ALL_TWEAKS.forEach(t => { state.tweaks[t.id] = t.presets.balanced; });

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  bindEvents();

  try {
    // Get GPU info first so theme and sidebar are correct from the start
    const gpuInfo = await window.mgm.getGPUInfo();
    state.gpu = gpuInfo;
    applyGPUTheme(state.gpu.vendor);
    updateDetectedGPU(state.gpu.vendor, state.gpu.model);

    // Then load saved config
    const config = await window.mgm.getConfig();
    if (config.preset) {
      state.preset = config.preset;
    }
    // Always apply preset defaults first, then overlay manual overrides
    ALL_TWEAKS.forEach(t => { state.tweaks[t.id] = t.presets[state.preset]; });
    state.manualOverrides = config.manualOverrides || {};
    Object.assign(state.tweaks, state.manualOverrides);
    if (config.customRules) state.rules = config.customRules;
    if (config.autostart !== undefined) state.autostart = config.autostart;
    if (config.lastRestorePoint) state.lastRestorePoint = config.lastRestorePoint;
    if (config.lang) state.lang = config.lang;
    if (config.manualTheme) state.manualTheme = config.manualTheme;

    setPresetButtons(state.preset);
    applyLanguage(state.lang);
    if (state.manualTheme) applyGPUTheme(state.manualTheme);
    renderAll();
  } catch (e) {
    // Fallback - apply balanced defaults
    ALL_TWEAKS.forEach(t => { state.tweaks[t.id] = t.presets.balanced; });
    applyGPUTheme('nvidia');
    renderAll();
  }

  window.mgm.onTrayToggle((val) => {
    val ? applyMode() : revertMode();
  });

  // Live metrics listener
  window.mgm.onMetricsData((data) => {
    updateMetricsUI(data);
  });

  // Auto-updater notifications
  window.mgm.onUpdateAvailable((version) => {
    showToast('Update v' + version + ' available — downloading...');
  });

  window.mgm.onUpdateDownloaded((version) => {
    showToast('v' + version + ' ready — will install on next quit');
  });
}

// ── Bind all events (no inline onclick) ──────────────────────────────────────

function bindEvents() {
  // Titlebar
  document.getElementById('btn-close').addEventListener('click', () => { window.mgm.metricsStop(); window.mgm.windowClose(); });
  document.getElementById('btn-minimize').addEventListener('click', () => window.mgm.windowMinimize());

  // Nav tabs
  document.querySelectorAll('.nav-item[data-tab]').forEach(item => {
    item.addEventListener('click', () => switchTab(item.dataset.tab, item));
  });

  // Preset cards
  document.querySelectorAll('.preset-card[data-preset]').forEach(card => {
    card.addEventListener('click', () => setPreset(card.dataset.preset));
  });

  // Activate / Revert
  document.getElementById('btn-activate').addEventListener('click', applyMode);
  document.getElementById('btn-revert').addEventListener('click', revertMode);

  // Rules
  document.getElementById('btn-add-rule').addEventListener('click', openModal);
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('btn-modal-cancel').addEventListener('click', closeModal);
  document.getElementById('btn-modal-ok').addEventListener('click', saveRule);

  // Close modal on overlay click
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });

  // Settings - Theme picker
  document.querySelectorAll('.theme-btn[data-theme]').forEach(btn => {
    btn.addEventListener('click', () => setManualTheme(btn.dataset.theme));
  });

  // Settings - Language picker
  document.querySelectorAll('.lang-btn[data-lang]').forEach(btn => {
    btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
  });

  // Applied Changes collapsible
  const changesToggle = document.getElementById('changes-toggle');
  if (changesToggle) changesToggle.addEventListener('click', toggleChanges);

  // Settings - Restore Point
  document.getElementById('btn-restore').addEventListener('click', createRestorePoint);

  // Settings - Autostart
  document.getElementById('cb-autostart').addEventListener('change', (e) => {
    toggleAutostart(e.target.checked);
  });
}

// ── GPU Theme ─────────────────────────────────────────────────────────────────

function applyGPUTheme(vendor) {
  const app = document.getElementById('app');
  if (!app) return;
  app.classList.remove('theme-nvidia', 'theme-amd', 'theme-intel');
  app.classList.add('theme-' + vendor);

  const isVendorTheme = ['nvidia', 'amd', 'intel'].includes(vendor);
  const isManualVendor = state.manualTheme && isVendorTheme;

  // Badge in topbar - always shows real GPU model
  const rawModel = (state.gpu.model || '').replace(/\s+/g, ' ').trim();
  const fallbacks = { nvidia: 'NVIDIA GeForce', amd: 'AMD Radeon', intel: 'Intel Graphics' };
  const badgeText = rawModel.length > 3 ? rawModel : (fallbacks[state.gpu.vendor] || state.gpu.vendor);
  const badge = document.getElementById('gpu-badge');
  if (badge) badge.textContent = badgeText;

  // Sidebar - depends on whether theme is vendor or custom
  const vendorNames = { nvidia: 'NVIDIA', amd: 'AMD', intel: 'Intel' };
  const vendorSubs = { nvidia: 'NVIDIA Control Panel', amd: 'AMD Adrenalin Edition', intel: 'Intel Arc Control' };
  const logoMark = document.getElementById('logo-mark');
  const logoSub = document.getElementById('logo-sub');

  if (isVendorTheme) {
    // Vendor theme - show vendor logo and branding
    if (logoMark) {
      logoMark.style.background = 'transparent';
      logoMark.style.padding = '2px';
      logoMark.innerHTML = '<img src="../assets/icons/' + vendor + '_logo.png" style="width:28px;height:28px;object-fit:contain;border-radius:4px">';
    }
    if (logoSub) logoSub.textContent = vendorSubs[vendor] || vendor;
  } else {
    // Custom theme - show MGM icon and GPU model
    if (logoMark) {
      logoMark.style.background = 'var(--acc)';
      logoMark.style.padding = '0';
      logoMark.innerHTML = '<i class="ti ti-device-gamepad-2"></i>';
    }
    if (logoSub) logoSub.textContent = rawModel.length > 3 ? rawModel : 'Gaming Mode Manager';
  }

  // Update detected GPU section
  updateDetectedGPU(vendor, state.gpu.model);
}

function updateDetectedGPU(vendor, model) {
  const icon = document.getElementById('gpu-detected-icon');
  const modelEl = document.getElementById('gpu-detected-model');
  const vendorEl = document.getElementById('gpu-detected-vendor');

  if (icon) icon.src = '../assets/icons/' + vendor + '_logo.png';

  const vendorNames = { nvidia: 'NVIDIA Control Panel', amd: 'AMD Adrenalin Edition', intel: 'Intel Arc Control' };
  if (modelEl) modelEl.textContent = model || vendor.toUpperCase();
  if (vendorEl) vendorEl.textContent = vendorNames[vendor] || vendor;
}

// ── Presets ───────────────────────────────────────────────────────────────────

async function setPreset(preset) {
  if (state.preset === preset) return;

  if (state.active) {
    // Auto-switch: revert current, apply new
    setPresetsDisabled(true);
    await revertMode(true); // silent=true, no toast
    state.preset = preset;
    state.manualOverrides = {};
    ALL_TWEAKS.forEach(t => { state.tweaks[t.id] = t.presets[preset]; });
    setPresetButtons(preset);
    renderAll();
    persistConfig();
    await applyMode(true); // silent=true, custom toast
    showToast('Switched to ' + preset.charAt(0).toUpperCase() + preset.slice(1));
    setPresetsDisabled(false);
  } else {
    state.preset = preset;
    state.manualOverrides = {};
    ALL_TWEAKS.forEach(t => { state.tweaks[t.id] = t.presets[preset]; });
    setPresetButtons(preset);
    renderAll();
    persistConfig();
  }
}

function setPresetsDisabled(disabled) {
  document.querySelectorAll('.preset-card').forEach(card => {
    card.style.opacity = disabled ? '0.5' : '1';
    card.style.pointerEvents = disabled ? 'none' : '';
  });
}

function setPresetButtons(preset) {
  document.querySelectorAll('.preset-card[data-preset]').forEach(card => {
    card.classList.toggle('active', card.dataset.preset === preset);
  });
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

function switchTab(name, el) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  document.querySelectorAll('.nav-item[data-tab]').forEach(n => n.classList.remove('active'));
  el.classList.add('active');
  const titles = { presets: 'Presets', tweaks: 'Tweaks', rules: 'Custom rules', stats: 'Performance', settings: 'Settings' };
  document.getElementById('page-title').textContent = titles[name] || name;
  if (name === 'settings') initSettingsTab();
  // Start/stop metrics polling based on active tab
  if (name === 'stats') {
    window.mgm.metricsStart();
  } else {
    window.mgm.metricsStop();
  }
}

// ── Render helpers ────────────────────────────────────────────────────────────

function tagHtml(tag) {
  const map = { s: ['tag-s', 'No admin'], a: ['tag-a', 'Admin'], r: ['tag-r', 'Registry'] };
  const [cls, label] = map[tag] || ['tag-r', tag];
  return `<span class="tag ${cls}">${label}</span>`;
}

function iconFor(id) {
  const map = {
    gm: 'device-gamepad-2', sysmain: 'cpu', hp: 'bolt', wsearch: 'search',
    fso: 'maximize', hpet: 'clock', msi: 'cpu-2',
    xbox: 'brand-xbox', steam: 'brand-steam', nvoverlay: 'device-desktop',
    onedrive: 'cloud', discord: 'brand-discord', telemetry: 'radar',
    qos: 'router', nagle: 'network'
  };
  return map[id] || 'settings';
}

function buildTweakRow(t, mini = false) {
  const row = document.createElement('div');
  row.className = 'tweak-row' + (state.tweaks[t.id] ? ' active' : '');
  row.id = 'tr-' + t.id;

  if (mini) {
    row.innerHTML = `
      <div class="tr-icon"><i class="ti ti-${iconFor(t.id)}"></i></div>
      <div class="tr-info"><div class="tr-name">${t.name}</div></div>
      ${tagHtml(t.tag)}`;
    row.style.cursor = 'default';
  } else {
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !!state.tweaks[t.id];
    cb.addEventListener('change', (e) => toggleTweak(t.id, e.target.checked));

    const tog = document.createElement('label');
    tog.className = 'tog';
    tog.appendChild(cb);
    tog.innerHTML += '<div class="tog-track"></div><div class="tog-thumb"></div>';

    row.innerHTML = `
      <div class="tr-icon"><i class="ti ti-${iconFor(t.id)}"></i></div>
      <div class="tr-info">
        <div class="tr-name">${t.name} ${tagHtml(t.tag)}</div>
        <div class="tr-desc">${t.desc}</div>
        <div class="tr-cmd">${t.cmd}</div>
      </div>`;
    row.appendChild(tog);
  }
  return row;
}

function renderTweaks() {
  ['tw-win', 'tw-ov', 'tw-net'].forEach(id => document.getElementById(id).innerHTML = '');
  TWEAKS.win.forEach(t => document.getElementById('tw-win').appendChild(buildTweakRow(t)));
  TWEAKS.ov.forEach(t => document.getElementById('tw-ov').appendChild(buildTweakRow(t)));
  TWEAKS.net.forEach(t => document.getElementById('tw-net').appendChild(buildTweakRow(t)));
}

function renderPresetActive() {
  const container = document.getElementById('preset-active-list');
  container.innerHTML = '';
  const active = ALL_TWEAKS.filter(t => state.tweaks[t.id]);
  document.getElementById('active-count').textContent = active.length + ' tweak' + (active.length !== 1 ? 's' : '');
  if (!active.length) {
    container.innerHTML = '<div class="empty-state">No tweaks selected.</div>';
    return;
  }
  active.forEach(t => container.appendChild(buildTweakRow(t, true)));
}

function renderRules() {
  const container = document.getElementById('rules-list');
  container.innerHTML = '';
  document.getElementById('rules-count').textContent = state.rules.length;
  if (!state.rules.length) {
    container.innerHTML = '<div class="empty-state">No custom rules yet.</div>';
    return;
  }
  state.rules.forEach((r, i) => {
    const row = document.createElement('div');
    row.className = 'rule-row';
    row.innerHTML = `
      <i class="ti ti-terminal" style="font-size:16px;color:var(--text3)"></i>
      <div class="rr-info">
        <div class="rr-name">${r.name}</div>
        <div class="rr-type">${r.type} &rarr; ${r.target}</div>
      </div>`;
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-del';
    delBtn.innerHTML = '<i class="ti ti-trash"></i>';
    delBtn.addEventListener('click', () => deleteRule(i));
    row.appendChild(delBtn);
    container.appendChild(row);
  });
}

function renderStats() {
  const active = ALL_TWEAKS.filter(t => state.tweaks[t.id]);
  document.getElementById('sv-tweaks').textContent = active.length;
  document.getElementById('sv-sessions').textContent = state.sessions;
  document.getElementById('sv-rules').textContent = state.rules.length;
  // FPS removed - replaced by live CPU/RAM/GPU metrics

  const container = document.getElementById('stats-changes');
  const countEl = document.getElementById('changes-count');
  container.innerHTML = '';
  if (countEl) countEl.textContent = active.length;
  if (!active.length) {
    container.innerHTML = '<div class="empty-state">No active tweaks.</div>';
    return;
  }
  active.forEach(t => {
    const row = buildTweakRow(t, true);
    row.style.cursor = 'default';
    container.appendChild(row);
  });
}

// Sparkline history
const cpuHistory = Array(20).fill(0);
const ramHistory = Array(20).fill(0);
const gpuHistory = Array(20).fill(0);

function renderSparkline(containerId, history, color) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const max = Math.max(...history, 1);
  el.innerHTML = history.map(v => {
    const h = Math.max(2, Math.round((v / max) * 28));
    return `<div class="spark-bar" style="height:${h}px;background:${color}"></div>`;
  }).join('');
}

function toggleChanges() {
  const body = document.getElementById('stats-changes');
  const arrow = document.getElementById('changes-arrow');
  if (!body || !arrow) return;
  const isOpen = body.classList.contains('open');
  body.classList.toggle('open', !isOpen);
  body.classList.toggle('collapsed', isOpen);
  arrow.classList.toggle('open', !isOpen);
}

function updateMetricsUI(data) {
  if (!data) return;

  // CPU
  const cpuVal = document.getElementById('cpu-val');
  const cpuBar = document.getElementById('cpu-bar');
  const cpuSub = document.getElementById('cpu-sub');
  if (cpuVal && data.cpu !== undefined) {
    const v = Math.round(data.cpu);
    cpuVal.textContent = v + '%';
    cpuVal.className = 'gauge-big-val' + (v > 80 ? ' danger' : v > 50 ? ' warn' : '');
    if (cpuBar) { cpuBar.style.width = v + '%'; cpuBar.style.background = v > 80 ? '#ed1c24' : v > 50 ? '#f0a500' : 'var(--acc)'; }
    if (cpuSub) cpuSub.textContent = 'Usage: ' + v + '%';
    cpuHistory.shift(); cpuHistory.push(v);
    const cpuColor = v > 80 ? '#ed1c24' : v > 50 ? '#f0a500' : 'var(--acc)';
    renderSparkline('cpu-spark', cpuHistory, cpuColor);
  }

  // RAM
  const ramVal = document.getElementById('ram-val');
  const ramBar = document.getElementById('ram-bar');
  const ramSub = document.getElementById('ram-sub');
  if (ramVal && data.ramPct !== undefined) {
    const v = Math.round(data.ramPct);
    ramVal.textContent = v + '%';
    ramVal.className = 'gauge-big-val' + (v > 80 ? ' danger' : v > 60 ? ' warn' : '');
    if (ramBar) { ramBar.style.width = v + '%'; ramBar.style.background = v > 80 ? '#ed1c24' : v > 60 ? '#f0a500' : 'var(--acc)'; }
    if (ramSub) ramSub.textContent = data.ramUsed + ' GB / ' + data.ramTotal + ' GB';
    ramHistory.shift(); ramHistory.push(v);
    const ramColor = v > 80 ? '#ed1c24' : v > 60 ? '#f0a500' : 'var(--acc)';
    renderSparkline('ram-spark', ramHistory, ramColor);
  }

  // GPU - usage % via nvidia-smi if available, otherwise VRAM info
  const gpuValLive = document.getElementById('gpu-val-live');
  const gpuBar = document.getElementById('gpu-bar');
  const gpuSubLive = document.getElementById('gpu-sub-live');
  if (gpuValLive) {
    if (data.gpuUsage !== undefined && data.gpuUsage > 0) {
      const v = Math.round(data.gpuUsage);
      gpuValLive.textContent = v + '%';
      gpuValLive.className = 'gauge-big-val' + (v > 80 ? ' danger' : v > 50 ? ' warn' : '');
    gpuHistory.shift(); gpuHistory.push(v);
    renderSparkline('gpu-spark', gpuHistory, v > 80 ? '#ed1c24' : v > 50 ? '#f0a500' : 'var(--acc)');
      if (gpuBar) { gpuBar.style.width = v + '%'; gpuBar.style.background = v > 80 ? '#ed1c24' : v > 50 ? '#f0a500' : 'var(--acc)'; }
      if (gpuSubLive && data.gpuVramUsed !== undefined) {
        gpuSubLive.textContent = 'VRAM: ' + data.gpuVramUsed + ' / ' + data.gpuVramTotal + ' GB';
      }
    } else if (data.gpuVramTotal > 0) {
      // No nvidia-smi — show VRAM total only
      gpuValLive.textContent = data.gpuVramTotal + ' GB';
      gpuValLive.className = 'gauge-big-val';
      if (gpuBar) { gpuBar.style.width = '100%'; gpuBar.style.background = 'var(--acc)'; }
      if (gpuSubLive && data.gpuName) {
        const shortName = data.gpuName.replace('NVIDIA ', '').replace('AMD ', '').replace('Intel ', '');
        gpuSubLive.textContent = shortName;
      }
    } else {
      gpuValLive.textContent = 'N/A';
      if (gpuSubLive && data.gpuName) gpuSubLive.textContent = data.gpuName;
    }
  }
}

function renderAll() {
  renderTweaks();
  renderPresetActive();
  renderRules();
  renderStats();
}

// ── Actions ───────────────────────────────────────────────────────────────────

function toggleTweak(id, val) {
  state.tweaks[id] = val;
  // Track as manual override only if different from preset default
  const tweak = ALL_TWEAKS.find(t => t.id === id);
  if (tweak && tweak.presets[state.preset] !== val) {
    state.manualOverrides[id] = val;
  } else {
    delete state.manualOverrides[id];
  }
  const row = document.getElementById('tr-' + id);
  if (row) row.className = 'tweak-row' + (val ? ' active' : '');
  renderPresetActive();
  renderStats();
  persistConfig();
}

async function applyMode(silent = false) {
  const btn = document.getElementById('btn-activate');
  btn.disabled = true;
  btn.innerHTML = '<i class="ti ti-loader"></i> Applying...';
  if (!silent) showToast('Applying tweaks...');

  const result = await window.mgm.applyMode({ tweaks: state.tweaks, rules: state.rules, preset: state.preset });
  btn.disabled = false;

  if (!result.success) {
    btn.innerHTML = '<i class="ti ti-bolt"></i> Activate';
    if (!silent) showToast('Failed to apply — check logs');
    return;
  }

  state.active = true;
  state.sessions++;

  document.getElementById('status-dot').classList.add('on');
  document.getElementById('status-label').textContent = 'Gaming mode active';

  btn.className = 'btn-activate deact';
  btn.innerHTML = '<i class="ti ti-power"></i> Deactivate';
  btn.removeEventListener('click', applyMode);
  btn.addEventListener('click', revertMode);

  if (!silent) {
    const failed = result.failed ? result.failed.length : 0;
    showToast(failed > 0 ? `Activated — ${failed} tweak(s) skipped` : 'Gaming mode activated');
  }

  renderStats();
}

async function revertMode(silent = false) {
  const btn = document.getElementById('btn-activate');
  btn.disabled = true;
  btn.innerHTML = '<i class="ti ti-loader"></i> Reverting...';

  await window.mgm.revertMode();
  btn.disabled = false;

  state.active = false;

  document.getElementById('status-dot').classList.remove('on');
  document.getElementById('status-label').textContent = 'Gaming mode off';

  btn.className = 'btn-activate';
  btn.innerHTML = '<i class="ti ti-bolt"></i> Activate';
  btn.removeEventListener('click', revertMode);
  btn.addEventListener('click', applyMode);

  renderStats();
  if (!silent) showToast('Reverted to normal');
}

// ── Rules ─────────────────────────────────────────────────────────────────────

function openModal() {
  document.getElementById('modal-overlay').classList.add('open');
  document.getElementById('rule-name').focus();
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  document.getElementById('rule-name').value = '';
  document.getElementById('rule-target').value = '';
}

function saveRule() {
  const name = document.getElementById('rule-name').value.trim();
  const type = document.getElementById('rule-type').value;
  const target = document.getElementById('rule-target').value.trim();
  if (!name || !target) { showToast('Fill in all fields'); return; }
  state.rules.push({ name, type, target });
  closeModal();
  renderRules();
  renderStats();
  persistConfig();
  showToast('Rule added');
}

function deleteRule(index) {
  state.rules.splice(index, 1);
  renderRules();
  renderStats();
  persistConfig();
}

// ── Settings ─────────────────────────────────────────────────────────────────

function setManualTheme(theme) {
  state.manualTheme = theme === 'auto' ? null : theme;
  const vendor = state.manualTheme || state.gpu.vendor;
  applyGPUTheme(vendor);
  document.querySelectorAll('.theme-btn[data-theme]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === (state.manualTheme || 'auto'));
  });
  persistConfig();
  showToast(theme === 'auto' ? 'Auto theme restored' : theme.toUpperCase() + ' theme applied');
}

function setLanguage(lang) {
  state.lang = lang;
  applyLanguage(lang);
  document.querySelectorAll('.lang-btn[data-lang]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
  persistConfig();
}

function applyLanguage(lang) {
  state.lang = lang;
  // Update all elements with data-t attribute
  document.querySelectorAll('[data-t]').forEach(el => {
    const key = el.dataset.t;
    el.textContent = t(key);
  });
  // Update dynamic UI elements
  updateDynamicTranslations();
}

function updateDynamicTranslations() {
  // Nav items
  const navMap = {
    'ni-presets': 'nav_presets',
    'ni-tweaks': 'nav_tweaks',
    'ni-rules': 'nav_rules',
    'ni-stats': 'nav_performance',
    'ni-settings': 'nav_settings'
  };
  Object.entries(navMap).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) {
      const icon = el.querySelector('i');
      el.textContent = t(key);
      if (icon) el.prepend(icon);
    }
  });

  // Status label
  const statusEl = document.getElementById('status-label');
  if (statusEl) statusEl.textContent = t(state.active ? 'status_on' : 'status_off');

  // Activate button
  const actBtn = document.getElementById('btn-activate');
  if (actBtn && !actBtn.disabled) {
    const icon = actBtn.querySelector('i');
    actBtn.textContent = t(state.active ? 'btn_deactivate' : 'btn_activate');
    if (icon) actBtn.prepend(icon);
  }

  // Revert button
  const revBtn = document.getElementById('btn-revert');
  if (revBtn) {
    const icon = revBtn.querySelector('i');
    revBtn.textContent = t('btn_revert');
    if (icon) revBtn.prepend(icon);
  }

  // Re-render all tabs to pick up translations
  renderAll();
}

async function createRestorePoint() {
  const btn = document.getElementById('btn-restore');
  btn.disabled = true;
  btn.innerHTML = '<i class="ti ti-loader"></i> Creating...';
  showToast('Creating restore point...');

  const result = await window.mgm.createRestorePoint();

  btn.disabled = false;
  btn.innerHTML = '<i class="ti ti-shield-check"></i> Create Restore Point';

  if (result.success) {
    const now = new Date().toLocaleString();
    state.lastRestorePoint = now;
    const el = document.getElementById('restore-last');
    if (el) el.textContent = 'Last created: ' + now;
    persistConfig();
    showToast('Restore point created');
  } else {
    showToast('Failed to create restore point');
  }
}

async function toggleAutostart(enabled) {
  state.autostart = enabled;
  await window.mgm.setAutostart(enabled);
  persistConfig();
  showToast(enabled ? 'Autostart enabled' : 'Autostart disabled');
}

function initSettingsTab() {
  // Restore last restore point timestamp
  if (state.lastRestorePoint) {
    const el = document.getElementById('restore-last');
    if (el) el.textContent = 'Last created: ' + state.lastRestorePoint;
  }
  // Restore autostart state
  const cb = document.getElementById('cb-autostart');
  if (cb) cb.checked = !!state.autostart;
  // Settings vendor theme - show vendor name and logo
  const badge = document.getElementById('settings-gpu-badge');
  const vendorIcon = document.getElementById('settings-vendor-icon');
  const vendorNames = { nvidia: 'NVIDIA', amd: 'AMD', intel: 'Intel' };
  if (badge) badge.textContent = vendorNames[state.gpu.vendor] || state.gpu.vendor;
  if (vendorIcon) vendorIcon.src = '../assets/icons/' + state.gpu.vendor + '_logo.png';
}

// ── Persist ───────────────────────────────────────────────────────────────────

async function persistConfig() {
  await window.mgm.saveConfig({
    gpu: state.gpu.vendor,
    preset: state.preset,
    manualOverrides: state.manualOverrides,
    customRules: state.rules,
    autostart: state.autostart,
    lastRestorePoint: state.lastRestorePoint,
    lang: state.lang,
    manualTheme: state.manualTheme
  });
}

// ── Toast ─────────────────────────────────────────────────────────────────────

let toastTimer = null;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

// ── Boot ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);
