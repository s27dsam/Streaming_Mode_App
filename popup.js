document.addEventListener('DOMContentLoaded', () => {
  // Get UI elements
  const startButton = document.getElementById('startFocus');
  const stopButton = document.getElementById('stopFocus');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const currentTabElement = document.getElementById('currentTab');
  const resumeCard = document.getElementById('resumeCard');
  const resumeInfo = document.getElementById('resumeInfo');
  const resumeButton = document.getElementById('resumeButton');
  const shortcutDisplay = document.getElementById('shortcutDisplay');
  const footerText = document.getElementById('footerText');
  
  // Set correct keyboard shortcut based on platform
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  if (isMac) {
    shortcutDisplay.textContent = '⌘+Shift+L';
    footerText.textContent = 'Press ⌘+Shift+L to toggle Streaming Mode';
  } else {
    shortcutDisplay.textContent = 'Ctrl+Shift+S';
    footerText.textContent = 'Press Ctrl+Shift+S to toggle Streaming Mode';
  }
  
  // Check current focus mode status when popup opens
  chrome.runtime.sendMessage({ action: "getStatus" }, (response) => {
    updateUI(response);
  });
  
  // Start focus mode
  startButton.addEventListener('click', () => {
    console.log("Start button clicked");
    startButton.textContent = "Starting...";
    startButton.disabled = true;
    
    chrome.runtime.sendMessage({ action: "startFocusMode" }, (response) => {
      if (response && response.success) {
        console.log("Focus mode started successfully");
        updateUI({
          focusMode: true,
          tabTitle: response.tabTitle,
          canResume: false
        });
        
        // Close the popup after a brief delay so user sees the status change
        setTimeout(() => {
          window.close();
        }, 1000);
      } else {
        startButton.textContent = "Start Streaming Mode";
        startButton.disabled = false;
        showError("Failed to start Streaming Mode");
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
        updateUI({
          focusMode: false,
          canResume: true
        });
        
        // Close the popup after a brief delay so user sees the status change
        setTimeout(() => {
          window.close();
        }, 1000);
      } else {
        stopButton.textContent = "Stop Streaming Mode";
        stopButton.disabled = false;
        showError("Failed to stop Streaming Mode");
      }
    });
  });
  
  // Resume previous session
  resumeButton.addEventListener('click', () => {
    console.log("Resume button clicked");
    resumeButton.textContent = "Resuming...";
    resumeButton.disabled = true;
    
    chrome.runtime.sendMessage({ action: "resumeLastSession" }, (response) => {
      if (response && response.success) {
        console.log("Session resumed successfully");
        // Close the popup immediately since a new tab will be opened
        window.close();
      } else {
        resumeButton.textContent = "Resume Streaming";
        resumeButton.disabled = false;
        showError("Failed to resume session");
      }
    });
  });
  
  // Update UI based on focus mode status
  function updateUI(status) {
    if (status.focusMode) {
      // Focus mode is active
      statusDot.classList.add('active');
      statusText.textContent = 'Streaming Mode is ON';
      startButton.disabled = true;
      stopButton.disabled = false;
      
      // Show current tab info if available
      if (status.tabTitle) {
        currentTabElement.textContent = `Currently streaming: ${status.tabTitle}`;
        currentTabElement.classList.remove('hidden');
      } else {
        currentTabElement.classList.add('hidden');
      }
      
      // Hide resume card
      resumeCard.classList.add('hidden');
      
    } else {
      // Focus mode is inactive
      statusDot.classList.remove('active');
      statusText.textContent = 'Streaming Mode is OFF';
      startButton.disabled = false;
      stopButton.disabled = true;
      currentTabElement.classList.add('hidden');
      
      // Check if we can resume a previous session
      if (status.canResume && status.lastTabInfo) {
        resumeCard.classList.remove('hidden');
        resumeInfo.textContent = `Previous session: ${status.lastTabInfo.title}`;
        resumeButton.disabled = false;
      } else {
        resumeCard.classList.add('hidden');
      }
    }
  }
  
  // Show error message
  function showError(message) {
    // You could implement a toast notification here
    console.error(message);
    
    // Simple implementation: change status text briefly
    const originalText = statusText.textContent;
    statusText.textContent = message;
    statusText.style.color = '#F44336';
    
    setTimeout(() => {
      statusText.textContent = originalText;
      statusText.style.color = '';
    }, 3000);
  }
});