// YouTube Preview Speed Control - Content Script
console.log("YouTube Speed Control: Script loaded");

let currentSpeed = 1.0;

// Add Font Awesome
const fontAwesome = document.createElement("link");
fontAwesome.rel = "stylesheet";
fontAwesome.href =
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";
document.head.appendChild(fontAwesome);

// Add styles for the speed button
const style = document.createElement("style");
style.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&display=swap');
  
  /* Speed control button */
  .ytp-speed-control {
    position: relative !important;
    display: inline-flex !important;
    margin-left: 8px !important;
    width: 32px !important;
    height: 32px !important;
    display: flex !important;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    background: rgba(28, 28, 28, 0.8) !important;
    border: 1px solid rgba(255, 255, 255, 0.3) !important;
    border-radius: 16px !important;
    color: white !important;
    font-size: 14px !important;
    z-index: 100 !important;
    padding: 0 !important;
    margin: 0 !important;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
    transition: all 0.2s ease !important;
  }
  
  .ytp-speed-control:hover {
    background: rgba(255, 0, 0, 0.8) !important;
    transform: scale(1.1);
  }
  .ytp-speed-control:hover {
    opacity: 1;
  }
  .ytp-speed-text {
    font-size: 12px;
    font-weight: 500;
    color: white;
    margin-left: 2px;
    margin-right: 4px;
    text-shadow: 0 0 2px rgba(0, 0, 0, 0.8);
    font-family: 'Roboto', Arial, sans-serif;
    line-height: 1;
  }
  
  .ytp-speed-icon {
    font-size: 14px;
    color: white;
  }
  .ytp-speed-tooltip {
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(28, 28, 28, 0.9);
    color: white;
    padding: 5px 9px;
    border-radius: 2px;
    font-size: 12px;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s;
    margin-bottom: 5px;
  }
  .ytp-speed-control:hover .ytp-speed-tooltip {
    opacity: 1;
  }
`;
document.head.appendChild(style);

// Create speed control button
function createSpeedButton() {
  const speedButton = document.createElement("button");
  speedButton.className = "ytp-button ytp-speed-control";
  speedButton.innerHTML = `
        <i class="fas fa-gauge-high ytp-speed-icon"></i>
        <span class="ytp-speed-text">1x</span>
        <div class="ytp-speed-tooltip">Speed: 1x (click to change)</div>
    `;
  return speedButton;
}

// Track if we've already added the button
let speedButtonAdded = false;

// Add speed button to preview controls
function addSpeedButton() {
  // If we've already added the button, don't add it again
  if (speedButtonAdded) return;

  // Try to find the time elapsed element which appears during preview
  const timeElapsed = document.querySelector(
    '[aria-label*="time elapsed"], [aria-label*="Time elapsed"]'
  );

  if (timeElapsed && timeElapsed.parentNode) {
    // Remove any existing buttons first
    const existingButtons = document.querySelectorAll(".ytp-speed-control");
    existingButtons.forEach((btn) => btn.remove());

    // Create and add the button
    const speedButton = createSpeedButton();

    // Insert right after the time elapsed element
    timeElapsed.parentNode.insertBefore(speedButton, timeElapsed.nextSibling);

    setupSpeedButton(speedButton);
    speedButtonAdded = true;
    console.log("Speed control button added next to time elapsed");
    return;
  }

  // Fallback to previous method if time elapsed element not found
  const previewControls = document.querySelector(
    ".ytp-preview-controls, .ytp-preview"
  );

  if (previewControls) {
    // Remove any existing buttons first
    const existingButtons =
      previewControls.querySelectorAll(".ytp-speed-control");
    existingButtons.forEach((btn) => btn.remove());

    const speedButton = createSpeedButton();
    previewControls.appendChild(speedButton);
    setupSpeedButton(speedButton);
    speedButtonAdded = true;
    console.log("Speed control button added to preview controls (fallback)");
  } else {
    console.log("Preview elements not found, will retry...");
    setTimeout(addSpeedButton, 500);
  }
}

// Setup click handler for speed button
function setupSpeedButton(button) {
  button.addEventListener("click", (e) => {
    e.stopPropagation();
    const speeds = [0.5, 1, 1.5, 2];
    const currentSpeedText =
      button.querySelector(".ytp-speed-text").textContent;
    const currentSpeed = parseFloat(currentSpeedText);
    const currentIndex = speeds.indexOf(currentSpeed);
    const newIndex = (currentIndex + 1) % speeds.length;
    const newSpeed = speeds[newIndex];

    // Update button text
    button.querySelector(".ytp-speed-text").textContent = `${newSpeed}x`;
    button.querySelector(
      ".ytp-speed-tooltip"
    ).textContent = `Speed: ${newSpeed}x (click to change)`;

    // Update video speed
    const video = document.querySelector("video.html5-main-video");
    if (video) {
      video.playbackRate = newSpeed;
      console.log("Video speed set to:", newSpeed);
    }

    // Save preference
    chrome.storage.sync.set({ previewSpeed: newSpeed });
  });
}

// Watch for preview activation
const observer = new MutationObserver((mutations) => {
  let shouldCheck = false;

  mutations.forEach((mutation) => {
    // Check if any added nodes contain preview-related elements
    if (mutation.addedNodes.length > 0) {
      shouldCheck = true;
    }

    // Check if preview controls were modified
    if (
      mutation.type === "childList" &&
      (mutation.target.classList.contains("ytp-preview") ||
        mutation.target.classList.contains("ytp-preview-controls"))
    ) {
      shouldCheck = true;
    }
  });

  if (shouldCheck) {
    addSpeedButton();
  }
});

// Start observing with more specific options
observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: false,
  characterData: false,
});

// Also try to add the button immediately in case the preview is already loaded
setTimeout(() => {
  console.log("Initial button check");
  addSpeedButton();
}, 1000);

// Load saved speed
chrome.storage.sync.get(["previewSpeed"], (result) => {
  if (result.previewSpeed) {
    currentSpeed = result.previewSpeed;
    console.log("Loaded saved speed:", currentSpeed);
    // Update button text if it exists
    const speedText = document.querySelector(".ytp-speed-text");
    if (speedText) {
      speedText.textContent = `${currentSpeed}x`;
    }
  }
});
