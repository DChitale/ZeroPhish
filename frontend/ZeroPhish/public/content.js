// Function to extract email content
function extractEmailContent() {
    let emailBody = document.querySelector("div[role='main']")?.innerText || "No email content found.";
    return emailBody.trim();
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "extractEmailContent") {
        let emailText = extractEmailContent();

        // Send data to the backend
        fetch("http://127.0.0.1:5000/scan", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ message: emailText })
        })
        .then(response => response.json())
        .then(data => {
            console.log("Scan result:", data);
            sendResponse({ result: data });
        })
        .catch(error => {
            console.error("Error sending data:", error);
            sendResponse({ error: "Failed to send data" });
        });

        return true; // Keeps the sendResponse callback alive for async request
    }
});
