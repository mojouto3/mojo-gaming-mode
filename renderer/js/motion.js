'use strict';

// Loaded AFTER app.js on purpose: switchTab is a top-level function
// declaration there, and every call site (including ones inside app.js
// itself) resolves the bare identifier through the global object at call
// time, so wrapping window.switchTab here after app.js has already run
// is picked up everywhere automatically.

(function () {
  // ── Delegated cursor spotlight ────────────────────────────────────────
  // One listener on #content instead of one per card: tweak-row/rule-row/
  // game-row are re-rendered via innerHTML templating elsewhere in app.js,
  // so per-element listeners would silently stop working after a re-render.
  var content = document.getElementById('content');
  var pendingEvent = null;
  var spotlightRaf = null;

  function flushSpotlight() {
    spotlightRaf = null;
    if (!pendingEvent) return;
    var target = pendingEvent.target && pendingEvent.target.closest
      ? pendingEvent.target.closest('.spotlight')
      : null;
    if (target) {
      var rect = target.getBoundingClientRect();
      target.style.setProperty('--sx', (pendingEvent.clientX - rect.left) + 'px');
      target.style.setProperty('--sy', (pendingEvent.clientY - rect.top) + 'px');
    }
    pendingEvent = null;
  }

  if (content) {
    content.addEventListener('pointermove', function (e) {
      pendingEvent = e;
      if (!spotlightRaf) spotlightRaf = requestAnimationFrame(flushSpotlight);
    });
  }

  // ── Tab-switch fade/slide transition ──────────────────────────────────
  // Matches MIM's page transition: the outgoing view fades+slides out
  // FIRST, then the incoming view fades+slides in (sequential crossfade,
  // not simultaneous). Wraps the real switchTab instead of reimplementing
  // it, so the metrics/ping polling start-stop logic inside the original
  // still runs, just at the point the swap actually happens.
  var TAB_TRANSITION_MS = 200;

  function enterPanel(panel) {
    panel.classList.add('tab-entering');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        panel.classList.remove('tab-entering');
      });
    });
  }

  if (typeof window.switchTab === 'function') {
    var originalSwitchTab = window.switchTab;
    window.switchTab = function (name, el) {
      var newPanel = document.getElementById('tab-' + name);
      var oldPanel = document.querySelector('.tab-panel.active');

      // Nav feedback (which item is selected, the sliding indicator) reacts
      // the instant you click - it must not wait on the content crossfade
      // below, or the whole thing reads as laggy. Only the actual panel
      // swap (and the title/metrics-polling side effects bundled into the
      // real switchTab) is deferred until the exit fade finishes.
      if (el) {
        document.querySelectorAll('.nav-item[data-tab]').forEach(function (n) {
          n.classList.remove('active');
        });
        el.classList.add('active');
      }
      positionNavIndicator();

      if (!oldPanel || oldPanel === newPanel) {
        originalSwitchTab(name, el);
        if (newPanel) enterPanel(newPanel);
        return;
      }

      oldPanel.classList.add('tab-exiting');
      setTimeout(function () {
        oldPanel.classList.remove('tab-exiting');
        originalSwitchTab(name, el);
        if (newPanel) enterPanel(newPanel);
      }, TAB_TRANSITION_MS);
    };
  }

  // ── Sliding sidebar active-item indicator ───────────────────────────────
  // Matches MIM's sidebar: the highlight behind the active nav item glides
  // from its old position to the new one instead of instantly snapping.
  // Positioned in real pixels (not CSS layout) because the two nav-item
  // groups (main .sidebar-nav list and the separately-pinned Settings
  // button) are different containers, so a single absolutely-positioned
  // indicator inside .sidebar needs viewport-relative math to move between
  // them correctly.
  var sidebarEl = document.querySelector('.sidebar');
  var navIndicator = document.getElementById('nav-active-indicator');

  function positionNavIndicator() {
    if (!sidebarEl || !navIndicator) return;
    var activeItem = document.querySelector('.nav-item[data-tab].active');
    if (!activeItem) {
      navIndicator.style.opacity = '0';
      return;
    }
    var sidebarRect = sidebarEl.getBoundingClientRect();
    var itemRect = activeItem.getBoundingClientRect();
    navIndicator.style.top = (itemRect.top - sidebarRect.top) + 'px';
    navIndicator.style.height = itemRect.height + 'px';
    navIndicator.style.opacity = '1';
  }

  // Position without animating in from a stale spot (used at startup and
  // for the late-settling corrections below - both should snap, not slide).
  function positionNavIndicatorInstant() {
    if (!navIndicator) return;
    navIndicator.style.transition = 'none';
    positionNavIndicator();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        navIndicator.style.transition = '';
      });
    });
  }

  if (navIndicator) {
    positionNavIndicatorInstant();
    // Late-loading sidebar images (the GPU icon) and web font swap-in can
    // both shift nav-item positions after the first measurement above, so
    // re-measure once those settle instead of leaving a stale/clipped box.
    window.addEventListener('load', positionNavIndicatorInstant);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(positionNavIndicatorInstant);
    }
  }
})();
