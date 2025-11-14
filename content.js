// YouTube Preview Speed Control - Content Script

let currentSpeed = 1.0;
let observer = null;

// Add styles for the speed button
const style = document.createElement('style');
style.textContent = `
  .ytp-preview-speed-btn {
    width: 40px;
    height: 40px;
    margin-left: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    opacity: 0.9;
    transition: opacity 0.2s;
    color: white;
    font-size: 14px;
    font-weight: 500;
    text-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
    background: none;
    border: none;
    padding: 0;
  }
  .ytp-preview-speed-btn:hover {
    opacity: 1;
  }
`;
document.head.appendChild(style);

// Function to add speed button to preview overlay
function addSpeedButtonToPreview(thumbnail) {
    // Find the preview controls container
    const previewControls = thumbnail.closest('ytd-thumbnail-overlay-time-status-renderer, .ytp-cued-thumbnail-overlay');
    if (!previewControls) return;

    // Check if we've already added the button
    if (previewControls.querySelector('.ytp-preview-speed-btn')) return;

    // Find the buttons container (next to mute button)
    const buttonsContainer = previewControls.querySelector('.ytp-cards-button, .ytp-button');
    if (!buttonsContainer) return;

    // Create the speed button
    const speedButton = document.createElement('button');
    speedButton.className = 'ytp-preview-speed-btn';
    speedButton.textContent = `${currentSpeed}x`;
    speedButton.setAttribute('aria-label', `Playback speed: ${currentSpeed}x`);
    speedButton.title = `Speed: ${currentSpeed}x`;
    
    // Insert the button in the controls
    buttonsContainer.parentNode.insertBefore(speedButton, buttonsContainer.nextSibling);

    // Add click handler
    speedButton.addEventListener('click', (e) => {
        e.stopPropagation();
        const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
        const currentIndex = speeds.indexOf(currentSpeed);
        const newIndex = (currentIndex + 1) % speeds.length;
        currentSpeed = speeds[newIndex];
        
        // Update button
        speedButton.textContent = `${currentSpeed}x`;
        speedButton.setAttribute('aria-label', `Playback speed: ${currentSpeed}x`);
        speedButton.title = `Speed: ${currentSpeed}x`;
        
        // Apply to video
        const video = thumbnail.closest('ytd-rich-item-renderer, ytd-video-renderer')?.querySelector('video');
        if (video) {
            video.playbackRate = currentSpeed;
        }
        
        // Save preference
        chrome.storage.sync.set({ previewPlaybackSpeed: currentSpeed });
    });
}

// Watch for preview hover events
function setupPreviewObserver() {
    observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) {
                    const thumbnail = node.closest('ytd-thumbnail, .ytp-cued-thumbnail-overlay');
                    if (thumbnail) {
                        // Small delay to ensure preview is fully loaded
                        setTimeout(() => {
                            addSpeedButtonToPreview(thumbnail);
                        }, 100);
                    }
                }
            });
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// Initialize
function init() {
    // Load saved speed
    chrome.storage.sync.get(['previewPlaybackSpeed'], (result) => {
        if (result.previewPlaybackSpeed) {
            currentSpeed = result.previewPlaybackSpeed;
        }
    });

    // Set up observer for preview hovers
    setupPreviewObserver();
    
    // Also check for previews that might already be in the DOM
    document.querySelectorAll('ytd-thumbnail, .ytp-cued-thumbnail-overlay').forEach(thumbnail => {
        addSpeedButtonToPreview(thumbnail);
    });
}

// Start when page is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
