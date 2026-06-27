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
  lastRestorePoint: null
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

    setPresetButtons(state.preset);
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
}

// ── Bind all events (no inline onclick) ──────────────────────────────────────

function bindEvents() {
  // Titlebar
  document.getElementById('btn-close').addEventListener('click', () => window.mgm.windowClose());
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

  const rawModel = (state.gpu.model || '').replace(/\s+/g, ' ').trim();
  const fallbacks = { nvidia: 'NVIDIA GeForce', amd: 'AMD Radeon', intel: 'Intel Graphics' };
  const badgeText = rawModel.length > 3 ? rawModel : (fallbacks[vendor] || vendor);

  const badge = document.getElementById('gpu-badge');
  if (badge) badge.textContent = badgeText;

  // Update detected GPU section in sidebar (titlebar always uses MGM icon)
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
  document.getElementById('fps-val').innerHTML = (state.active ? '144' : '60') + '<span>fps</span>';
  document.getElementById('fps-bar').style.width = state.active ? '88%' : '40%';

  const container = document.getElementById('stats-changes');
  container.innerHTML = '';
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
    lastRestorePoint: state.lastRestorePoint
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
