chrome.runtime.onInstalled.addListener(() => {
    console.log("ZeroPhish Extension Installed!");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "logScan") {
        console.log("Scan request received:", message.data);
        sendResponse({ status: "Logged in background.js" });
    }
});
