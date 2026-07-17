'use strict';

// Custom rules state - initialized after DOM ready
const customRulesState = {};

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

let miniModeActive = false;
let barModeActive = false;
let lastMetrics = {};
let lastActivationImpact = null;

function anyLiveViewActive() {
  const statsTabActive = document.getElementById('tab-stats')?.classList.contains('active');
  return !!statsTabActive || miniModeActive || barModeActive;
}

function stopMetricsIfIdle() {
  if (!anyLiveViewActive()) window.mgm.metricsStop();
}

function hideNormalApp() {
  const appEl = document.getElementById('app');
  if (appEl) appEl.style.display = 'none';
}

function showNormalAppIfIdle() {
  if (miniModeActive || barModeActive) return;
  const appEl = document.getElementById('app');
  if (appEl) appEl.style.display = '';
}

function enterMiniMode() {
  exitBarMode(true); // switching from bar to card view keeps polling alive
  hideNormalApp();
  miniModeActive = true;
  const mini = document.getElementById('mini-mode');
  mini.style.display = 'flex';
  const vendor = state.gpu?.vendor || 'nvidia';
  mini.className = 'mini-mode theme-' + (state.manualTheme || vendor);
  updateLiveViews();
  window.mgm.setMiniMode(true);
  window.mgm.metricsStart();
}

function exitMiniMode(skipWindowReset) {
  miniModeActive = false;
  document.getElementById('mini-mode').style.display = 'none';
  showNormalAppIfIdle();
  if (!skipWindowReset) window.mgm.setMiniMode(false);
  stopMetricsIfIdle();
}

function enterBarMode() {
  exitMiniMode(true); // switching from card to bar keeps polling alive
  hideNormalApp();
  barModeActive = true;
  const bar = document.getElementById('bar-mode');
  bar.style.display = 'flex';
  const vendor = state.gpu?.vendor || 'nvidia';
  bar.className = 'bar-mode theme-' + (state.manualTheme || vendor);
  updateLiveViews();
  window.mgm.setBarMode(true);
  window.mgm.metricsStart();
}

function exitBarMode(skipWindowReset) {
  barModeActive = false;
  document.getElementById('bar-mode').style.display = 'none';
  showNormalAppIfIdle();
  if (!skipWindowReset) window.mgm.setBarMode(false);
  stopMetricsIfIdle();
}

function toggleOpacityPopover(anchorEl) {
  const pop = document.getElementById('opacity-popover');
  if (!pop || !anchorEl) return;
  const isOpen = pop.style.display === 'flex';
  if (isOpen) {
    pop.style.display = 'none';
    return;
  }
  const rect = anchorEl.getBoundingClientRect();
  pop.style.display = 'flex';
  // Popover is roughly 36px tall — flip above the button if there isn't
  // enough room below within these small windows.
  const popHeight = 36;
  const fitsBelow = (rect.bottom + 6 + popHeight) <= window.innerHeight;
  pop.style.top = fitsBelow ? (rect.bottom + 6) + 'px' : Math.max(6, rect.top - popHeight - 6) + 'px';
  let left = rect.left - 80;
  left = Math.max(6, Math.min(left, window.innerWidth - 200));
  pop.style.left = left + 'px';
}

function updateLiveViews() {
  updateMiniMode();
  updateBarMode();
}

function statClass(v, warnAt, dangerAt) {
  return v > dangerAt ? ' danger' : v > warnAt ? ' warn' : '';
}

function updateBarMode() {
  if (!barModeActive) return;
  const barEl = document.getElementById('bar-mode');
  const dotEl = document.getElementById('bar-dot');
  const presetEl = document.getElementById('bar-preset');
  const cpuEl = document.getElementById('bar-cpu');
  const ramEl = document.getElementById('bar-ram');
  const gpuEl = document.getElementById('bar-gpu');

  if (barEl) barEl.classList.toggle('active', !!state.active);
  if (dotEl) dotEl.classList.toggle('on', !!state.active);
  if (presetEl) presetEl.textContent = (state.preset || 'balanced').charAt(0).toUpperCase() + (state.preset || 'balanced').slice(1);

  if (cpuEl && lastMetrics.cpu !== undefined) {
    const v = Math.round(lastMetrics.cpu);
    cpuEl.textContent = v + '%';
    cpuEl.className = 'bar-stat-val' + statClass(v, 50, 80);
  }
  if (ramEl && lastMetrics.ramPct !== undefined) {
    const v = Math.round(lastMetrics.ramPct);
    ramEl.textContent = v + '%';
    ramEl.className = 'bar-stat-val' + statClass(v, 60, 80);
  }
  if (gpuEl && lastMetrics.gpuUsage !== undefined && lastMetrics.gpuUsage > 0) {
    const v = Math.round(lastMetrics.gpuUsage);
    gpuEl.textContent = v + '%';
    gpuEl.className = 'bar-stat-val' + statClass(v, 50, 80);
  }
}

function updateMiniMode() {
  if (!miniModeActive) return;
  const miniEl = document.getElementById('mini-mode');
  const presetEl = document.getElementById('mm-preset');
  const tweaksEl = document.getElementById('mm-tweaks');
  const statusEl = document.getElementById('mm-status');
  const btnEl = document.getElementById('mm-activate-btn');
  const cpuEl = document.getElementById('mm-cpu');
  const ramEl = document.getElementById('mm-ram');
  const gpuEl = document.getElementById('mm-gpu');

  // Glow border while gaming mode is on
  if (miniEl) miniEl.classList.toggle('active', !!state.active);

  if (presetEl) presetEl.textContent = (state.preset || 'balanced').charAt(0).toUpperCase() + (state.preset || 'balanced').slice(1);
  if (tweaksEl) {
    const count = Object.values(state.tweaks).filter(Boolean).length;
    tweaksEl.textContent = count + ' tweak' + (count !== 1 ? 's' : '') + ' selected';
  }
  if (statusEl) {
    statusEl.textContent = state.active ? '● Gaming mode on' : '● Gaming mode off';
    statusEl.className = 'mm-status' + (state.active ? ' active' : '');
  }
  if (btnEl) {
    btnEl.textContent = state.active ? 'Deactivate' : 'Activate';
    btnEl.className = 'mm-activate-btn' + (state.active ? ' deact' : '');
  }

  if (cpuEl && lastMetrics.cpu !== undefined) {
    const v = Math.round(lastMetrics.cpu);
    cpuEl.textContent = v + '%';
    cpuEl.className = 'mm-stat-val' + (v > 80 ? ' danger' : v > 50 ? ' warn' : '');
    renderSparkline('mm-cpu-spark', cpuHistory, v > 80 ? '#ed1c24' : v > 50 ? '#f0a500' : 'var(--acc)', 12);
  }
  if (ramEl && lastMetrics.ramPct !== undefined) {
    const v = Math.round(lastMetrics.ramPct);
    ramEl.textContent = v + '%';
    ramEl.className = 'mm-stat-val' + (v > 80 ? ' danger' : v > 60 ? ' warn' : '');
    renderSparkline('mm-ram-spark', ramHistory, v > 80 ? '#ed1c24' : v > 60 ? '#f0a500' : 'var(--acc)', 12);
  }
  if (gpuEl && lastMetrics.gpuUsage !== undefined && lastMetrics.gpuUsage > 0) {
    const v = Math.round(lastMetrics.gpuUsage);
    gpuEl.textContent = v + '%';
    gpuEl.className = 'mm-stat-val' + (v > 80 ? ' danger' : v > 50 ? ' warn' : '');
    renderSparkline('mm-gpu-spark', gpuHistory, v > 80 ? '#ed1c24' : v > 50 ? '#f0a500' : 'var(--acc)', 12);
  }
}

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
    if (typeof config.windowOpacity === 'number') {
      const pct = Math.round(config.windowOpacity * 100);
      const slider = document.getElementById('opacity-slider');
      const val = document.getElementById('opacity-val');
      if (slider) slider.value = pct;
      if (val) val.textContent = pct + '%';
    }
    // Init custom rules state
    if (typeof CUSTOM_RULES !== 'undefined') {
      CUSTOM_RULES.forEach(r => {
        customRulesState[r.id] = (config.customRulesActive && config.customRulesActive[r.id]) || false;
      });
    }
    if (config.autostart !== undefined) state.autostart = config.autostart;
    if (config.lastRestorePoint) state.lastRestorePoint = config.lastRestorePoint;
    if (config.lang) state.lang = config.lang;
    if (config.manualTheme) state.manualTheme = config.manualTheme;

    setPresetButtons(state.preset);
    applyLanguage(state.lang);
    if (state.manualTheme) applyGPUTheme(state.manualTheme);
    renderAll();

    // Show onboarding on first launch
    if (!config.onboardingComplete) {
      initOnboarding(state.gpu.vendor, state.gpu.model, (selectedPreset) => {
        setPreset(selectedPreset);
        window.mgm.saveConfig({ ...config, onboardingComplete: true, preset: selectedPreset });
      });
    }
  } catch (e) {
    // Fallback - apply balanced defaults
    ALL_TWEAKS.forEach(t => { state.tweaks[t.id] = t.presets.balanced; });
    applyGPUTheme('nvidia');
    renderAll();
  }

  // Load version dynamically
  try {
    const version = await window.mgm.getVersion();
    const verEl = document.querySelector('.version-label');
    if (verEl) verEl.textContent = 'v' + version;
  } catch(e) {}

  // What's New badge
  try {
    const wn = await window.mgm.getWhatsNew();
    const lastSeen = config.lastSeenVersion || '';
    const badge = document.getElementById('new-badge');
    const popup = document.getElementById('wn-popup');
    const popupVersion = document.getElementById('wn-popup-version');
    const popupList = document.getElementById('wn-popup-list');
    const closeBtn = document.getElementById('wn-popup-close');

    if (popupVersion) popupVersion.textContent = 'v' + wn.version;
    if (popupList && wn.items.length) {
      popupList.innerHTML = wn.items.map(i => `<li>${i}</li>`).join('');
    }

    // Show badge if version is newer than last seen
    if (badge && wn.version && wn.version !== lastSeen) {
      badge.style.display = 'block';
      badge.addEventListener('click', () => {
        if (popup) popup.style.display = popup.style.display === 'none' ? 'block' : 'none';
      });
    }

    if (closeBtn && popup && badge) {
      closeBtn.addEventListener('click', () => {
        popup.style.display = 'none';
        badge.style.display = 'none';
        window.mgm.saveConfig({ ...config, lastSeenVersion: wn.version });
      });
    }
  } catch(e) {}

  window.mgm.onTrayPresetSwitch((preset) => {
    setPreset(preset);
    if (state.active) applyMode(true);
  });

  window.mgm.onTrayToggle((val) => {
    val ? applyMode() : revertMode();
  });

  // Live metrics listener
  window.mgm.onMetricsData((data) => {
    lastMetrics = data;
    updateMetricsUI(data);
    updateLiveViews();
  });

  // Live ping listener (Performance tab only)
  window.mgm.onPingData((data) => {
    updatePingUI(data);
  });

  // Auto-updater status handler
  window.mgm.onUpdaterStatus((data) => {
    handleUpdaterStatus(data);
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
    card.addEventListener('click', () => {
      // Disable all custom rules and hide Custom card
      if (typeof CUSTOM_RULES !== 'undefined') {
        CUSTOM_RULES.forEach(r => { customRulesState[r.id] = false; });
        renderCustomRules();
      }
      document.getElementById('pc-custom')?.classList.remove('active');
      const p = card.dataset.preset;
      if (state.preset === p) {
        setPresetButtons(p);
      } else {
        setPreset(p);
      }
    });
  });

  // Custom preset card click
  document.getElementById('pc-custom')?.addEventListener('click', () => {
    document.querySelectorAll('.preset-card[data-preset]').forEach(c => c.classList.remove('active'));
    document.getElementById('pc-custom').classList.add('active');
    renderCustomPresetActive();
  });

  // Activate / Revert
  document.getElementById('btn-activate').addEventListener('click', onActivateClick);
  document.getElementById('btn-revert').addEventListener('click', onRevertClick);

  // Rules
  document.getElementById('btn-add-rule').addEventListener('click', openModal);
  document.getElementById('rule-type')?.addEventListener('change', updateRuleTargetLabel);
  document.getElementById('btn-export-rules')?.addEventListener('click', exportCustomRulesToFile);
  document.getElementById('btn-import-rules')?.addEventListener('click', importCustomRulesFromFile);
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

  // Check for updates button
  const btnUpdate = document.getElementById('btn-check-update');
  if (btnUpdate) btnUpdate.addEventListener('click', checkForUpdates);

  // Mini mode toggle
  document.getElementById('btn-mini-mode')?.addEventListener('click', enterMiniMode);
  document.getElementById('mm-expand')?.addEventListener('click', () => exitMiniMode());
  document.getElementById('mm-bar-btn')?.addEventListener('click', enterBarMode);
  document.querySelector('.mm-stats')?.addEventListener('click', () => {
    exitMiniMode();
    const statsNav = document.getElementById('ni-stats');
    if (statsNav) switchTab('stats', statsNav);
  });
  document.getElementById('mm-activate-btn')?.addEventListener('click', async () => {
    if (state.active) {
      await revertMode();
    } else {
      await applyMode();
    }
    updateLiveViews();
  });

  // Bar mode toggle
  document.getElementById('bar-expand')?.addEventListener('click', enterMiniMode);
  document.getElementById('bar-close')?.addEventListener('click', () => exitBarMode());
  document.querySelector('.bar-stats')?.addEventListener('click', () => {
    exitBarMode();
    const statsNav = document.getElementById('ni-stats');
    if (statsNav) switchTab('stats', statsNav);
  });

  // Quick-access opacity popover, shared between mini card and bar
  document.getElementById('mm-opacity-btn')?.addEventListener('click', (e) => toggleOpacityPopover(e.currentTarget));
  document.getElementById('bar-opacity-btn')?.addEventListener('click', (e) => toggleOpacityPopover(e.currentTarget));
  document.getElementById('opacity-slider')?.addEventListener('input', (e) => {
    const pct = parseInt(e.target.value, 10);
    document.getElementById('opacity-val').textContent = pct + '%';
    window.mgm.setWindowOpacity(pct / 100);
  });
  document.getElementById('opacity-popover-close')?.addEventListener('click', () => {
    document.getElementById('opacity-popover').style.display = 'none';
  });
  document.addEventListener('click', (e) => {
    const pop = document.getElementById('opacity-popover');
    if (!pop || pop.style.display === 'none') return;
    if (e.target.closest('#opacity-popover') || e.target.closest('#mm-opacity-btn') || e.target.closest('#bar-opacity-btn')) return;
    pop.style.display = 'none';
  });

  // Reset to defaults
  document.getElementById('btn-reset-defaults')?.addEventListener('click', () => {
    if (!confirm('Reset all tweaks and settings to defaults?')) return;
    setPreset('balanced');
    showToast('Reset to defaults');
  });

  // Tweak search
  const searchInput = document.getElementById('tweak-search');
  const searchClear = document.getElementById('tweak-search-clear');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.toLowerCase().trim();
      searchClear.style.display = q ? 'flex' : 'none';
      filterTweaks(q);
    });
  }
  if (searchClear) {
    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      searchClear.style.display = 'none';
      filterTweaks('');
    });
  }

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
  const customCard = document.getElementById('pc-custom');
  if (customCard) customCard.classList.remove('active');
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
  if (name === 'stats') renderActivationImpact();
  // Start/stop metrics polling based on active tab
  if (name === 'stats' || miniModeActive || barModeActive) {
    window.mgm.metricsStart();
  } else {
    window.mgm.metricsStop();
  }
  // Ping monitor only runs while the Performance tab itself is open
  if (name === 'stats') {
    window.mgm.pingStart();
  } else {
    window.mgm.pingStop();
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

function statusHtml(id) {
  if (state.active) {
    return `<span class="status-tag on"><span class="status-tag-dot"></span>ON</span>`;
  }
  return tagHtml(ALL_TWEAKS.find(t => t.id === id)?.tag || '');
}

function buildTweakRow(t, mini = false) {
  const row = document.createElement('div');
  row.className = 'tweak-row' + (state.tweaks[t.id] ? ' active' : '');
  row.id = 'tr-' + t.id;

  if (mini) {
    row.innerHTML = `
      <div class="tr-icon"><i class="ti ti-${iconFor(t.id)}"></i></div>
      <div class="tr-info"><div class="tr-name">${t.name}</div></div>
      ${statusHtml(t.id)}`;
    row.style.cursor = 'default';
  } else {
    row.innerHTML = `
      <div class="tr-icon"><i class="ti ti-${iconFor(t.id)}"></i></div>
      <div class="tr-info">
        <div class="tr-name">${t.name} ${tagHtml(t.tag)}</div>
        <div class="tr-desc">${t.desc}</div>
        <div class="tr-cmd">${t.cmd}</div>
      </div>
      <label class="tog">
        <input type="checkbox" ${state.tweaks[t.id] ? 'checked' : ''}>
        <div class="tog-track"></div>
        <div class="tog-thumb"></div>
      </label>`;
    row.querySelector('input[type="checkbox"]').addEventListener('change', (e) => toggleTweak(t.id, e.target.checked));
  }
  return row;
}

function updateCategoryCount(category, tweaks) {
  const active = tweaks.filter(t => state.tweaks[t.id]).length;
  const total = tweaks.length;
  const el = document.getElementById('count-' + category);
  if (el) el.textContent = active + '/' + total;
}

function renderTweaks() {
  ['tw-win', 'tw-ov', 'tw-net'].forEach(id => document.getElementById(id).innerHTML = '');
  TWEAKS.win.forEach(t => document.getElementById('tw-win').appendChild(buildTweakRow(t)));
  TWEAKS.ov.forEach(t => document.getElementById('tw-ov').appendChild(buildTweakRow(t)));
  TWEAKS.net.forEach(t => document.getElementById('tw-net').appendChild(buildTweakRow(t)));
  updateCategoryCount('win', TWEAKS.win);
  updateCategoryCount('ov', TWEAKS.ov);
  updateCategoryCount('net', TWEAKS.net);

  // Toggle-all switches per category
  const categoryMap = { win: TWEAKS.win, ov: TWEAKS.ov, net: TWEAKS.net };
  document.querySelectorAll('input[data-tweak-cat]').forEach(cb => {
    const cat = cb.dataset.tweakCat;
    const tweaks = categoryMap[cat] || [];
    cb.checked = tweaks.length > 0 && tweaks.every(t => state.tweaks[t.id]);
    cb.onchange = (e) => {
      const val = e.target.checked;
      tweaks.forEach(t => toggleTweak(t.id, val));
      renderTweaks();
    };
  });
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

function renderCustomRules() {
  const container = document.getElementById('cr-list');
  const countEl = document.getElementById('cr-active-count');
  if (!container || typeof CUSTOM_RULES === 'undefined') return;

  container.innerHTML = '';
  let activeCount = 0;

  const iconMap = {
    cr_teams: 'brand-teams', cr_phonelink: 'device-mobile', cr_copilot: 'robot',
    cr_widgets: 'layout-dashboard', cr_epicgames: 'device-gamepad-2',
    cr_eaapp: 'device-gamepad', cr_spotify: 'brand-spotify', cr_gamesprior: 'cpu',
    cr_battlenet: 'device-gamepad', cr_ubisoft: 'device-gamepad', cr_gog: 'device-gamepad',
    cr_xbox: 'brand-xbox', cr_rockstar: 'device-gamepad',
    cr_slack: 'brand-slack', cr_zoom: 'video', cr_whatsapp: 'brand-whatsapp',
    cr_telegram: 'brand-telegram', cr_googledrive: 'brand-google-drive', cr_dropbox: 'cloud',
    cr_riot: 'device-gamepad-2', cr_onedrive_close: 'cloud-off', cr_icloud: 'cloud-off', cr_skype: 'brand-skype',
    cr_minecraft: 'device-gamepad', cr_itunes: 'music'
  };

  const categoryLabels = {
    launchers: 'Game Launchers',
    communication: 'Communication',
    system: 'System',
    media: 'Media',
    cloud: 'Cloud Storage'
  };

  const categoryOrder = ['launchers', 'communication', 'media', 'cloud', 'system'];

  // Group by category
  const grouped = {};
  CUSTOM_RULES.forEach(r => {
    const cat = r.category || 'system';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(r);
  });

  categoryOrder.forEach(cat => {
    if (!grouped[cat]) return;
    const rules = grouped[cat];

    // Category header with "Close all" toggle
    const allOn = rules.every(r => customRulesState[r.id]);
    const header = document.createElement('div');
    header.className = 'cr-category-header';
    header.innerHTML = `
      <span class="cr-category-label">${categoryLabels[cat] || cat}</span>
      <label class="tog tog-sm">
        <input type="checkbox" data-cat="${cat}" ${allOn ? 'checked' : ''}>
        <div class="tog-track"></div>
        <div class="tog-thumb"></div>
      </label>`;
    container.appendChild(header);

    // Rules in category
    rules.forEach(r => {
      const isOn = !!customRulesState[r.id];
      if (isOn) activeCount++;
      const icon = iconMap[r.id] || 'settings';
      const tagCls = r.tag === 'r' ? 'tag-r' : 'tag-s';
      const tagLabel = r.tag === 'r' ? 'Registry' : 'No admin';

      const row = document.createElement('div');
      row.className = 'tweak-row' + (isOn ? ' active' : '');
      row.id = 'cr-' + r.id;
      row.innerHTML = `
        <div class="tr-icon"><i class="ti ti-${icon}"></i></div>
        <div class="tr-info">
          <div class="tr-name">${r.name} <span class="tag ${tagCls}">${tagLabel}</span></div>
          <div class="tr-desc">${r.desc}</div>
        </div>
        <label class="tog">
          <input type="checkbox" data-cr="${r.id}" ${isOn ? 'checked' : ''}>
          <div class="tog-track"></div>
          <div class="tog-thumb"></div>
        </label>`;
      container.appendChild(row);
    });
  });

  // Bind individual rule toggles
  container.querySelectorAll('input[data-cr]').forEach(cb => {
    cb.addEventListener('change', (e) => toggleCustomRule(e.target.dataset.cr, e.target.checked));
  });

  // Bind category "Close all" toggles
  container.querySelectorAll('input[data-cat]').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const cat = e.target.dataset.cat;
      const val = e.target.checked;
      CUSTOM_RULES.filter(r => (r.category || 'system') === cat).forEach(r => {
        toggleCustomRule(r.id, val);
      });
      renderCustomRules();
    });
  });

  if (countEl) countEl.textContent = activeCount + ' active';
  refreshCustomCardState();
}

function toggleCustomRule(id, val) {
  customRulesState[id] = val;
  const row = document.getElementById('cr-' + id);
  if (row) row.className = 'tweak-row' + (val ? ' active' : '');
  const activeCount = Object.values(customRulesState).filter(Boolean).length;
  const countEl = document.getElementById('cr-active-count');
  if (countEl) countEl.textContent = activeCount + ' active';
  refreshCustomCardState();
  persistConfig();
}

function renderCustomPresetActive() {
  const container = document.getElementById('preset-active-list');
  const countEl = document.getElementById('active-count');
  if (!container) return;

  container.innerHTML = '';
  const activeTweaks = ALL_TWEAKS.filter(t => state.tweaks[t.id] === true || state.tweaks[t.id] === 1);
  const activeCustom = typeof CUSTOM_RULES !== 'undefined' ? CUSTOM_RULES.filter(r => customRulesState[r.id]) : [];
  const total = activeTweaks.length + activeCustom.length;

  if (countEl) countEl.textContent = total + ' tweak' + (total !== 1 ? 's' : '');

  if (!total) {
    container.innerHTML = '<div class="empty-state">No tweaks selected.</div>';
    return;
  }

  activeTweaks.forEach(t => container.appendChild(buildTweakRow(t, true)));

  activeCustom.forEach(r => {
    const row = document.createElement('div');
    row.className = 'tweak-row active';
    row.innerHTML = `
      <div class="tr-icon"><i class="ti ti-puzzle"></i></div>
      <div class="tr-info"><div class="tr-name">${r.name} <span class="tag tag-s">Custom</span></div></div>`;
    container.appendChild(row);
  });
}

function updateCustomPresetCard(tweakCount, ruleCount = 0) {
  const card = document.getElementById('pc-custom');
  if (!card) return;

  card.style.display = '';
  let label;
  if (tweakCount > 0 && ruleCount > 0) {
    label = `${tweakCount} tweak${tweakCount !== 1 ? 's' : ''}, ${ruleCount} rule${ruleCount !== 1 ? 's' : ''}`;
  } else if (tweakCount > 0) {
    label = `${tweakCount} tweak${tweakCount !== 1 ? 's' : ''} active`;
  } else {
    label = `${ruleCount} rule${ruleCount !== 1 ? 's' : ''} active`;
  }
  card.querySelector('.pc-sub').textContent = label;
}

function refreshCustomCardState() {
  const ruleCount = Object.values(customRulesState).filter(Boolean).length;
  const overrideCount = Object.keys(state.manualOverrides || {}).length;
  const isCustom = ruleCount > 0 || overrideCount > 0;

  if (isCustom) {
    // Switching to Custom is triggered by any deviation from the preset,
    // but the displayed count is everything currently active, not just
    // what differs, so it matches the "ACTIVE IN THIS PRESET" list below.
    const activeTweakCount = ALL_TWEAKS.filter(t => state.tweaks[t.id]).length;
    updateCustomPresetCard(activeTweakCount, ruleCount);
    document.querySelectorAll('.preset-card[data-preset]').forEach(c => c.classList.remove('active'));
    document.getElementById('pc-custom')?.classList.add('active');
    renderCustomPresetActive();
  } else {
    const card = document.getElementById('pc-custom');
    if (card) { card.style.display = 'none'; card.classList.remove('active'); }
    setPresetButtons(state.preset);
    renderPresetActive();
  }
}

function renderRules() {
  const container = document.getElementById('rules-list');
  container.innerHTML = '';
  document.getElementById('rules-count').textContent = state.rules.length;
  if (!state.rules.length) {
    container.innerHTML = '<div class="empty-state">No custom rules yet.</div>';
    return;
  }
  const typeLabels = { kill: 'Kill process', priority: 'CPU priority (High)', service: 'Disable service' };
  state.rules.forEach((r, i) => {
    const row = document.createElement('div');
    row.className = 'rule-row';
    const typeLabel = typeLabels[r.type] || r.type;
    const reopenNote = r.type === 'kill'
      ? (r.reopenOnDeactivate ? '<span style="color:var(--acc)">reopens on deactivate</span>' : '<span style="color:var(--text3)">won\'t reopen</span>')
      : '';
    row.innerHTML = `
      <i class="ti ti-terminal" style="font-size:16px;color:var(--text3)"></i>
      <div class="rr-info">
        <div class="rr-name">${r.name}</div>
        <div class="rr-type">${typeLabel} &rarr; ${r.target}${reopenNote ? ' &middot; ' + reopenNote : ''}</div>
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
const pingHistory = Array(20).fill(0);

function renderSparkline(containerId, history, color, maxHeight = 28) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const max = Math.max(...history, 1);
  el.innerHTML = history.map(v => {
    const h = Math.max(2, Math.round((v / max) * maxHeight));
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

function updatePingUI(data) {
  if (!data) return;
  const pingVal = document.getElementById('ping-val');
  const pingBar = document.getElementById('ping-bar');
  const pingSub = document.getElementById('ping-sub');
  if (pingVal && data.ping !== undefined) {
    const v = Math.round(data.ping);
    if (v <= 0) {
      pingVal.textContent = 'N/A';
      pingVal.className = 'gauge-big-val danger';
      if (pingSub) pingSub.textContent = 'No response';
      return;
    }
    pingVal.textContent = v + 'ms';
    pingVal.className = 'gauge-big-val' + (v > 100 ? ' danger' : v > 50 ? ' warn' : '');
    const pingColor = v > 100 ? '#ed1c24' : v > 50 ? '#f0a500' : 'var(--acc)';
    if (pingBar) { pingBar.style.width = Math.min(100, v) + '%'; pingBar.style.background = pingColor; }
    if (pingSub) pingSub.textContent = v > 100 ? 'High latency' : v > 50 ? 'Medium latency' : 'Good';
    pingHistory.shift(); pingHistory.push(v);
    renderSparkline('ping-spark', pingHistory, pingColor);
  }
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
      // No nvidia-smi - show VRAM total only
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

  // GPU Temperature
  const gpuTempVal = document.getElementById('gpu-temp-val');
  const gpuTempBar = document.getElementById('gpu-temp-bar');
  const gpuTempSub = document.getElementById('gpu-temp-sub');
  if (gpuTempVal && data.gpuTemp !== undefined && data.gpuTemp > 0) {
    const t = data.gpuTemp;
    gpuTempVal.textContent = t + '°C';
    gpuTempVal.className = 'gauge-big-val' + (t > 85 ? ' danger' : t > 70 ? ' warn' : '');
    const pct = Math.min(Math.round((t / 100) * 100), 100);
    if (gpuTempBar) { gpuTempBar.style.width = pct + '%'; gpuTempBar.style.background = t > 85 ? '#ed1c24' : t > 70 ? '#f0a500' : 'var(--acc)'; }
    if (gpuTempSub) gpuTempSub.textContent = t > 85 ? 'Hot' : t > 70 ? 'Warm' : 'Normal';
  } else if (gpuTempVal) {
    gpuTempVal.textContent = 'N/A';
    if (gpuTempSub) gpuTempSub.textContent = 'Not available';
  }
}

function renderAll() {
  renderTweaks();
  renderCustomRules();
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
  refreshCustomCardState();
  renderStats();
  persistConfig();
}

function averageSnapshots(a, b) {
  if (!a || !b) return a || b || null;
  return {
    cpu: (a.cpu + b.cpu) / 2,
    ramPct: (a.ramPct + b.ramPct) / 2,
    gpuUsage: (a.gpuUsage + b.gpuUsage) / 2
  };
}

function averagePing(a, b) {
  const valid = [a, b].filter(v => typeof v === 'number' && v > 0);
  if (!valid.length) return 0;
  return valid.reduce((sum, v) => sum + v, 0) / valid.length;
}

async function takeAveragedSnapshot() {
  const [s1, s2, p1, p2] = await Promise.all([
    window.mgm.getMetricsSnapshot().catch(() => null),
    new Promise(r => setTimeout(r, 400)).then(() => window.mgm.getMetricsSnapshot().catch(() => null)),
    window.mgm.getPingSnapshot().catch(() => null),
    new Promise(r => setTimeout(r, 400)).then(() => window.mgm.getPingSnapshot().catch(() => null))
  ]);
  const merged = averageSnapshots(s1, s2);
  if (merged) merged.ping = averagePing(p1 && p1.ping, p2 && p2.ping);
  return merged;
}

// Bug (found 2026-07): addEventListener passes the DOM click Event as the
// first argument to its handler. applyMode(silent = false) and
// revertMode(silent = false) treat that first argument as the silent flag.
// A DOM Event object is always truthy, so binding these functions directly
// as listeners (addEventListener('click', applyMode)) silently forced
// silent=true on every real button click, suppressing the activation
// toast entirely, with no error and no visible symptom other than the
// toast never appearing. Always wrap in a named handler that calls the
// function with explicit arguments instead of passing it directly.
function onActivateClick() { applyMode(); }
function onRevertClick() { revertMode(); }

async function applyMode(silent = false) {
  const btn = document.getElementById('btn-activate');
  btn.disabled = true;
  btn.innerHTML = '<i class="ti ti-loader"></i> Applying...';
  if (!silent) showToast('Applying tweaks...');

  const beforeSnapshot = await takeAveragedSnapshot();

  const result = await window.mgm.applyMode({ tweaks: state.tweaks, rules: state.rules, preset: state.preset, customRulesActive: customRulesState });
  btn.disabled = false;

  if (!result.success) {
    btn.innerHTML = '<i class="ti ti-bolt"></i> Activate';
    if (!silent) showToast('Failed to apply - check logs');
    return;
  }

  state.active = true;
  state.sessions++;

  document.getElementById('status-dot').classList.add('on');
  document.getElementById('status-label').textContent = 'Gaming mode active';

  btn.className = 'btn-activate deact';
  btn.innerHTML = '<i class="ti ti-power"></i> Deactivate';
  // Must remove/add the same named function references used at bind time
  // (onActivateClick/onRevertClick), not applyMode/revertMode directly,
  // or removeEventListener silently fails to find a match and both
  // handlers stay attached at once.
  btn.removeEventListener('click', onActivateClick);
  btn.addEventListener('click', onRevertClick);

  // Merge any captured service startup types back into state.rules so a
  // later revert restores the real original value instead of guessing.
  if (Array.isArray(result.customRuleResults)) {
    result.customRuleResults.forEach(r => {
      if (r.capturedStartType) {
        const rule = state.rules.find(x => x.name === r.id);
        if (rule) rule.capturedStartType = r.capturedStartType;
      }
    });
    if (result.customRuleResults.some(r => r.capturedStartType)) persistConfig();
  }

  const failed = (result.failed ? result.failed.length : 0) + (result.customRuleFailed ? result.customRuleFailed.length : 0) + (result.quickRuleFailed ? result.quickRuleFailed.length : 0);
  // Let the system settle after the tweak-applying PowerShell processes exit
  // before reading the "after" numbers, or they read artificially high.
  await new Promise(r => setTimeout(r, 1500));
  const afterSnapshot = await takeAveragedSnapshot();
  let showedImpactToast = false;
  if (beforeSnapshot && afterSnapshot) {
    lastActivationImpact = { before: beforeSnapshot, after: afterSnapshot, timestamp: Date.now() };
    renderActivationImpact();
    if (!silent) {
      showActivationToast(beforeSnapshot, afterSnapshot, failed);
      showedImpactToast = true;
    }
  } else if (!silent) {
    showToast(failed > 0 ? `Activated - ${failed} tweak(s) skipped` : 'Gaming mode activated');
  }

  renderStats();
  renderPresetActive(); // re-render to show ON status
  updateLiveViews();

  // Auto-minimize to tray. Give the richer impact toast time to actually
  // be read before the window disappears into the tray.
  setTimeout(() => window.mgm.minimizeToTray(), showedImpactToast ? 5000 : 800);

  // Start session timer
  startSessionTimer();
}

async function revertMode(silent = false) {
  stopSessionTimer();
  const btn = document.getElementById('btn-activate');
  btn.disabled = true;
  btn.innerHTML = '<i class="ti ti-loader"></i> Reverting...';

  const result = await window.mgm.revertMode();
  btn.disabled = false;

  state.active = false;

  document.getElementById('status-dot').classList.remove('on');
  document.getElementById('status-label').textContent = 'Gaming mode off';

  btn.className = 'btn-activate';
  btn.innerHTML = '<i class="ti ti-bolt"></i> Activate';
  btn.removeEventListener('click', onRevertClick);
  btn.addEventListener('click', onActivateClick);

  renderStats();
  renderPresetActive(); // re-render to show tag status
  updateLiveViews();

  const failed = (result?.failed ? result.failed.length : 0) + (result?.customRuleFailed ? result.customRuleFailed.length : 0) + (result?.quickRuleFailed ? result.quickRuleFailed.length : 0);
  if (!silent) {
    showToast(failed > 0 ? `Reverted - ${failed} item(s) failed to revert` : 'Reverted to normal');
  }
}

// ── Rules ─────────────────────────────────────────────────────────────────────

function updateRuleTargetLabel() {
  const type = document.getElementById('rule-type').value;
  const targetLabel = document.getElementById('rule-target-label');
  const reopenRow = document.getElementById('rule-reopen-row');
  const reopenHint = document.getElementById('rule-reopen-hint');
  const labels = { kill: 'Process name', priority: 'Process name', service: 'Service name' };
  if (targetLabel) targetLabel.textContent = labels[type] || 'Target';
  const showReopen = type === 'kill';
  if (reopenRow) reopenRow.style.display = showReopen ? 'flex' : 'none';
  if (reopenHint) reopenHint.style.display = showReopen ? 'block' : 'none';
}

function openModal() {
  document.getElementById('modal-overlay').classList.add('open');
  document.getElementById('rule-name').focus();
  updateRuleTargetLabel();
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  document.getElementById('rule-name').value = '';
  document.getElementById('rule-target').value = '';
  const reopenCb = document.getElementById('rule-reopen');
  if (reopenCb) reopenCb.checked = false;
}

async function saveRule() {
  const name = document.getElementById('rule-name').value.trim();
  const type = document.getElementById('rule-type').value;
  const target = document.getElementById('rule-target').value.trim();
  if (!name || !target) { showToast('Fill in all fields'); return; }

  const rule = { name, type, target, reopenOnDeactivate: false, exePath: null };

  const reopenChecked = document.getElementById('rule-reopen')?.checked;
  if (type === 'kill' && reopenChecked) {
    const okBtn = document.getElementById('btn-modal-ok');
    okBtn.disabled = true;
    okBtn.textContent = 'Locating...';
    const found = await window.mgm.findProcessPath(target.replace(/\.exe$/i, ''));
    if (found && found.path) {
      rule.reopenOnDeactivate = true;
      rule.exePath = found.path;
    } else {
      const browsed = await window.mgm.browseForExe();
      if (browsed && !browsed.canceled) {
        rule.reopenOnDeactivate = true;
        rule.exePath = browsed.filePath;
      } else {
        showToast(target + ' isn\'t running and no file was selected, rule saved without reopen');
      }
    }
    okBtn.disabled = false;
    okBtn.textContent = 'Add rule';
  }

  state.rules.push(rule);
  closeModal();
  renderRules();
  renderStats();
  persistConfig();
  showToast('Rule added');
}

function exportCustomRulesToFile() {
  const quickRuleIds = typeof CUSTOM_RULES !== 'undefined' ? CUSTOM_RULES.map(r => r.id) : Object.keys(customRulesState);
  const quickRules = {};
  quickRuleIds.forEach(id => { quickRules[id] = !!customRulesState[id]; });

  const payload = {
    app: 'mojo-gaming-mode',
    exportType: 'custom-rules',
    version: 1,
    exportedAt: new Date().toISOString(),
    quickRules,
    customRules: state.rules
  };

  window.mgm.exportCustomRules(JSON.stringify(payload, null, 2)).then((result) => {
    if (result.canceled) return;
    showToast(result.success ? 'Custom rules exported' : 'Export failed');
  });
}

async function importCustomRulesFromFile() {
  const result = await window.mgm.importCustomRules();
  if (result.canceled) return;
  if (!result.success) { showToast('Import failed - could not read file'); return; }

  let data;
  try {
    data = JSON.parse(result.content);
  } catch (e) {
    showToast('Import failed - invalid JSON');
    return;
  }

  if (!data || data.exportType !== 'custom-rules' || typeof data.quickRules !== 'object' || data.quickRules === null) {
    showToast('Import failed - not a Mojo Gaming Mode rules file');
    return;
  }

  // Only accept custom rule entries with the expected shape
  const importedCustomRules = Array.isArray(data.customRules)
    ? data.customRules.filter(r => r && typeof r.name === 'string' && typeof r.type === 'string' && typeof r.target === 'string')
    : [];

  // Only accept quick-rule ids that actually exist in this build, so an
  // export from a future version with new rules can't set unknown ids
  const knownIds = typeof CUSTOM_RULES !== 'undefined' ? new Set(CUSTOM_RULES.map(r => r.id)) : null;
  let appliedCount = 0;
  Object.entries(data.quickRules).forEach(([id, val]) => {
    if (knownIds && !knownIds.has(id)) return;
    customRulesState[id] = !!val;
    appliedCount++;
  });

  state.rules = importedCustomRules;

  renderCustomRules();
  renderRules();
  renderStats();
  await persistConfig();
  showToast(`Imported ${appliedCount} quick rule(s), ${importedCustomRules.length} custom rule(s)`);
}

function deleteRule(index) {
  state.rules.splice(index, 1);
  renderRules();
  renderStats();
  persistConfig();
}

// ── Settings ─────────────────────────────────────────────────────────────────

function handleUpdaterStatus(data) {
  const bar = document.getElementById('update-bar');
  const msg = document.getElementById('update-msg');
  const btn = document.getElementById('update-btn');
  const progress = document.getElementById('update-progress');
  const fill = document.getElementById('update-progress-fill');
  const statusEl = document.getElementById('update-status');

  if (!bar) return;

  switch (data.status) {
    case 'checking':
      bar.style.display = 'flex';
      msg.textContent = 'Checking for updates...';
      btn.style.display = 'none';
      progress.style.display = 'none';
      if (statusEl) statusEl.textContent = 'Checking...';
      break;

    case 'available':
      bar.style.display = 'flex';
      msg.textContent = 'v' + data.version + ' available';
      btn.style.display = 'block';
      btn.textContent = 'Download';
      btn.onclick = () => {
        btn.disabled = true;
        btn.textContent = 'Downloading...';
        window.mgm.downloadUpdate();
      };
      progress.style.display = 'none';
      if (statusEl) statusEl.textContent = 'Update v' + data.version + ' available';
      break;

    case 'up-to-date':
      bar.style.display = 'none';
      if (statusEl) statusEl.textContent = 'You are on the latest version.';
      setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 3000);
      break;

    case 'downloading':
      bar.style.display = 'flex';
      msg.textContent = 'Downloading ' + data.percent + '%';
      btn.style.display = 'none';
      progress.style.display = 'block';
      if (fill) fill.style.width = data.percent + '%';
      break;



    case 'downloaded':
      bar.style.display = 'flex';
      msg.textContent = 'v' + data.version + ' ready';
      btn.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Install & Restart';
      btn.onclick = () => window.mgm.installUpdate();
      progress.style.display = 'none';
      if (statusEl) statusEl.textContent = 'v' + data.version + ' ready to install';
      break;

    case 'error':
      bar.style.display = 'none';
      if (statusEl) statusEl.textContent = 'Update check failed.';
      break;
  }
}

async function checkForUpdates() {
  const btn = document.getElementById('btn-check-update');
  const status = document.getElementById('update-status');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader"></i> Checking...'; }
  if (status) status.textContent = '';

  try {
    await window.mgm.checkForUpdates();
    // Response comes via onUpdaterStatus
  } catch (e) {
    if (status) status.textContent = 'Could not check for updates.';
  }

  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-refresh"></i> Check for updates'; }
}

function filterTweaks(q) {
  const noResults = document.getElementById('tweak-no-results');
  const shWin = document.getElementById('sh-win');
  let visible = 0;

  ['tw-win', 'tw-ov', 'tw-net'].forEach(containerId => {
    const container = document.getElementById(containerId);
    if (!container) return;
    const rows = container.querySelectorAll('.tweak-row');
    let sectionVisible = 0;
    rows.forEach(row => {
      const name = row.querySelector('.tr-name')?.textContent?.toLowerCase() || '';
      const desc = row.querySelector('.tr-desc')?.textContent?.toLowerCase() || '';
      const matches = !q || name.includes(q) || desc.includes(q);
      row.style.display = matches ? '' : 'none';
      if (matches) { sectionVisible++; visible++; }
    });
    // Show/hide section header
    const prev = container.previousElementSibling;
    if (prev && prev.classList.contains('section-header')) {
      prev.style.display = sectionVisible > 0 ? '' : 'none';
    }
  });

  if (noResults) noResults.style.display = visible === 0 && q ? 'block' : 'none';
}

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
    customRulesActive: customRulesState,
    autostart: state.autostart,
    lastRestorePoint: state.lastRestorePoint,
    lang: state.lang,
    manualTheme: state.manualTheme
  });
}

// ── Toast ─────────────────────────────────────────────────────────────────────

let toastTimer = null;

// Session timer
let sessionTimerInterval = null;
let sessionStartTime = null;

function startSessionTimer() {
  sessionStartTime = Date.now();
  sessionTimerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
    const h = String(Math.floor(elapsed / 3600)).padStart(2, '0');
    const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
    const s = String(elapsed % 60).padStart(2, '0');
    const el = document.getElementById('sv-timer');
    if (el) el.textContent = `${h}:${m}:${s}`;
  }, 1000);
}

function stopSessionTimer() {
  clearInterval(sessionTimerInterval);
  sessionTimerInterval = null;
  sessionStartTime = null;
  const el = document.getElementById('sv-timer');
  if (el) el.textContent = '00:00:00';
}

function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

function impactDelta(before, after) {
  return { before: Math.round(before), after: Math.round(after), improved: after < before };
}

function showActivationToast(before, after, failedCount) {
  const el = document.getElementById('toast');
  const cpu = impactDelta(before.cpu, after.cpu);
  const ram = impactDelta(before.ramPct, after.ramPct);
  const gpu = impactDelta(before.gpuUsage, after.gpuUsage);
  const statusLine = failedCount > 0 ? `Activated - ${failedCount} tweak(s) skipped` : 'Gaming mode activated';
  let pingRow = '';
  if (before.ping > 0 && after.ping > 0) {
    const ping = impactDelta(before.ping, after.ping);
    pingRow = `<span>PING ${ping.before}ms <i class="ti ti-arrow-right"></i> <b class="${ping.improved ? 'better' : ''}">${ping.after}ms</b></span>`;
  }
  el.innerHTML = `<div class="toast-impact">
    <div class="toast-impact-title"><i class="ti ti-check"></i> ${statusLine}</div>
    <div class="toast-impact-stats">
      <span>CPU ${cpu.before}% <i class="ti ti-arrow-right"></i> <b class="${cpu.improved ? 'better' : ''}">${cpu.after}%</b></span>
      <span>RAM ${ram.before}% <i class="ti ti-arrow-right"></i> <b class="${ram.improved ? 'better' : ''}">${ram.after}%</b></span>
      <span>GPU ${gpu.before}% <i class="ti ti-arrow-right"></i> <b>${gpu.after}%</b></span>
      ${pingRow}
    </div>
  </div>`;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.classList.remove('show'); el.innerHTML = ''; }, 6000);
}

function renderActivationImpact() {
  const card = document.getElementById('activation-impact-card');
  if (!card) return;
  if (!lastActivationImpact) {
    card.style.display = 'none';
    return;
  }
  const { before, after, timestamp } = lastActivationImpact;
  card.style.display = 'flex';
  const timeEl = document.getElementById('impact-time');
  if (timeEl) timeEl.textContent = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const setStat = (prefix, beforeVal, afterVal, judge, unit = '%') => {
    const beforeEl = document.getElementById(prefix + '-before');
    const afterEl = document.getElementById(prefix + '-after');
    if (beforeEl) beforeEl.textContent = Math.round(beforeVal) + unit;
    if (afterEl) {
      afterEl.textContent = Math.round(afterVal) + unit;
      afterEl.className = 'impact-after' + (judge && afterVal < beforeVal ? ' better' : '');
    }
  };
  setStat('impact-cpu', before.cpu, after.cpu, true);
  setStat('impact-ram', before.ramPct, after.ramPct, true);
  setStat('impact-gpu', before.gpuUsage, after.gpuUsage, false);

  const pingStat = document.getElementById('impact-ping-stat');
  if (pingStat) {
    if (before.ping > 0 && after.ping > 0) {
      pingStat.style.display = 'flex';
      setStat('impact-ping', before.ping, after.ping, true, 'ms');
    } else {
      pingStat.style.display = 'none';
    }
  }
}

// ── Boot ──────────────────────────────────────────────────────────────────────

// ── Onboarding ──────────────────────────────────────────────────

let obSelectedPreset = 'esports';

function initOnboarding(vendor, gpuModel, onComplete) {
  const overlay = document.getElementById('ob-overlay');
  if (!overlay) return;

  // Set GPU info
  const gpuEl = document.getElementById('ob-gpu-detected');
  if (gpuEl) gpuEl.textContent = gpuModel || (vendor.toUpperCase() + ' GPU detected');

  // Set vendor logo
  const logoImg = document.getElementById('ob-vendor-logo');
  if (logoImg) logoImg.src = '../assets/icons/' + vendor + '_logo.png';

  // Preset selection
  document.querySelectorAll('.ob-preset').forEach(p => {
    p.addEventListener('click', () => {
      document.querySelectorAll('.ob-preset').forEach(x => x.classList.remove('selected'));
      p.classList.add('selected');
      obSelectedPreset = p.dataset.preset;
    });
  });

  // Navigation
  document.getElementById('ob-next-1')?.addEventListener('click', () => obGoTo(2));
  document.getElementById('ob-next-2')?.addEventListener('click', () => {
    const names = { balanced: 'Balanced', performance: 'Performance', esports: 'Esports' };
    const sub = document.getElementById('ob-ready-sub');
    if (sub) sub.textContent = (names[obSelectedPreset] || obSelectedPreset) + ' preset selected';
    obGoTo(3);
  });
  document.getElementById('ob-next-3')?.addEventListener('click', () => obGoTo(4));
  document.getElementById('ob-back-2')?.addEventListener('click', () => obGoTo(1));
  document.getElementById('ob-back-3')?.addEventListener('click', () => obGoTo(2));
  document.getElementById('ob-back-4')?.addEventListener('click', () => obGoTo(3));
  document.getElementById('ob-finish')?.addEventListener('click', () => {
    overlay.classList.remove('open');
    onComplete(obSelectedPreset);
  });

  // Open
  overlay.classList.add('open');
}

function obGoTo(step) {
  document.querySelectorAll('.ob-step').forEach(s => s.classList.remove('active'));
  document.getElementById('ob-step-' + step)?.classList.add('active');
}

document.addEventListener('DOMContentLoaded', init);
