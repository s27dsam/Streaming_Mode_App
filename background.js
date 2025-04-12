// Focus Mode state variables
let focusMode = false;
let focusTabId = null;
let focusWindowId = null;
let lastFocusTabInfo = null; // For auto-resume feature

// Initialize state from storage when extension loads
chrome.storage.local.get(['focusMode', 'focusTabId', 'focusWindowId', 'lastFocusTabInfo'], (result) => {
  if (result.focusMode) {
    focusMode = result.focusMode;
    focusTabId = result.focusTabId;
    focusWindowId = result.focusWindowId;
    lastFocusTabInfo = result.lastFocusTabInfo;
    
    // Verify the focus tab still exists
    chrome.tabs.get(focusTabId, (tab) => {
      if (chrome.runtime.lastError) {
        // Tab doesn't exist anymore, store info for auto-resume
        if (lastFocusTabInfo) {
          chrome.storage.local.set({
            focusMode: false,
            focusTabId: null,
            focusWindowId: null,
            canResume: true,
            lastFocusTabInfo: lastFocusTabInfo
          });
        } else {
          disableFocusMode();
        }
      }
    });
  }
});

// Listen for commands from keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-streaming-mode") {
    if (focusMode) {
      disableFocusMode();
    } else {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
          const currentTab = tabs[0];
          enableFocusMode(currentTab.id, currentTab.windowId);
        }
      });
    }
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
    // Save the last tab info before disabling focus mode for auto-resume feature
    if (lastFocusTabInfo) {
      chrome.storage.local.set({ 
        lastFocusTabInfo: lastFocusTabInfo,
        canResume: true,
        focusMode: false,
        focusTabId: null,
        focusWindowId: null
      });
    } else {
      disableFocusMode();
    }
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
  
  // Get tab info for auto-resume feature
  chrome.tabs.get(tabId, (tab) => {
    lastFocusTabInfo = {
      url: tab.url,
      title: tab.title,
      timestamp: new Date().getTime()
    };
    
    // Save state to storage
    chrome.storage.local.set({
      focusMode: true,
      focusTabId: tabId,
      focusWindowId: windowId,
      lastFocusTabInfo: lastFocusTabInfo,
      canResume: false
    });
  });
  
  // Update extension icon to show active state
  chrome.action.setBadgeText({ text: "ON" });
  chrome.action.setBadgeBackgroundColor({ color: "#FF5722" });
  
  // Force Chrome to stay on the focus tab in case it's not active
  chrome.tabs.update(tabId, { active: true });
}

// Function to disable focus mode
function disableFocusMode() {
  focusMode = false;
  focusTabId = null;
  focusWindowId = null;
  
  // Clear state in storage but keep lastFocusTabInfo for auto-resume
  chrome.storage.local.set({
    focusMode: false,
    focusTabId: null,
    focusWindowId: null,
    canResume: lastFocusTabInfo ? true : false
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
          // Tab doesn't exist anymore
          sendResponse({
            focusMode: false,
            focusTabId: null,
            focusWindowId: null,
            canResume: lastFocusTabInfo ? true : false,
            lastTabInfo: lastFocusTabInfo
          });
        } else {
          sendResponse({
            focusMode: focusMode,
            focusTabId: focusTabId,
            focusWindowId: focusWindowId,
            tabTitle: tab.title,
            canResume: false
          });
        }
      });
      return true; // Required for async sendResponse
    } else {
      // Check storage for resume info
      chrome.storage.local.get(['canResume', 'lastFocusTabInfo'], (result) => {
        sendResponse({
          focusMode: false,
          focusTabId: null,
          focusWindowId: null,
          canResume: result.canResume || false,
          lastTabInfo: result.lastFocusTabInfo || null
        });
      });
      return true;
    }
  }
  else if (message.action === "resumeLastSession") {
    // Get last session info from storage
    chrome.storage.local.get(['lastFocusTabInfo'], (result) => {
      if (result.lastFocusTabInfo) {
        chrome.tabs.create({ url: result.lastFocusTabInfo.url }, (tab) => {
          enableFocusMode(tab.id, tab.windowId);
          sendResponse({ success: true });
        });
      } else {
        sendResponse({ success: false, error: "No session to resume" });
      }
    });
    return true;
  }
  return false;
});