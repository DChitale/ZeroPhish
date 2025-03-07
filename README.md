# ZeroPhish - Email Phishing Detection Tool

ZeroPhish is a tool designed to help users identify potential phishing attempts in emails by analyzing email content and scanning URLs for malicious indicators.

## Features

- Email content analysis for phishing indicators
- URL scanning using VirusTotal API
- Detection of suspicious phrases and urgency indicators
- User-friendly interface with detailed scan results

## Project Structure

The project consists of two main components:

1. **Backend (Flask API)**
   - Handles email content analysis
   - Performs URL scanning via VirusTotal API
   - Provides assessment of phishing risk

2. **Frontend (React)**
   - User interface for submitting emails for scanning
   - Displays detailed scan results
   - Works both as a web application and browser extension

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Install the required dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Create a `.env` file in the backend directory with your VirusTotal API key:
   ```
   VT_API=your_virustotal_api_key_here
   ```

4. Start the backend server:
   ```
   python main.py
   ```
   The server will run on http://localhost:5000

### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd frontend/ZeroPhish
   ```

2. Install the required dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```
   The application will be available at http://localhost:5173

## Usage

1. Start both the backend and frontend servers as described above.
2. Open the web application in your browser.
3. Paste the email content you want to analyze into the text area.
4. Click the "SCAN" button to analyze the email.
5. Review the detailed results, including:
   - Overall safety assessment
   - Detected suspicious phrases
   - Urgency indicators
   - URL scan results

## Browser Extension Mode

The application can also function as a browser extension that can extract email content directly from webmail interfaces. This functionality requires additional setup and browser extension packaging.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 