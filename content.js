// YouTube Preview Speed Control - Content Script
console.log('YouTube Preview Speed Control: Script loaded');

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
    text-shadow: 0 0 2px rgba(0, 0, 0, 0.8);
    background: rgba(0, 0, 0, 0.5);
    border: none;
    border-radius: 4px;
    padding: 4px 8px;
  }
  .ytp-preview-speed-btn:hover {
    opacity: 1;
    background: rgba(0, 0, 0, 0.7);
  }
`;
document.head.appendChild(style);

// Function to find the preview container
function findPreviewContainer(element) {
    // Try different selectors for different YouTube layouts
    return element.closest([
        'ytd-thumbnail-overlay-time-status-renderer',
        '.ytp-cued-thumbnail-overlay',
        '.ytp-preview',
        '.ytp-preview-controls',
        'ytd-rich-grid-media',
        'ytd-thumbnail',
        'ytd-video-preview'
    ].join(','));
}

// Function to add speed button to preview overlay
function addSpeedButtonToPreview(thumbnail) {
    console.log('Attempting to add speed button to preview');
    
    // Find the preview controls container
    const previewContainer = findPreviewContainer(thumbnail);
    if (!previewContainer) {
        console.log('No preview container found');
        return;
    }

    // Check if we've already added the button
    if (previewContainer.querySelector('.ytp-preview-speed-btn')) {
        console.log('Speed button already exists');
        return;
    }

    // Find the buttons container (try multiple selectors)
    let controlsContainer = previewContainer.querySelector('.ytp-preview-controls, .ytp-cards-button, .ytp-button, .ytp-chrome-controls');
    
    // If no controls container found, create one
    if (!controlsContainer) {
        console.log('No controls container found, creating one');
        controlsContainer = document.createElement('div');
        controlsContainer.className = 'ytp-chrome-controls';
        controlsContainer.style.display = 'flex';
        controlsContainer.style.alignItems = 'center';
        previewContainer.appendChild(controlsContainer);
    }

    // Create the speed button
    const speedButton = document.createElement('button');
    speedButton.className = 'ytp-preview-speed-btn';
    speedButton.textContent = `${currentSpeed}x`;
    speedButton.setAttribute('aria-label', `Playback speed: ${currentSpeed}x`);
    speedButton.title = `Speed: ${currentSpeed}x`;
    
    // Insert the button in the controls
    controlsContainer.appendChild(speedButton);
    console.log('Speed button added to DOM');

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
        
        // Find and update video speed
        const video = previewContainer.querySelector('video') || 
                     document.querySelector('video.html5-main-video');
        
        if (video) {
            console.log('Setting video speed to:', currentSpeed);
            video.playbackRate = currentSpeed;
        } else {
            console.log('No video element found');
        }
        
        // Save preference
        chrome.storage.sync.set({ previewPlaybackSpeed: currentSpeed });
    });
}

// Watch for preview hover events
function setupPreviewObserver() {
    console.log('Setting up mutation observer');
    
    observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) { // Element node
                    // Check if this is a thumbnail or preview element
                    const thumbnail = node.matches('ytd-thumbnail, .ytp-cued-thumbnail-overlay, .ytp-preview, ytd-rich-grid-media') ? 
                        node : 
                        node.closest('ytd-thumbnail, .ytp-cued-thumbnail-overlay, .ytp-preview, ytd-rich-grid-media');
                    
                    if (thumbnail) {
                        console.log('Preview element found, will add speed button');
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
    
    // Also observe the main content element where YouTube loads videos
    const content = document.querySelector('ytd-page-manager, #page-manager, #contents');
    if (content) {
        observer.observe(content, {
            childList: true,
            subtree: true
        });
    }
}

// Check for previews on hover
function setupHoverListener() {
    document.addEventListener('mouseover', (e) => {
        const thumbnail = e.target.closest('ytd-thumbnail, .ytp-cued-thumbnail-overlay, ytd-rich-grid-media');
        if (thumbnail) {
            console.log('Hover detected on thumbnail');
            setTimeout(() => {
                addSpeedButtonToPreview(thumbnail);
            }, 300);
        }
    }, { passive: true });
}

// Initialize
function init() {
    console.log('Initializing YouTube Preview Speed Control');
    
    // Load saved speed
    chrome.storage.sync.get(['previewPlaybackSpeed'], (result) => {
        if (result.previewPlaybackSpeed) {
            currentSpeed = result.previewPlaybackSpeed;
            console.log('Loaded saved speed:', currentSpeed);
        }
    });

    // Set up observer for preview hovers
    setupPreviewObserver();
    setupHoverListener();
    
    // Also check for previews that might already be in the DOM
    console.log('Checking for existing previews');
    const checkExistingPreviews = setInterval(() => {
        const previews = document.querySelectorAll('ytd-thumbnail, .ytp-cued-thumbnail-overlay, ytd-rich-grid-media');
        console.log(`Found ${previews.length} preview elements`);
        
        if (previews.length > 0) {
            previews.forEach(thumbnail => {
                addSpeedButtonToPreview(thumbnail);
            });
            clearInterval(checkExistingPreviews);
        }
    }, 500);
    
    // Clean up after 10 seconds
    setTimeout(() => {
        clearInterval(checkExistingPreviews);
    }, 10000);
}

// Start when page is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Listen for messages from popup (if any)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getSpeed') {
        sendResponse({ speed: currentSpeed });
    }
    return true;
});
