import React, { useState } from "react";
import "./App.css";

const App = () => {
  const [status, setStatus] = useState("Idle");
  const [loading, setLoading] = useState(false);
  const [emailContent, setEmailContent] = useState("");
  const [scanResults, setScanResults] = useState(null);
  const [error, setError] = useState("");

  const handleScan = async () => {
    setLoading(true);
    setStatus("Scanning...");
    setError("");
    setScanResults(null);

    try {
      // For browser extension mode
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        try {
          // Get the active tab
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          
          // Send a message to content.js to extract email content
          const response = await chrome.tabs.sendMessage(tab.id, { action: "extractEmailContent" });
          
          const emailText = response?.result?.message || "No email content found.";
          setEmailContent(emailText);
          
          // Continue with scanning the extracted content
          await scanEmail(emailText);
        } catch (chromeError) {
          console.error("Chrome API error:", chromeError);
          // Fall back to manual input if Chrome API fails
          if (emailContent) {
            await scanEmail(emailContent);
          } else {
            setError("Please enter email content to scan.");
            setStatus("Error");
          }
        }
      } else {
        // Web app mode - use the manually entered content
        if (emailContent) {
          await scanEmail(emailContent);
        } else {
          setError("Please enter email content to scan.");
          setStatus("Error");
        }
      }
    } catch (error) {
      console.error("Error scanning email:", error);
      setError("Error connecting to scanning service. Please try again.");
      setStatus("Error");
    }

    setLoading(false);
  };

  const scanEmail = async (content) => {
    try {
      // Send extracted content to the backend API
      const res = await fetch("http://localhost:5000/scan_email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content }),
      });

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const data = await res.json();
      setScanResults(data);
      setStatus(data.safe ? "✅ Safe" : "❌ Potentially Unsafe");
    } catch (error) {
      console.error("API error:", error);
      throw error;
    }
  };

  const handleEmailChange = (e) => {
    setEmailContent(e.target.value);
  };

  return (
    <div className="popup-container">
      <h1 className="title">ZeroPhish</h1>

      {/* Email input for web app mode */}
      <div className="email-input">
        <textarea
          placeholder="Paste email content here to scan..."
          value={emailContent}
          onChange={handleEmailChange}
          rows={5}
        />
      </div>

      <div className="scan-section">
        <button className="scan-btn" onClick={handleScan} disabled={loading}>
          {loading ? "Scanning..." : "SCAN"}
        </button>
      </div>

      {loading && <div className="loading-bar"><div className="progress"></div></div>}

      {error && <div className="error-message">{error}</div>}

      <div className={`status ${status.toLowerCase().includes("safe") ? "safe" : status === "Error" ? "error" : "not-safe"}`}>
        {status}
      </div>

      {scanResults && (
        <div className="results-container">
          <div className="recommendation">
            <h3>📋 Recommendation</h3>
            <p>{scanResults.recommendation}</p>
          </div>

          {scanResults.content_analysis.suspicious_phrases.length > 0 && (
            <div className="suspicious-phrases">
              <h3>⚠️ Suspicious Phrases Detected</h3>
              <ul>
                {scanResults.content_analysis.suspicious_phrases.map((phrase, index) => (
                  <li key={index}>{phrase}</li>
                ))}
              </ul>
            </div>
          )}

          {scanResults.content_analysis.urgency_indicators > 0 && (
            <div className="urgency-indicators">
              <h3>⏰ Urgency Indicators</h3>
              <p>This email contains {scanResults.content_analysis.urgency_indicators} urgency indicators, which are common in phishing attempts.</p>
            </div>
          )}

          {Object.keys(scanResults.url_scan).length > 0 && (
            <div className="url-scan">
              <h3>🔗 URL Scan Results</h3>
              <ul>
                {Object.entries(scanResults.url_scan).map(([url, result], index) => (
                  <li key={index} className={result === "UNSAFE" ? "unsafe-url" : "safe-url"}>
                    {url}: <span className={result === "UNSAFE" ? "unsafe" : "safe"}>{result}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="tips">
        <h3>🛡 Safety Tips</h3>
        <ul>
          <li>🔍 Check the sender's email address.</li>
          <li>⚠️ Look for spelling errors in URLs.</li>
          <li>🚫 Never click suspicious links.</li>
          <li>🔑 Enable two-factor authentication.</li>
        </ul>
      </div>
    </div>
  );
};

export default App;
