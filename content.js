// YouTube Preview Speed Control - Content Script
console.log("YouTube Speed Control: Script loaded");

// Store active preview instances
const activePreviews = new Map();

// Default speed
const DEFAULT_SPEED = 1.0;
const SPEEDS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4];

// Add styles for the speed button
function addStyles() {
  const style = document.createElement("style");
  style.textContent = `
        .ytp-preview-speed-btn {
            position: absolute;
            right:12px; /* Position to the left of CC button */
            top: 100px;
            width: 33px;
            height: 33px;
            background: transparent;
            border: none;
            border-radius: 50%;
            color: #ffffff;
            font-size: 12px;
            font-weight: 600;
            font-family: 'Roboto', 'Arial', sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 100;
            opacity: 0.8;
            transition: all 0.15s ease;
            padding: 0;
            margin: 0;
            box-shadow: none;
            box-sizing: border-box;
        }
        .ytp-preview-speed-btn:hover {
            background: rgba(28, 28, 28, 0.9);
            transform: scale(1.1);
            opacity: 1;
        }
    `;
  document.head.appendChild(style);
}

// Create speed button
function createSpeedButton() {
  const btn = document.createElement("button");
  btn.className = "ytp-preview-speed-btn";
  btn.title = "Playback speed";
  return btn;
}

// Update button text and tooltip
function updateButton(btn, speed) {
  btn.textContent = `${speed}x`;
  btn.title = "Playback speed";
}

// Handle speed change
function handleSpeedChange(btn, video) {
  const currentSpeed = parseFloat(btn.textContent) || DEFAULT_SPEED;
  const currentIndex = SPEEDS.indexOf(currentSpeed);
  const newIndex = (currentIndex + 1) % SPEEDS.length;
  const newSpeed = SPEEDS[newIndex];

  video.playbackRate = newSpeed;
  updateButton(btn, newSpeed);

  // Save preference
  chrome.storage.local.set({ previewSpeed: newSpeed });
}

// Initialize preview player
function initPreviewPlayer(player) {
  if (activePreviews.has(player)) return;

  const video = player.querySelector("video.html5-main-video");
  const unmuteBtn = player.querySelector("button.ytp-unmute");

  if (!video || !unmuteBtn) return;

  // Create speed button and position it in the controls bar
  const speedBtn = createSpeedButton();
  const controls = player.querySelector('.ytp-chrome-controls, .ytp-chrome-bottom');
  if (controls) {
    controls.appendChild(speedBtn);
  } else if (unmuteBtn && unmuteBtn.parentNode) {
    // Fallback to unmute button's parent if controls not found
    unmuteBtn.parentNode.appendChild(speedBtn);
  }

  // Load saved speed
  chrome.storage.local.get(["previewSpeed"], (result) => {
    const speed = result.previewSpeed || DEFAULT_SPEED;
    video.playbackRate = speed;
    updateButton(speedBtn, speed);
  });

  // Add click handler
  speedBtn.addEventListener("click", (e) => {
    e.preventDefault();  // Prevent default action
    e.stopPropagation(); // Stop event from bubbling up
    handleSpeedChange(speedBtn, video);
  }, true);  // Use capture phase to catch the event early

  // Store reference
  activePreviews.set(player, { video, speedBtn });

  // Clean up when player is removed
  const observer = new MutationObserver((mutations, obs) => {
    if (!document.body.contains(player)) {
      cleanupPreview(player);
      obs.disconnect();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  console.log("Initialized preview player");
}

// Clean up preview
function cleanupPreview(player) {
  const preview = activePreviews.get(player);
  if (preview) {
    preview.speedBtn.remove();
    activePreviews.delete(player);
  }
}

// Initialize
function init() {
  addStyles();

  // Watch for new preview players
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Check if this is a preview player
          const players = node.matches(".html5-video-player")
            ? [node]
            : node.querySelectorAll
            ? node.querySelectorAll(".html5-video-player:not(#movie_player)")
            : [];

          players.forEach((player) => {
            if (!player.closest("#movie_player")) {
              // Exclude main player
              initPreviewPlayer(player);
            }
          });
        }
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Check for existing preview players
  document
    .querySelectorAll(".html5-video-player:not(#movie_player)")
    .forEach(initPreviewPlayer);
}

// Start the extension
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
