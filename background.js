console.log('Alarm-based service worker loaded');

let focusSession = {
  active: false,
  currentUser: null
};

// Message listener
// Handle popup reminders
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'setPopupReminder') {
    const timeUntilReminder = message.reminderTime - Date.now();
    
    if (timeUntilReminder > 0) {
      setTimeout(() => {
        // Show badge reminder
        chrome.action.setBadgeText({ text: "!" });
        chrome.action.setBadgeBackgroundColor({ color: "#ff4444" });
        
        // Optional: Show notification
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon.png',
          title: 'Focus Monitor',
          message: 'Check your focus status - open the extension!'
        });
      }, timeUntilReminder);
    }
    
    sendResponse({ success: true });
  }
});
function startAlarmBasedCapture(sessionData) {
  focusSession.active = true;
  focusSession.currentUser = sessionData.currentUser;
  
  console.log('Starting alarm-based capture');
  
  // Capture immediately
  captureAndUpload();
  
  // Create repeating alarm every 10 seconds
  chrome.alarms.create('focusCapture', { 
    delayInMinutes: 0.17, // ~10 seconds
    periodInMinutes: 0.17  // repeat every ~10 seconds
  });
  
  // End session alarm
  chrome.alarms.create('sessionEnd', { 
    delayInMinutes: sessionData.durationMinutes || 60 
  });
}

function stopAlarmBasedCapture() {
  focusSession.active = false;
  chrome.alarms.clear('focusCapture');
  chrome.alarms.clear('sessionEnd');
  console.log('Alarm-based capture stopped');
}

// Handle alarms
chrome.alarms.onAlarm.addListener((alarm) => {
  console.log('Alarm triggered:', alarm.name);
  
  if (alarm.name === 'focusCapture' && focusSession.active) {
    captureAndUpload();
  } else if (alarm.name === 'sessionEnd') {
    stopAlarmBasedCapture();
    // Clear popup storage
    chrome.storage.local.remove(['focusSessionStartTime', 'focusSessionDuration', 'focusSessionActive']);
  }
});

async function captureAndUpload() {
  if (!focusSession.active) return;
  
  try {
    console.log('Alarm capture attempt');
    
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs.length) return;
    
    const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: "png" });
    if (!dataUrl) return;
    
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    
    const formData = new FormData();
    formData.append("screenshot", blob, "screenshot.png");
    formData.append("user_id", focusSession.currentUser?.databaseId || 'anonymous');
    
    const uploadResponse = await fetch("https://chrome-focus-plugin.onrender.com/api/upload", {
      method: "POST",
      body: formData,
    });
    
    const result = await uploadResponse.json();
    console.log('Alarm capture result:', result.status);
    
    chrome.storage.local.set({
      lastUploadStatus: result.status,
      lastUploadTime: Date.now()
    });
    
  } catch (err) {
    console.error('Alarm capture error:', err);
  }
}