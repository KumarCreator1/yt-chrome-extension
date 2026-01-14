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
    updateButton(speedBtn, 1);
    const preview = activePreviews.get(player);
    if (preview) {
      preview.currentSpeed = 1;
    }
  };
  video.addEventListener('loadstart', resetState);

  // Set the video speed to default
  video.playbackRate = DEFAULT_SPEED;
  
  // Always show 1x on the button initially
  updateButton(speedBtn, 1);
  
  // Store reference with current speed
  activePreviews.set(player, { 
    video, 
    speedBtn,
    currentSpeed: DEFAULT_SPEED,
    resetState
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

// Handle keyboard shortcuts
function onKeyDown(e) {
  // Ignore if user is typing in an input field
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable) {
    return;
  }

  // Find the active preview (video is playing)
  const activePreview = Array.from(activePreviews.values()).find(p => 
    p.video && !p.video.paused
  );

  if (!activePreview) return;

  const { video, speedBtn } = activePreview;
  const currentSpeed = video.playbackRate;
  let newSpeed = currentSpeed;

  if (e.shiftKey && (e.key === '>' || e.key === '.')) {
    // Increase speed (Shift + >)
    newSpeed = SPEEDS.find(s => s > currentSpeed) || SPEEDS[SPEEDS.length - 1];
  } else if (e.shiftKey && (e.key === '<' || e.key === ',')) {
    // Decrease speed (Shift + <)
    newSpeed = [...SPEEDS].reverse().find(s => s < currentSpeed) || SPEEDS[0];
  } else if (e.key.toLowerCase() === 's') {
    // Cycle speed (S key)
    handleSpeedChange(speedBtn, video);
    return;
  } else {
    return;
  }

  // Apply new speed if changed and not handled by handleSpeedChange
  if (newSpeed !== currentSpeed) {
    video.playbackRate = newSpeed;
    updateButton(speedBtn, newSpeed);
    activePreview.currentSpeed = newSpeed;
  }
}


function init() {
  addStyles();
  
  // Add keyboard listener
  document.addEventListener("keydown", onKeyDown);


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
