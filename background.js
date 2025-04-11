// Focus Mode state variables
let focusMode = false;
let focusTabId = null;
let focusWindowId = null;

// Initialize state from storage when extension loads
chrome.storage.local.get(['focusMode', 'focusTabId', 'focusWindowId'], (result) => {
  if (result.focusMode) {
    focusMode = result.focusMode;
    focusTabId = result.focusTabId;
    focusWindowId = result.focusWindowId;
    
    // Verify the focus tab still exists
    chrome.tabs.get(focusTabId, (tab) => {
      if (chrome.runtime.lastError) {
        // Tab doesn't exist anymore, turn off focus mode
        disableFocusMode();
      }
    });
  }
});

// Listen for tab activation events
chrome.tabs.onActivated.addListener((activeInfo) => {
  if (focusMode && activeInfo.tabId !== focusTabId) {
    // User tried to switch to another tab, switch back to focus tab
    console.log("Tab switch detected - switching back to Streaming tab");
    chrome.tabs.update(focusTabId, { active: true });
  }
});

// Listen for tab creation events - this is crucial to prevent new tabs
chrome.tabs.onCreated.addListener((tab) => {
  if (focusMode && tab.id !== focusTabId) {
    console.log("New tab created - closing it immediately");
    // Small timeout to ensure the tab is fully created before removing
    setTimeout(() => {
      chrome.tabs.remove(tab.id);
    }, 50);
  }
});

// Listen for tab removal events - disable focus mode if focus tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (focusMode && tabId === focusTabId) {
    disableFocusMode();
  }
});

// Listen for window focus changes
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (focusMode && windowId !== focusWindowId && windowId !== chrome.windows.WINDOW_ID_NONE) {
    // User switched to another window, try to bring focus window to front
    chrome.windows.update(focusWindowId, { focused: true });
  }
});

// Function to enable focus mode
function enableFocusMode(tabId, windowId) {
  focusMode = true;
  focusTabId = tabId;
  focusWindowId = windowId;
  
  console.log("Streaming Mode enabled on tab ID:", tabId);
  
  // Save state to storage
  chrome.storage.local.set({
    focusMode: true,
    focusTabId: tabId,
    focusWindowId: windowId
  });
  
  // Update extension icon to show active state
  chrome.action.setBadgeText({ text: "ON" });
  chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });
  
  // Force Chrome to stay on the focus tab in case it's not active
  chrome.tabs.update(tabId, { active: true });
  
  // Also close any existing tabs that aren't the focus tab
  chrome.tabs.query({}, (tabs) => {
    // First, make sure we're on the right tab
    chrome.tabs.update(tabId, { active: true });
  });
}

// Function to disable focus mode
function disableFocusMode() {
  focusMode = false;
  focusTabId = null;
  focusWindowId = null;
  
  // Clear state in storage
  chrome.storage.local.set({
    focusMode: false,
    focusTabId: null,
    focusWindowId: null
  });
  
  // Update extension icon to show inactive state
  chrome.action.setBadgeText({ text: "" });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startFocusMode") {
    // Get current tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        const currentTab = tabs[0];
        console.log("Starting Focus Mode on tab:", currentTab.title);
        enableFocusMode(currentTab.id, currentTab.windowId);
        
        // Specifically add listeners for keyboard shortcuts that might open new tabs
        chrome.tabs.update(currentTab.id, { active: true });
        
        sendResponse({ success: true, mode: "started", tabTitle: currentTab.title });
      }
    });
    return true; // Required for async sendResponse
  } 
  else if (message.action === "stopFocusMode") {
    console.log("Stopping Streaming Mode");
    disableFocusMode();
    sendResponse({ success: true, mode: "stopped" });
  }
  else if (message.action === "getStatus") {
    // If there's focus mode active, verify the tab still exists
    if (focusMode && focusTabId) {
      chrome.tabs.get(focusTabId, (tab) => {
        if (chrome.runtime.lastError) {
          // Tab doesn't exist anymore, disable focus mode
          console.log("Streaming tab no longer exists, disabling Streaming Mode");
          disableFocusMode();
          sendResponse({
            focusMode: false,
            focusTabId: null,
            focusWindowId: null
          });
        } else {
          sendResponse({
            focusMode: focusMode,
            focusTabId: focusTabId,
            focusWindowId: focusWindowId,
            tabTitle: tab.title
          });
        }
      });
      return true; // Required for async sendResponse
    } else {
      sendResponse({
        focusMode: focusMode,
        focusTabId: focusTabId,
        focusWindowId: focusWindowId
      });
    }
  }
  return false;
});