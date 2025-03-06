import os
import time
import vt
from dotenv import load_dotenv


load_dotenv("/mnt/data/code/ZeroPhish/.env")
API = os.getenv("VT_API")

if not API:
    print("Error: VT_API key is missing.")
    exit()


FILE_PATH = "/mnt/data/code/test.pdf"

with vt.Client(API) as client:
    
    def get_sha256(file_path):
        import hashlib
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()

    file_hash = get_sha256(FILE_PATH)

    
    try:
        file_report = client.get_object(f"/files/{file_hash}")
        print("\n--- File Already Scanned! ---")
    except vt.error.APIError:
        print("\n--- File Not Found. Uploading for Scan... ---")
        
        
        with open(FILE_PATH, "rb") as f:
            analysis = client.scan_file(f)

        analysis_id = analysis.id
        print(f"Scan Submitted, ID: {analysis_id}")

        
        while True:
            analysis = client.get_object(f"/analyses/{analysis_id}")
            print(f"Scan Status: {analysis.status}")

            if analysis.status == "completed":
                print("Scan Completed!")
                break
            time.sleep(30)  

        
        file_report = client.get_object(f"/files/{file_hash}")

    
    print("\n--- Detection Stats ---")
    print(f"Malicious: {file_report.last_analysis_stats['malicious']}")
    print(f"Suspicious: {file_report.last_analysis_stats['suspicious']}")
    print(f"Undetected: {file_report.last_analysis_stats['undetected']}")
    print(f"Harmless: {file_report.last_analysis_stats['harmless']}")
