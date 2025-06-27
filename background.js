// Focus Mode state variables
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
        console.error("Error verifying focus tab existence on startup:", chrome.runtime.lastError.message);
        // Tab doesn't exist anymore, store info for auto-resume
        if (lastFocusTabInfo) {
          chrome.storage.local.set({
            focusMode: false,
            focusTabId: null,
            focusWindowId: null,
            canResume: true,
            lastFocusTabInfo: lastFocusTabInfo
          }, () => {
            if (chrome.runtime.lastError) {
              console.error("Error saving state after tab verification failure:", chrome.runtime.lastError.message);
            }
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
        if (chrome.runtime.lastError) {
          console.error("Error querying active tab:", chrome.runtime.lastError.message);
          return;
        }
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
    chrome.tabs.update(focusTabId, { active: true }, () => {
      if (chrome.runtime.lastError) {
        console.error(`Error switching back to focus tab ${focusTabId}:`, chrome.runtime.lastError.message);
      }
    });
  }
});

// Listen for tab creation events - this is crucial to prevent new tabs
chrome.tabs.onCreated.addListener((tab) => {
  if (focusMode && tab.id !== focusTabId) {
    console.log("New tab created - closing it immediately");
    // Small timeout to ensure the tab is fully created before removing
    setTimeout(() => {
      chrome.tabs.remove(tab.id, () => {
        if (chrome.runtime.lastError) {
          console.error(`Error removing newly created tab ${tab.id}:`, chrome.runtime.lastError.message);
        }
      });
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
    chrome.windows.update(focusWindowId, { focused: true }, () => {
      if (chrome.runtime.lastError) {
        console.error(`Error updating window ${focusWindowId} to focused:`, chrome.runtime.lastError.message);
      }
    });
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
    if (chrome.runtime.lastError) {
      console.error(`Error getting tab ${tabId} info:`, chrome.runtime.lastError.message);
      return;
    }
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
    }, () => {
      if (chrome.runtime.lastError) {
        console.error("Error saving focus mode state to storage:", chrome.runtime.lastError.message);
      }
    });
  });
  
  // Update extension icon to show active state
  chrome.action.setBadgeText({ text: "ON" });
  chrome.action.setBadgeBackgroundColor({ color: "#FF5722" });
  
  // Force Chrome to stay on the focus tab in case it's not active
  chrome.tabs.update(tabId, { active: true }, () => {
    if (chrome.runtime.lastError) {
      console.error(`Error updating tab ${tabId} to active:`, chrome.runtime.lastError.message);
    }
  });

  // Send message to content script to apply visual cue
  chrome.tabs.sendMessage(tabId, { action: 'applyStreamingModeBorder' }, () => {
    if (chrome.runtime.lastError) {
      console.warn(`Could not send message to content script in tab ${tabId}. It might not be loaded yet or the tab is not accessible:`, chrome.runtime.lastError.message);
    }
  });
}

// Function to disable focus mode
function disableFocusMode() {
  const tabIdToRemoveBorder = focusTabId; // Capture the tabId before nulling

  focusMode = false;
  focusTabId = null;
  focusWindowId = null;
  
  // Clear state in storage but keep lastFocusTabInfo for auto-resume
  chrome.storage.local.set({
    focusMode: false,
    focusTabId: null,
    focusWindowId: null,
    canResume: lastFocusTabInfo ? true : false
  }, () => {
    if (chrome.runtime.lastError) {
      console.error("Error clearing focus mode state from storage:", chrome.runtime.lastError.message);
    }
  });
  
  // Update extension icon to show inactive state
  chrome.action.setBadgeText({ text: "" });

  // Send message to content script to remove visual cue
  if (tabIdToRemoveBorder) {
    chrome.tabs.sendMessage(tabIdToRemoveBorder, { action: 'removeStreamingModeBorder' }, () => {
      if (chrome.runtime.lastError) {
        console.warn(`Could not send message to content script in tab ${tabIdToRemoveBorder} to remove border:`, chrome.runtime.lastError.message);
      }
    });
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startFocusMode") {
    // Get current tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        console.error("Error querying active tab for startFocusMode:", chrome.runtime.lastError.message);
        sendResponse({ success: false, error: "Failed to get current tab info." });
        return;
      }
      if (tabs.length > 0) {
        const currentTab = tabs[0];
        console.log("Starting Focus Mode on tab:", currentTab.title);
        enableFocusMode(currentTab.id, currentTab.windowId);
        
        sendResponse({ success: true, mode: "started", tabTitle: currentTab.title });
      } else {
        sendResponse({ success: false, error: "No active tab found." });
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
          console.error(`Error getting focus tab ${focusTabId} for status check:`, chrome.runtime.lastError.message);
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
        if (chrome.runtime.lastError) {
          console.error("Error getting resume info from storage:", chrome.runtime.lastError.message);
        }
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
      if (chrome.runtime.lastError) {
        console.error("Error getting lastFocusTabInfo from storage for resume:", chrome.runtime.lastError.message);
        sendResponse({ success: false, error: "Failed to retrieve session info." });
        return;
      }
      if (result.lastFocusTabInfo) {
        chrome.tabs.create({ url: result.lastFocusTabInfo.url }, (tab) => {
          if (chrome.runtime.lastError) {
            console.error("Error creating tab for resume session:", chrome.runtime.lastError.message);
            sendResponse({ success: false, error: "Failed to create new tab." });
            return;
          }
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