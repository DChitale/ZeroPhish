import React, { useState, useEffect } from "react";
import "./App.css";

const App = () => {
  const [status, setStatus] = useState("Idle");
  const [loading, setLoading] = useState(false);
  const [emailContent, setEmailContent] = useState("");
  const [scanResults, setScanResults] = useState(null);
  const [error, setError] = useState("");
  const [emails, setEmails] = useState([]);
  const [showEmailSelector, setShowEmailSelector] = useState(false);
  const [fetchingEmails, setFetchingEmails] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  // Check if user is already authenticated on component mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = () => {
    chrome.runtime.sendMessage({ action: "getAuthToken", interactive: false }, (response) => {
      if (response && response.success) {
        setIsAuthenticated(true);
      }
    });
  };

  const handleScan = async () => {
    setLoading(true);
    setStatus("Scanning...");
    setError("");
    setScanResults(null);

    try {
      if (emailContent) {
        await scanEmail(emailContent);
      } else {
        setError("Please select an email to scan.");
        setStatus("Error");
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

  const authenticateWithGmail = () => {
    setFetchingEmails(true);
    setError("");
    
    chrome.runtime.sendMessage({ action: "getAuthToken", interactive: true }, (response) => {
      if (response && response.success) {
        setIsAuthenticated(true);
        fetchEmails(response.token);
      } else {
        setFetchingEmails(false);
        setError("Authentication failed. Please try again.");
        console.error("Auth error:", response?.error);
      }
    });
  };

  const fetchEmails = async (token) => {
    try {
      setFetchingEmails(true);
      
      // If no token is provided, get it from background script
      if (!token) {
        return new Promise((resolve) => {
          chrome.runtime.sendMessage({ action: "getAuthToken", interactive: false }, (response) => {
            if (response && response.success) {
              fetchEmails(response.token);
              resolve();
            } else {
              setFetchingEmails(false);
              setError("Failed to get authentication token. Please try again.");
              resolve();
            }
          });
        });
      }
      
      // Fetch list of messages
      const messagesResponse = await fetch(
        "https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=30",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!messagesResponse.ok) {
        throw new Error(`Failed to fetch messages: ${messagesResponse.status}`);
      }

      const messagesData = await messagesResponse.json();
      const messageIds = messagesData.messages || [];

      // Fetch details for each message
      const emailDetails = await Promise.all(
        messageIds.map(async (message) => {
          const detailResponse = await fetch(
            `https://www.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=full`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (!detailResponse.ok) {
            throw new Error(`Failed to fetch message details: ${detailResponse.status}`);
          }

          return detailResponse.json();
        })
      );

      // Process email details
      const processedEmails = emailDetails.map((email) => {
        const headers = email.payload.headers;
        const subject = headers.find((h) => h.name === "Subject")?.value || "No Subject";
        const sender = headers.find((h) => h.name === "From")?.value || "Unknown Sender";
        const date = new Date(parseInt(email.internalDate)).toLocaleString();
        const snippet = email.snippet || "";

        // Extract email body
        let body = "";
        if (email.payload.parts) {
          const textPart = email.payload.parts.find(
            (part) => part.mimeType === "text/plain"
          );
          if (textPart && textPart.body.data) {
            body = atob(textPart.body.data.replace(/-/g, "+").replace(/_/g, "/"));
          }
        } else if (email.payload.body && email.payload.body.data) {
          body = atob(email.payload.body.data.replace(/-/g, "+").replace(/_/g, "/"));
        }

        return {
          id: email.id,
          subject,
          sender,
          date,
          snippet,
          body,
        };
      });

      setEmails(processedEmails);
      setShowEmailSelector(true);
    } catch (err) {
      console.error("Error fetching emails:", err);
      setError("Failed to fetch emails. Please try again.");
    } finally {
      setFetchingEmails(false);
    }
  };

  const selectEmail = (email) => {
    setEmailContent(email.body);
    setShowEmailSelector(false);
  };

  const logoutFromGmail = () => {
    chrome.runtime.sendMessage({ action: "revokeAuthToken" }, (response) => {
      if (response && response.success) {
        setIsAuthenticated(false);
        setEmails([]);
      } else {
        setError("Failed to logout. Please try again.");
      }
    });
  };

  return (
    <div className="popup-container">
      <header className="app-header">
        <h1 className="title">ZeroPhish</h1>
      </header>

      {/* Gmail Authentication Section */}
      <div className="gmail-auth-section">
        {isAuthenticated ? (
          <div className="auth-status">
            <span className="auth-status-text">✓ Connected to Gmail</span>
            <div className="button-group">
              <button className="auth-btn logout" onClick={logoutFromGmail}>
                Disconnect
              </button>
              <button 
                className="select-email-btn" 
                onClick={() => fetchEmails()} 
                disabled={fetchingEmails}
              >
                {fetchingEmails ? "Loading Emails..." : "Select Email"}
              </button>
            </div>
          </div>
        ) : (
          <button 
            className="auth-btn login" 
            onClick={authenticateWithGmail}
            disabled={fetchingEmails}
          >
            {fetchingEmails ? "Connecting..." : "Connect to Gmail"}
          </button>
        )}
      </div>

      {/* Email selector modal */}
      {showEmailSelector && (
        <div className="email-selector-modal">
          <div className="email-selector-content">
            <div className="email-selector-header">
              <h2>Select an Email</h2>
              <button className="close-btn" onClick={() => setShowEmailSelector(false)}>×</button>
            </div>
            
            {emails.length === 0 ? (
              <p className="no-emails">No emails found.</p>
            ) : (
              <div className="email-list">
                {emails.map((email) => (
                  <div key={email.id} className="email-item" onClick={() => selectEmail(email)}>
                    <div className="email-header">
                      <span className="email-subject">{email.subject}</span>
                      <span className="email-date">{email.date}</span>
                    </div>
                    <div className="email-sender">{email.sender}</div>
                    <div className="email-snippet">{email.snippet}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Email content display */}
      {emailContent && (
        <div className="email-content-preview">
          <div className="email-preview-header">
            <h3>Content Preview</h3>
            {isAuthenticated && (
              <button 
                className="change-email-btn" 
                onClick={() => fetchEmails()} 
                disabled={fetchingEmails}
              >
                {fetchingEmails ? "Loading..." : "Change Email"}
              </button>
            )}
          </div>
          <div className="email-preview-text">
            {emailContent.length > 150 
              ? `${emailContent.substring(0, 150)}...` 
              : emailContent}
          </div>
        </div>
      )}

      {/* Manual email input */}
      <div className="email-input">
        <textarea
          placeholder="Paste content here..."
          value={emailContent}
          onChange={handleEmailChange}
          rows={5}
        />
      </div>

      <div className="scan-section">
        <button className="scan-btn" onClick={handleScan} disabled={loading || !emailContent}>
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
          <div className={`recommendation ${scanResults.safe ? "safe-recommendation" : "unsafe-recommendation"}`}>
            <h3>{scanResults.safe ? "✅ Recommendation" : "⚠️ Warning"}</h3>
            <p>{scanResults.recommendation}</p>
          </div>

          {scanResults.content_analysis?.suspicious_phrases?.length > 0 && (
            <div className="suspicious-phrases">
              <h3>⚠️ Suspicious Phrases Detected</h3>
              <ul>
                {scanResults.content_analysis.suspicious_phrases.map((phrase, index) => (
                  <li key={index}>{phrase}</li>
                ))}
              </ul>
            </div>
          )}

          {scanResults.content_analysis?.urgency_indicators > 0 && (
            <div className="urgency-indicators">
              <h3>⏰ Urgency Indicators</h3>
              <p>This content contains {scanResults.content_analysis.urgency_indicators} urgency indicators, which are common in phishing attempts.</p>
            </div>
          )}

          {scanResults.url_scan && Object.keys(scanResults.url_scan).length > 0 && (
            <div className="url-scan">
              <h3>🔗 URL Scan Results</h3>
              <ul>
                {Object.entries(scanResults.url_scan).map(([url, result], index) => (
                  <li key={index} className={result === "UNSAFE" ? "unsafe-url" : "safe-url"}>
                    <div className="url-text" title={url}>
                      {url.length > 40 ? `${url.substring(0, 37)}...` : url}
                    </div>
                    <span className={result === "UNSAFE" ? "unsafe" : "safe"}>{result}</span>
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

      {/* Debug section - hidden by default */}
      {scanResults && (
        <div className="debug-section">
          <button 
            className="debug-toggle" 
            onClick={() => setShowDebug(!showDebug)}
          >
            {showDebug ? "Hide Debug Info" : "Show Debug Info"}
          </button>
          
          {showDebug && (
            <pre className="debug-info">
              {JSON.stringify(scanResults, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};

export default App;
