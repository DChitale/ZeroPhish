chrome.runtime.onInstalled.addListener(() => {
    console.log("ZeroPhish Extension Installed!");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "logScan") {
        console.log("Scan request received:", message.data);
        sendResponse({ status: "Logged in background.js" });
    }
    
    if (message.action === "getAuthToken") {
        chrome.identity.getAuthToken({ interactive: true }, function(token) {
            if (chrome.runtime.lastError) {
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
                return;
            }
            
            if (token) {
                sendResponse({ success: true, token: token });
            } else {
                sendResponse({ success: false, error: "Failed to get auth token" });
            }
        });
        return true; // Required for async sendResponse
    }
    
    if (message.action === "revokeAuthToken") {
        chrome.identity.getAuthToken({ interactive: false }, function(token) {
            if (token) {
                // Revoke token
                fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`)
                    .then(() => {
                        chrome.identity.removeCachedAuthToken({ token: token }, function() {
                            sendResponse({ success: true });
                        });
                    })
                    .catch(error => {
                        sendResponse({ success: false, error: error.message });
                    });
            } else {
                sendResponse({ success: false, error: "No token to revoke" });
            }
        });
        return true; // Required for async sendResponse
    }
});
