# Image to Data Converter (Gemini)

A modern web application that transforms tables in images into structured data formats using Google's Gemini AI model. Perfect for converting tables from images into Excel or CSV format with high accuracy.

## Features

* **Advanced AI Processing:** Utilizes Google's Gemini AI model for accurate table extraction
* **Intuitive Interface:** User-friendly design with step-by-step guidance
* **Batch Processing:** Handle multiple images at once with real-time progress tracking
* **Flexible Output:** Download results as CSV or Excel files
* **Column Specification:** Define exact column names and expected content for better accuracy
* **Real-time Progress:** WebSocket-powered progress updates for batch operations
* **Responsive Design:** Works seamlessly on desktop and mobile devices

## Prerequisites

* **Node.js 16+:** Download from [https://nodejs.org/](https://nodejs.org/)
* **Gemini API Key:** You need an API key from Google AI Studio. Get one at [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)

## Quick Start

### 1. Clone or Download
```bash
git clone <repository-url>
cd image-to-data-gemini
```

### 2. Install Dependencies
```bash
cd backend
npm install
```

### 3. Launch the Application
```bash
# Option A: Use the launcher (recommended)
python3 launch.py

# Option B: Manual launch
cd backend
node server.js
# Then open frontend/index.html in your browser
```

### 4. Enter API Key
* When you first open the application, you'll be prompted to enter your Gemini API key
* The key is stored securely in your browser's local storage
* You can reset your API key anytime using the "Reset API Key" button

## How to Use

1. **Upload Images:** Drag and drop or select one or more images containing tables
2. **Define Context:** 
   - Describe what the image contains
   - Specify the number of columns
   - Name each column and provide example content
3. **Extract Data:** Click "Extract Tables" and watch the progress
4. **Download Results:** Get your structured data as CSV or Excel files

## File Structure

```
image-to-data-gemini/
├── frontend/           # Web interface
│   ├── index.html     # Main page
│   ├── script.js      # Frontend logic
│   └── style.css      # Styling
├── backend/           # Node.js server
│   ├── server.js      # Main server with Gemini API
│   ├── package.json   # Dependencies
│   └── package-lock.json
├── launch.py          # Python launcher script
└── README.md          # This file
```

## Technical Details

* **Frontend:** Vanilla HTML/CSS/JavaScript with modern ES6+ features
* **Backend:** Node.js with Express, Multer for file uploads, WebSocket for real-time updates
* **AI Integration:** Google Gemini API for image analysis and table extraction
* **Styling:** CSS Grid/Flexbox with custom CSS variables for theming

## API Configuration

The application requires a Gemini API key that you can obtain from [Google AI Studio](https://makersuite.google.com/app/apikey). The API key is:
* Stored locally in your browser
* Sent securely with each request
* Never stored on our servers
* Required for each image processing request

## Important Notes

* **API Costs:** Each table extraction uses the Google Gemini API, which has associated costs. Be mindful of your usage.
* **Image Quality:** Higher quality, well-lit images with clear table structures will yield better results.
* **Column Specifications:** The more specific and accurate your column descriptions, the better the extraction results.
* **Privacy:** Images are processed through Google's Gemini API. Review Google's privacy policy if handling sensitive data.

## Troubleshooting

* **Server won't start:** Ensure Node.js 16+ is installed and dependencies are installed via `npm install`
* **API errors:** Check your Gemini API key is valid and has sufficient quota
* **Poor extraction results:** Try improving image quality, providing more specific column descriptions, or adjusting the image description
* **Browser compatibility:** Use a modern browser with ES6+ support (Chrome 60+, Firefox 55+, Safari 12+)

## Support

For issues or questions, please check the console logs in your browser's developer tools for detailed error messages.