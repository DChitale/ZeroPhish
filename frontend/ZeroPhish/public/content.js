// Content script for ZeroPhish extension
// This script runs in the context of web pages

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "extractEmailContent") {
    try {
      // Extract email content based on the current page
      const emailContent = extractEmailFromPage();
      sendResponse({ success: true, result: { message: emailContent } });
    } catch (error) {
      console.error("Error extracting email content:", error);
      sendResponse({ success: false, error: error.message });
    }
    return true; // Required for async sendResponse
  }
});

/**
 * Extract email content from the current page
 * This function attempts to extract email content from Gmail or Outlook
 */
function extractEmailFromPage() {
  let emailContent = "";
  
  // Check if we're on Gmail
  if (window.location.hostname === "mail.google.com") {
    // Try to get the email body from Gmail
    const emailBody = document.querySelector('.a3s.aiL');
    if (emailBody) {
      emailContent = emailBody.innerText || emailBody.textContent;
    }
    
    // If no email body found, try to get the email preview
    if (!emailContent) {
      const emailPreview = document.querySelector('.Bs.nH.iY.bAt');
      if (emailPreview) {
        emailContent = emailPreview.innerText || emailPreview.textContent;
      }
    }
  } 
  // Check if we're on Outlook
  else if (window.location.hostname === "outlook.live.com") {
    // Try to get the email body from Outlook
    const emailBody = document.querySelector('.ReadingPaneContent');
    if (emailBody) {
      emailContent = emailBody.innerText || emailBody.textContent;
    }
  }
  
  // If no email content found, return a message
  if (!emailContent) {
    return "No email content found. Please make sure you have an email open.";
  }
  
  return emailContent;
} 