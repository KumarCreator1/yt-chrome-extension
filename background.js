// Background script for YouTube Preview Speed Control

// Set default speed preference when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['previewSpeedIndex'], (result) => {
    if (result.previewSpeedIndex === undefined) {
      chrome.storage.local.set({ previewSpeedIndex: 0 }); // Default to 0.5x
    }
  });
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // Future: Open options page or show popup
  console.log('Extension icon clicked');
});
