import React, { useState } from "react";
import "./App.css";

const App = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [status, setStatus] = useState("idle");

  const handleScan = () => {
    setIsScanning(true);
    setStatus("idle");

    setTimeout(() => {
      const isSafe = Math.random() > 0.3; // Randomly decide Safe or Not Safe
      setStatus(isSafe ? "safe" : "not-safe");
      setIsScanning(false);
    }, 3000);
  };

  return (
    <div className="popup-container">
      <h1 className="title">ZeroPhish</h1>

      <div className="scan-section">
        <button className="scan-btn" onClick={handleScan} disabled={isScanning}>
          {isScanning ? "Scanning..." : "SCAN"}
        </button>
      </div>

      {isScanning && (
        <div className="loading-bar">
          <div className="progress"></div>
        </div>
      )}

      <div className={`status ${status}`}>
        {status === "idle"
          ? "Click Scan to Check"
          : status === "safe"
          ? "Safe ✅"
          : "Not Safe ❌"}
      </div>

      <div className="report-section">
        <h2>Report</h2>
        <p>
          {status === "safe"
            ? "No threats detected."
            : status === "not-safe"
            ? "Phishing detected!"
            : "Awaiting scan..."}
        </p>
      </div>

      <div className="tips">
        <h3>🛡 Safety Tips</h3>
        <ul>
          <li>🔍 Check URLs before clicking.</li>
          <li>✉️ Beware of unknown senders.</li>
          <li>🔑 Enable two-factor authentication.</li>
          <li>📢 Report suspicious emails.</li>
        </ul>
      </div>
    </div>
  );
};

export default App;