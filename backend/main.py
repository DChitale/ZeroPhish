import vt
import os
import time
import json
import asyncio
import re
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS

load_dotenv(".env")
API = os.getenv("VT_API")

if not API:
    print("Error: VT_API key is missing.")
    exit()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes


async def scan_url(client, url):
    """Submits a URL to VirusTotal for scanning and returns the analysis ID."""
    try:
        analysis = await client.scan_url_async(url)
        return analysis.id
    except Exception as e:
        print(f"Error scanning {url}: {e}")
        return None


async def get_scan_result(client, analysis_id):
    """Retrieves scan results using the analysis ID."""
    while True:
        try:
            analysis = await client.get_object_async(f"/analyses/{analysis_id}")

            if analysis.status == "completed":
                return analysis.stats
            await asyncio.sleep(5)
        except Exception as e:
            print(f"Error fetching scan results: {e}")
            return None


async def process_urls(urls):
    """Handles the scanning and result retrieval asynchronously."""
    results = {}

    async with vt.Client(API) as client:
        scan_tasks = {url: scan_url(client, url) for url in urls}
        scan_ids = {url: scan_id for url, scan_id in zip(scan_tasks.keys(), await asyncio.gather(*scan_tasks.values())) if scan_id}

        # Fetch results
        for url, scan_id in scan_ids.items():
            stats = await get_scan_result(client, scan_id)
            results[url] = "UNSAFE" if stats and (
                stats.get("malicious", 0) > 0 or stats.get("suspicious", 0) > 0) else "SAFE"

    return results


def extract_urls(message):
    """Extracts URLs from the message using regex."""
    url_regex = r'https?://[^\s,]+'
    return re.findall(url_regex, message)


def analyze_email_content(email_content):
    """Analyzes email content for phishing indicators."""
    indicators = {
        "suspicious_phrases": [],
        "urgency_indicators": 0,
        "grammar_issues": 0
    }
    
    # Check for suspicious phrases
    suspicious_phrases = [
        "verify your account", "update your information", "confirm your details",
        "unusual activity", "suspicious activity", "click here", "login to continue",
        "your account will be suspended", "limited time offer", "act now"
    ]
    
    for phrase in suspicious_phrases:
        if phrase.lower() in email_content.lower():
            indicators["suspicious_phrases"].append(phrase)
    
    # Check for urgency indicators
    urgency_words = ["urgent", "immediately", "now", "today", "asap", "expires", "limited"]
    for word in urgency_words:
        if re.search(r'\b' + word + r'\b', email_content.lower()):
            indicators["urgency_indicators"] += 2
    
    # Simple grammar check (very basic)
    grammar_issues = ["to received", "kindly replied", "to confirmed", "your details is"]
    for issue in grammar_issues:
        if issue.lower() in email_content.lower():
            indicators["grammar_issues"] += 2
    
    return indicators


@app.route('/scan', methods=['POST'])
def scan_data():
    """Flask route to process incoming requests for URL scanning."""
    data = request.get_json()

    if not data or "message" not in data:
        return jsonify({"error": "Invalid request"}), 400

    urls = extract_urls(data["message"])
    print(f"Extracted URLs: {urls}")

    results = asyncio.run(process_urls(urls))

    return jsonify(results)


@app.route('/scan_email', methods=['POST'])
def scan_email():
    """Flask route to process incoming email content."""
    data = request.get_json()

    if not data or "message" not in data:
        return jsonify({"error": "Invalid request"}), 400

    email_content = data["message"]
    
    # Extract and scan URLs
    urls = extract_urls(email_content)
    url_results = {}
    if urls:
        url_results = asyncio.run(process_urls(urls))
    
    # Analyze email content
    content_analysis = analyze_email_content(email_content)
    
    # Determine overall safety
    is_safe = True
    unsafe_reasons = []
    
    # Check for unsafe URLs
    if "UNSAFE" in url_results.values():
        is_safe = False
        unsafe_reasons.append("Contains potentially malicious URLs")
    
    # Check for suspicious phrases (increased threshold from 1 to 2)
    if len(content_analysis["suspicious_phrases"]) >= 3:
        is_safe = False
        unsafe_reasons.append(f"Contains {len(content_analysis['suspicious_phrases'])} suspicious phrases")
    
    # Check for urgency indicators (kept threshold at 2)
    if content_analysis["urgency_indicators"] >= 2:
        is_safe = False
        unsafe_reasons.append(f"Contains {content_analysis['urgency_indicators']} urgency indicators")
    
    # Check for grammar issues
    if content_analysis["grammar_issues"] >= 1:
        is_safe = False
        unsafe_reasons.append("Contains suspicious grammar patterns")
    
    recommendation = "This content appears to be safe." if is_safe else "This content shows signs of being a phishing attempt."
    if not is_safe and unsafe_reasons:
        recommendation += " Reasons: " + ", ".join(unsafe_reasons) + "."
    
    response = {
        "safe": is_safe,
        "url_scan": url_results,
        "content_analysis": content_analysis,
        "recommendation": recommendation
    }
    
    return jsonify(response)


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')
