// content.js
// YouTube Preview Speed Control - injection + MutationObserver
// Drop this file into your extension and reload chrome://extensions

(() => {
  "use strict";

  // === CONFIG ===
  const SPEEDS = [0.5, 1, 1.5, 2];
  const BUTTON_CLASS = "yc-preview-speed-btn";
  const PROCESSED_ATTR = "data-yc-processed";
  // Max time to wait for preview overlay after hover (ms)
  const PREVIEW_TIMEOUT = 8000;

  // Inline styles to match YouTube-ish look (kept small)
  const BUTTON_STYLES = `
    .${BUTTON_CLASS} {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 36px;
      height: 36px;
      padding: 0 8px;
      margin-left: 6px;
      border-radius: 4px;
      background: rgba(0,0,0,0.6);
      color: #fff;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      user-select: none;
      transition: background 120ms ease, opacity 120ms ease;
      opacity: 0.95;
      box-shadow: 0 1px 0 rgba(255,255,255,0.03) inset;
    }
    .${BUTTON_CLASS}:hover { background: rgba(255,255,255,0.08); opacity: 1; }
    .${BUTTON_CLASS}[data-hidden="true"] { display: none !important; }
  `;

  // === STATE ===
  let currentSpeedIndex = 1; // default 1x index
  // Write style once
  function injectStyles() {
    if (document.getElementById("yc-preview-speed-styles")) return;
    const style = document.createElement("style");
    style.id = "yc-preview-speed-styles";
    style.textContent = BUTTON_STYLES;
    document.head.appendChild(style);
  }

  // Load saved speed index
  function loadSavedSpeed() {
    if (!chrome?.storage?.local) return Promise.resolve();
    return new Promise((res) => {
      chrome.storage.local.get(["previewSpeedIndex"], (o) => {
        if (o && typeof o.previewSpeedIndex === "number") {
          currentSpeedIndex = o.previewSpeedIndex;
        } else {
          currentSpeedIndex = 1; // default 1x
        }
        res();
      });
    });
  }

  function saveSpeedIndex() {
    if (!chrome?.storage?.local) return;
    chrome.storage.local.set({ previewSpeedIndex: currentSpeedIndex });
  }

  // Utility: find the most plausible preview video element inside a container
  function findPreviewVideo(container) {
    if (!container) return null;
    // Search for any <video> inside the container or its descendants
    const vids = container.querySelectorAll("video");
    if (!vids || vids.length === 0) return null;

    // Prefer a playing/visible video
    for (const v of vids) {
      try {
        const isVisible =
          v.offsetParent !== null || v.getClientRects().length > 0;
        if (!v.paused || (v.currentTime && v.currentTime > 0) || isVisible) {
          return v;
        }
      } catch (e) {
        /* ignore cross-origin-like issues */
      }
    }
    // fallback: first video
    return vids[0] || null;
  }

  // Create the speed button element
  function createSpeedButton() {
    const btn = document.createElement("div");
    btn.className = BUTTON_CLASS;
    btn.setAttribute("role", "button");
    btn.setAttribute("aria-label", "Preview speed");
    btn.setAttribute("tabindex", "0");
    btn.textContent = `${SPEEDS[currentSpeedIndex]}x`;
    // click to cycle
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      cycleSpeed(btn);
    });
    // keyboard support
    btn.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        cycleSpeed(btn);
      }
    });
    return btn;
  }

  function cycleSpeed(button) {
    currentSpeedIndex = (currentSpeedIndex + 1) % SPEEDS.length;
    const value = SPEEDS[currentSpeedIndex];
    button.textContent = `${value}x`;
    saveSpeedIndex();
    // apply speed to the currently visible preview (if any)
    const previewRoot = button.closest("[data-yc-preview-root]");
    const video = findPreviewVideo(previewRoot) || findPreviewVideo(document);
    if (video) {
      try {
        video.playbackRate = value;
      } catch (e) {
        console.warn("yc: set speed failed", e);
      }
    }
  }

  // Find anchor (mute/unmute) inside a preview container.
  // Prefer mute/unmute; fallback to CC/subtitles or generic button with "preview" role.
  function findAnchorIn(container) {
    if (!container) return null;
    // 1) Mute/unmute based on aria-label
    let el = container.querySelector(
      'button[aria-label*="mute" i], button[aria-label*="unmute" i]'
    );
    if (el) return el;
    // 2) Subtitles/CC button
    el = container.querySelector(
      'button[aria-label*="subtitle" i], button[aria-label*="subtitles" i], button[aria-label*="cc" i]'
    );
    if (el) return el;
    // 3) Any button that appears visually in the control cluster (heuristic)
    const possible = container.querySelectorAll("button");
    if (possible.length > 0) {
      // try to find one inside a controls wrapper
      for (const b of possible) {
        const role = b.getAttribute("role") || "";
        if (role.toLowerCase().includes("button")) return b;
      }
      return possible[0];
    }
    return null;
  }

  // Insert speed button next to anchor (in same parent). We attach a preview-root marker to scope later.
  function insertSpeedButtonForPreview(previewContainer) {
    try {
      if (
        !previewContainer ||
        previewContainer.querySelector(`.${BUTTON_CLASS}`)
      )
        return;

      const anchor = findAnchorIn(previewContainer);
      if (!anchor) return;

      const parent =
        anchor.parentElement || anchor.closest("div") || previewContainer;
      if (!parent) return;

      // Mark root so we can scope future operations
      previewContainer.setAttribute("data-yc-preview-root", "true");

      const btn = createSpeedButton();
      // Insert after anchor if possible
      if (anchor.nextSibling) {
        parent.insertBefore(btn, anchor.nextSibling);
      } else {
        parent.appendChild(btn);
      }

      // Initially apply stored speed (if preview video is already playing)
      const video = findPreviewVideo(previewContainer);
      if (video) {
        try {
          video.playbackRate = SPEEDS[currentSpeedIndex];
        } catch (e) {}
      }

      // Remove button if preview disappears (safety)
      const removalObserver = new MutationObserver((muts, obs) => {
        if (
          !document.body.contains(previewContainer) ||
          !previewContainer.isConnected
        ) {
          // preview removed from DOM
          try {
            btn.remove();
          } catch (e) {}
          obs.disconnect();
        }
      });
      removalObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
    } catch (err) {
      console.warn("yc: insert error", err);
    }
  }

  // Wait for preview overlay to appear inside a card/thumbnail. Returns a promise that resolves when anchor found or times out.
  function waitForPreviewAndInsert(cardEl) {
    return new Promise((resolve) => {
      if (!cardEl) return resolve(false);

      // If already processed, skip
      if (cardEl.getAttribute(PROCESSED_ATTR) === "true") return resolve(false);
      cardEl.setAttribute(PROCESSED_ATTR, "true");

      // Strategy: look for a preview overlay container within the card (common patterns)
      // Common overlay selectors: '#mouseover-overlay', 'ytd-thumbnail', '.ytp-preview', '.ytm-preview'
      const findPreviewContainer = () => {
        // search inside card for likely overlay container
        const tries = [
          cardEl.querySelector("#mouseover-overlay"),
          cardEl.querySelector(".ytd-thumbnail"),
          cardEl.querySelector(".ytp-preview"),
          cardEl.querySelector('[id^="hover"]'),
        ];
        for (const t of tries) if (t) return t;
        // fallback: sometimes preview controls are at cardEl itself
        return cardEl;
      };

      let resolved = false;

      // quick immediate attempt (in case overlay already present)
      const immediate = findPreviewContainer();
      if (immediate) {
        insertSpeedButtonForPreview(immediate);
        resolve(true);
        return;
      }

      // otherwise observe the card for children changes until anchor appears or timeout
      const start = Date.now();
      const mo = new MutationObserver(() => {
        const preview = findPreviewContainer();
        if (preview) {
          insertSpeedButtonForPreview(preview);
          resolved = true;
          mo.disconnect();
          resolve(true);
        } else if (Date.now() - start > PREVIEW_TIMEOUT) {
          // try fallback attempt to search deeper (global)
          mo.disconnect();
          resolve(false);
        }
      });

      mo.observe(cardEl, { childList: true, subtree: true });

      // also global fallback: check periodically until timeout
      const interval = setInterval(() => {
        if (resolved || Date.now() - start > PREVIEW_TIMEOUT) {
          clearInterval(interval);
          if (!resolved) resolve(false);
        } else {
          const preview = findPreviewContainer();
          if (preview) {
            insertSpeedButtonForPreview(preview);
            resolved = true;
            clearInterval(interval);
            mo.disconnect();
            resolve(true);
          }
        }
      }, 200);
    });
  }

  // Attach mouseenter handlers to cards to trigger scan
  function attachHandlersToCard(card) {
    if (!card || card.getAttribute("data-yc-listener") === "true") return;
    card.setAttribute("data-yc-listener", "true");

    // Hover: attempt injection (this keeps work minimal)
    card.addEventListener("mouseenter", () => {
      waitForPreviewAndInsert(card);
    });

    // Also: when keyboard-focus (for accessibility) we might want to attempt
    card.addEventListener("focusin", () => {
      waitForPreviewAndInsert(card);
    });
  }

  // Scan existing cards on page
  function scanAndAttach() {
    const selectors = [
      "ytd-rich-item-renderer",
      "ytd-video-renderer",
      "ytd-grid-video-renderer",
      "ytd-rich-grid-media",
      "ytd-thumbnail",
      "div.yt-simple-endpoint", // fallback
    ];
    const nodes = new Set();
    selectors.forEach((s) => {
      document.querySelectorAll(s).forEach((n) => nodes.add(n));
    });
    nodes.forEach((n) => attachHandlersToCard(n));
  }

  // Master observer: watch for new cards being added to the page
  function startMasterObserver() {
    const master = new MutationObserver((mutations) => {
      // small debounce: only scan when nodes are added
      let added = false;
      for (const m of mutations) {
        if (m.addedNodes && m.addedNodes.length > 0) {
          added = true;
          break;
        }
      }
      if (added) {
        scanAndAttach();
      }
    });

    master.observe(document.body, { childList: true, subtree: true });
    // initial pass
    scanAndAttach();
  }

  // Entry
  async function init() {
    injectStyles();
    await loadSavedSpeed();
    startMasterObserver();
    console.log("yc: YouTube Preview Speed content script initialized");
  }

  // Kickoff
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
