import React, { useState } from "react";
import "./App.css";

const App = () => {
  const [status, setStatus] = useState("Idle");
  const [loading, setLoading] = useState(false);
  const [emailContent, setEmailContent] = useState("");

  const handleScan = async () => {
    setLoading(true);
    setStatus("Scanning...");

    try {
      // Get the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      // Send a message to content.js to extract email content
      const response = await chrome.tabs.sendMessage(tab.id, { action: "extractEmailContent" });

      const emailText = response?.result?.message || "No email content found.";
      setEmailContent(emailText);

      // Send extracted content to the backend API
      const res = await fetch("http://127.0.0.1:5000/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: emailText }), // ✅ Correct JSON key
      });

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const data = await res.json();
      setStatus(data.safe ? "✅ Safe" : "❌ Not Safe");
    } catch (error) {
      console.error("Error scanning email:", error);
      setStatus("Error scanning.");
    }

    setLoading(false);
  };

  return (
    <div className="popup-container">
      <h1 className="title">ZeroPhish</h1>

      <div className="scan-section">
        <button className="scan-btn" onClick={handleScan} disabled={loading}>
          {loading ? "Scanning..." : "SCAN"}
        </button>
      </div>

      {loading && <div className="loading-bar"><div className="progress"></div></div>}

      <div className={`status ${status.toLowerCase().includes("safe") ? "safe" : "not-safe"}`}>
        {status}
      </div>

      <div className="report-section">
        <h3>📊 Report</h3>
        <p>{emailContent ? emailContent.slice(0, 100) + "..." : "No email content scanned yet."}</p>
      </div>

      <div className="tips">
        <h3>🛡 Safety Tips</h3>
        <ul>
          <li>🔍 Check the sender’s email address.</li>
          <li>⚠️ Look for spelling errors in URLs.</li>
          <li>🚫 Never click suspicious links.</li>
          <li>🔑 Enable two-factor authentication.</li>
        </ul>
      </div>
    </div>
  );
};

export default App;
