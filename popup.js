document.addEventListener('DOMContentLoaded', () => {
  const speedButtons = document.querySelectorAll('.speed-btn');
  let currentSpeed = 1;

  // Load saved speed
  chrome.storage.sync.get(['playbackSpeed'], (result) => {
    if (result.playbackSpeed) {
      currentSpeed = result.playbackSpeed;
      updateActiveButton();
    }
  });

  // Add click event to speed buttons
  speedButtons.forEach(button => {
    button.addEventListener('click', () => {
      const speed = parseFloat(button.dataset.speed);
      currentSpeed = speed;
      updateActiveButton();
      setPlaybackSpeed(speed);
    });
  });

  // Update active button style
  function updateActiveButton() {
    speedButtons.forEach(btn => {
      if (parseFloat(btn.dataset.speed) === currentSpeed) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  // Send message to content script to update playback speed
  function setPlaybackSpeed(speed) {
    // Save speed preference
    chrome.storage.sync.set({ playbackSpeed: speed });

    // Send message to active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url.includes('youtube.com')) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'setSpeed', speed: speed });
      }
    });
  }
});
