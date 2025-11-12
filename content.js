// YouTube Speed Control - Content Script

let currentSpeed = 1.0;

// Apply speed to all videos on the page
function applySpeedToAllVideos(speed) {
  const videos = document.querySelectorAll('video');
  videos.forEach(video => {
    if (video.playbackRate !== speed) {
      video.playbackRate = speed;
    }
  });
}

// Handle speed change messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'setSpeed') {
    currentSpeed = request.speed;
    applySpeedToAllVideos(currentSpeed);
    sendResponse({ success: true });
  }
  return true; // Required for async response
});

// Watch for new video elements being added to the page
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.addedNodes.length) {
      applySpeedToAllVideos(currentSpeed);
      break;
    }
  }
});

// Start observing the document
observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Apply initial speed when the page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Get the saved speed
    chrome.storage.sync.get(['playbackSpeed'], (result) => {
      if (result.playbackSpeed) {
        currentSpeed = result.playbackSpeed;
        applySpeedToAllVideos(currentSpeed);
      }
    });
  });
} else {
  // Page already loaded, get the saved speed
  chrome.storage.sync.get(['playbackSpeed'], (result) => {
    if (result.playbackSpeed) {
      currentSpeed = result.playbackSpeed;
      applySpeedToAllVideos(currentSpeed);
    }
  });
}
