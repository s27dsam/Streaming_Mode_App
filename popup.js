document.addEventListener('DOMContentLoaded', () => {
  const startButton = document.getElementById('startFocus');
  const stopButton = document.getElementById('stopFocus');
  const statusMessage = document.getElementById('statusMessage');
  const currentTabElement = document.getElementById('currentTab');
  
  // Check current focus mode status when popup opens
  chrome.runtime.sendMessage({ action: "getStatus" }, (response) => {
    updateUI(response.focusMode);
    
    if (response.focusMode && response.focusTabId) {
      // Get focus tab info to display
      chrome.tabs.get(response.focusTabId, (tab) => {
        if (!chrome.runtime.lastError) {
          currentTabElement.textContent = `Focused on: ${tab.title}`;
          currentTabElement.style.display = 'block';
        }
      });
    }
  });
  
  // Start focus mode
  startButton.addEventListener('click', () => {
    console.log("Start button clicked");
    startButton.textContent = "Starting...";
    startButton.disabled = true;
    
    chrome.runtime.sendMessage({ action: "startFocusMode" }, (response) => {
      if (response && response.success) {
        console.log("Focus mode started successfully");
        updateUI(true);
        
        // Display the focused tab info
        if (response.tabTitle) {
          currentTabElement.textContent = `Focused on: ${response.tabTitle}`;
          currentTabElement.style.display = 'block';
        } else {
          // Get current tab info to display as fallback
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
              currentTabElement.textContent = `Focused on: ${tabs[0].title}`;
              currentTabElement.style.display = 'block';
            }
          });
        }
        
        // Close the popup after a brief delay so user sees the status change
        setTimeout(() => {
          window.close();
        }, 1000);
      } else {
        startButton.textContent = "Start Focus Mode";
        startButton.disabled = false;
        alert("Failed to start Focus Mode. Please try again.");
      }
    });
  });
  
  // Stop focus mode
  stopButton.addEventListener('click', () => {
    console.log("Stop button clicked");
    stopButton.textContent = "Stopping...";
    stopButton.disabled = true;
    
    chrome.runtime.sendMessage({ action: "stopFocusMode" }, (response) => {
      if (response && response.success) {
        console.log("Focus mode stopped successfully");
        updateUI(false);
        
        // Close the popup after a brief delay so user sees the status change
        setTimeout(() => {
          window.close();
        }, 1000);
      } else {
        stopButton.textContent = "Stop Focus Mode";
        stopButton.disabled = false;
        alert("Failed to stop Focus Mode. Please try again.");
      }
    });
  });
  
  // Update UI based on focus mode status
  function updateUI(isActive) {
    if (isActive) {
      statusMessage.textContent = 'Focus Mode is currently ON';
      statusMessage.className = 'status active';
      startButton.disabled = true;
      stopButton.disabled = false;
    } else {
      statusMessage.textContent = 'Focus Mode is currently OFF';
      statusMessage.className = 'status inactive';
      startButton.disabled = false;
      stopButton.disabled = true;
      currentTabElement.style.display = 'none';
    }
  }
});