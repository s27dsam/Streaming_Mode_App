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

// Listen for direct commands from the background script
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'applyStreamingModeBorder') {
    applyBorder();
  } else if (message.action === 'removeStreamingModeBorder') {
    removeBorder();
  }
});

// When the content script loads, ask the background script if streaming mode is active for this tab.
// This makes the border appear correctly on page reloads or if the initial "apply" message was missed.
chrome.runtime.sendMessage({ action: "queryTabStatus" }, (response) => {
  if (chrome.runtime.lastError) {
    // This can happen if the popup is open, which has its own message listener. We can ignore this error.
    return;
  }
  if (response && response.isFocusTab) {
    applyBorder();
  }
});
