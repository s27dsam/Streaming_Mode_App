let streamingModeBorderDiv = null;

function applyBorder() {
  if (!streamingModeBorderDiv) {
    streamingModeBorderDiv = document.createElement('div');
    streamingModeBorderDiv.id = 'streaming-mode-border';
    streamingModeBorderDiv.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      border: 2px solid #FF5722; /* Accent color from popup.html */
      pointer-events: none;
      z-index: 999999999; /* Ensure it's on top */
      box-sizing: border-box;
    `;
    document.documentElement.appendChild(streamingModeBorderDiv);
  }
}

function removeBorder() {
  if (streamingModeBorderDiv) {
    streamingModeBorderDiv.remove();
    streamingModeBorderDiv = null;
  }
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'applyStreamingModeBorder') {
    applyBorder();
  } else if (message.action === 'removeStreamingModeBorder') {
    removeBorder();
  }
});

// If the content script is injected while streaming mode is already active (e.g., page refresh)
// we can check the background script's state and apply the border if needed.
// This requires a message exchange, which we'll handle in background.js when injecting.
