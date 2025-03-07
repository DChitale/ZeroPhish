import vt
import os
import time
import json
import asyncio
from dotenv import load_dotenv
from flask import Flask, request, jsonify

load_dotenv(".env")
API = os.getenv("VT_API")

if not API:
    print("Error: VT_API key is missing.")
    exit()

app = Flask(__name__)


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
    import re
    url_regex = r'https?://[^\s,]+'
    return re.findall(url_regex, message)


@app.route('/scan', methods=['POST'])
def scan_data():
    """Flask route to process incoming requests."""
    data = request.get_json()

    if not data or "message" not in data:
        return jsonify({"error": "Invalid request"}), 400

    urls = extract_urls(data["message"])
    print(urls)

    results = asyncio.run(process_urls(urls))

    return jsonify(results)


if __name__ == '__main__':
    app.run(debug=True)
