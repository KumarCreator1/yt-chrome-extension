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
  // Get the preview object for this button
  const preview = Array.from(activePreviews.values())
    .find(p => p.speedBtn === btn || p.video === video);
  
  // Get current speed from the preview object or button text
  const currentSpeed = preview?.currentSpeed || parseFloat(btn.textContent) || 1;
  const currentIndex = SPEEDS.indexOf(currentSpeed);
  const newIndex = (currentIndex + 1) % SPEEDS.length;
  const newSpeed = SPEEDS[newIndex];

  // Update the video speed
  video.playbackRate = newSpeed;
  
  // Update the button text to show the new speed
  updateButton(btn, newSpeed);
  
  // Update the stored speed in the preview object
  if (preview) {
    preview.currentSpeed = newSpeed;
  }

  // Save preference for future previews
  chrome.storage.local.set({ previewSpeed: newSpeed });
  console.log(`[SpeedControl] Speed changed to ${newSpeed}x`);
}

// Initialize preview player
function initPreviewPlayer(player) {
  // Clean up any existing previews for this player
  if (activePreviews.has(player)) {
    cleanupPreview(player);
  }

  const video = player.querySelector("video.html5-main-video");
  const unmuteBtn = player.querySelector("button.ytp-unmute");

  if (!video || !unmuteBtn) return;
  console.log("[SpeedControl] Initializing preview player", player);

  // Create speed button and position it in the controls bar
  const speedBtn = createSpeedButton();
  const controls = player.querySelector('.ytp-chrome-controls, .ytp-chrome-bottom');
  if (controls) {
    controls.appendChild(speedBtn);
  } else if (unmuteBtn && unmuteBtn.parentNode) {
    // Fallback to unmute button's parent if controls not found
    unmuteBtn.parentNode.appendChild(speedBtn);
  }

  // Always start with default speed for new previews
  video.playbackRate = DEFAULT_SPEED;
  updateButton(speedBtn, DEFAULT_SPEED);

  // Add click handler
  speedBtn.addEventListener("click", (e) => {
    e.preventDefault();  // Prevent default action
    e.stopPropagation(); // Stop event from bubbling up
    handleSpeedChange(speedBtn, video);
  }, true);  // Use capture phase to catch the event early

  // Reset state on new video load
  const resetState = () => {
    console.log("[SpeedControl] New video load detected - Resetting speed to 1x");
    updateButton(speedBtn, 1);
    const preview = activePreviews.get(player);
    if (preview) {
      preview.currentSpeed = 1;
    }
  };
  video.addEventListener('loadstart', resetState);

  // Get the last used speed or use default
  chrome.storage.local.get(['previewSpeed'], (result) => {
    const initialSpeed = result.previewSpeed || DEFAULT_SPEED;
    
    // Set the video speed to the stored speed
    video.playbackRate = initialSpeed;
    console.log(`[SpeedControl] Initial speed set to ${initialSpeed}x`);
    
    // Always show 1x on the button initially
    updateButton(speedBtn, 1);
    
    // Store reference with current speed
    activePreviews.set(player, { 
      video, 
      speedBtn,
      currentSpeed: initialSpeed,
      resetState
    });
  });

  // Clean up when player is removed
  const observer = new MutationObserver((mutations, obs) => {
    if (!document.body.contains(player)) {
      cleanupPreview(player);
      obs.disconnect();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

// Clean up preview
function cleanupPreview(player) {
  console.log("[SpeedControl] Cleaning up preview player");
  const preview = activePreviews.get(player);
  if (preview) {
    if (preview.video && preview.resetState) {
      preview.video.removeEventListener('loadstart', preview.resetState);
    }
    if (preview.speedBtn && preview.speedBtn.remove) {
      preview.speedBtn.remove();
    }
    if (preview.video) {
      preview.video.playbackRate = 1.0;
    }
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
