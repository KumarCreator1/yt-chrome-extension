// YouTube Preview Speed Control - Content Script
console.log('YouTube Preview Speed Control: Script loaded');

// Configuration
const SPEEDS = [0.5, 1, 1.5, 2];
const STORAGE_KEY = 'youtubePreviewSpeed';
let currentSpeed = 1.0;

// Add styles for the speed button
const style = document.createElement('style');
style.textContent = `
  .ytp-preview-speed-btn {
    position: absolute;
    right: 50px;
    bottom: 10px;
    width: 40px;
    height: 24px;
    background: rgba(28, 28, 28, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 4px;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 500;
    font-family: 'Roboto', Arial, sans-serif;
    cursor: pointer;
    z-index: 100;
    opacity: 0.9;
    transition: all 0.2s ease;
    padding: 0 8px;
    box-sizing: border-box;
  }
  
  .ytp-preview-speed-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    opacity: 1;
  }
  
  .ytp-preview-speed-btn:active {
    transform: scale(0.95);
  }
  
  .ytp-preview-speed-btn::after {
    content: '×';
    margin-left: 4px;
    font-size: 14px;
    opacity: 0.8;
  }
  
  .ytp-preview-speed-btn.speed-05x::after { content: '0.5×'; }
  .ytp-preview-speed-btn.speed-1x::after { content: '1×'; }
  .ytp-preview-speed-btn.speed-15x::after { content: '1.5×'; }
  .ytp-preview-speed-btn.speed-2x::after { content: '2×'; }
`;
document.head.appendChild(style);

// Load saved speed
chrome.storage.local.get([STORAGE_KEY], (result) => {
  if (result[STORAGE_KEY]) {
    currentSpeed = parseFloat(result[STORAGE_KEY]);
    console.log('Loaded saved speed:', currentSpeed);
  }
});

// Create speed button
function createSpeedButton(videoElement) {
  const button = document.createElement('button');
  button.className = 'ytp-preview-speed-btn';
  button.setAttribute('aria-label', 'Playback speed');
  button.setAttribute('title', 'Change playback speed (0.5×, 1×, 1.5×, 2×)');
  
  // Set initial speed class
  updateButtonSpeed(button, currentSpeed);
  
  // Add click handler
  button.addEventListener('click', (e) => {
    e.stopPropagation();
    const currentIndex = SPEEDS.indexOf(currentSpeed);
    const newIndex = (currentIndex + 1) % SPEEDS.length;
    const newSpeed = SPEEDS[newIndex];
    
    // Update speed
    updateSpeed(videoElement, newSpeed);
    updateButtonSpeed(button, newSpeed);
    
    // Save preference
    chrome.storage.local.set({ [STORAGE_KEY]: newSpeed });
  });
  
  return button;
}

// Update video speed
function updateSpeed(videoElement, speed) {
  if (videoElement && typeof videoElement.playbackRate === 'number') {
    videoElement.playbackRate = speed;
    currentSpeed = speed;
    console.log('Set preview speed to:', speed + 'x');
  }
}

// Update button appearance based on speed
function updateButtonSpeed(button, speed) {
  // Remove all speed classes
  button.className = button.className
    .split(' ')
    .filter(c => !c.startsWith('speed-'))
    .join(' ');
  
  // Add current speed class
  const speedClass = `speed-${speed.toString().replace('.', '')}x`;
  button.classList.add(speedClass);
}

// Handle preview player
function handlePreviewPlayer(player) {
  const video = player.querySelector('video.html5-main-video');
  const unmuteButton = player.querySelector('button.ytp-unmute');
  
  if (!video || !unmuteButton) {
    console.log('Video or unmute button not found in player');
    return;
  }
  
  // Check if button already exists
  if (player.querySelector('.ytp-preview-speed-btn')) {
    return;
  }
  
  // Create and insert speed button
  const speedButton = createSpeedButton(video);
  unmuteButton.parentNode.insertBefore(speedButton, unmuteButton.nextSibling);
  console.log('Speed button added to preview player');
  
  // Set initial speed
  updateSpeed(video, currentSpeed);
  
  // Cleanup observer
  const observer = new MutationObserver((mutations, obs) => {
    if (!document.body.contains(player)) {
      console.log('Preview player removed, disconnecting observer');
      obs.disconnect();
    }
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
}

// Main observer for preview players
const mainObserver = new MutationObserver((mutations) => {
  // Find all preview players that aren't the main player
  const previewPlayers = Array.from(document.querySelectorAll('.html5-video-player'))
    .filter(player => {
      // Skip if it's the main player
      if (player.closest('#movie_player, .html5-video-player.ytd-watch-flexy')) {
        return false;
      }
      
      // Check if it has a video element
      return !!player.querySelector('video.html5-main-video');
    });
  
  // Handle each preview player
  previewPlayers.forEach(handlePreviewPlayer);
});

// Start observing
mainObserver.observe(document.body, {
  childList: true,
  subtree: true
});

console.log('YouTube Preview Speed Control: Observer started');
