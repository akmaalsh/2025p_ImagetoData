# Image to Text Converter

A modern web application that extracts text and paragraphs from images using OpenAI's GPT-4V (GPT-4 Vision) model. Perfect for converting text content from images into various formats including Excel, CSV, and text files.

## Features

* **Advanced AI Processing:** Utilizes OpenAI's GPT-4V model for accurate text extraction
* **Multiple Format Support:** Export data to Excel, CSV, and text formats
* **Batch Processing:** Upload and process multiple images at once
* **Modern UI:** Clean, responsive interface with collapsible results
* **Real-time Status:** Visual feedback during processing
* **Download Options:** Multiple download formats for flexibility

## Prerequisites

* **Node.js and npm:** Download and install from [https://nodejs.org/](https://nodejs.org/) (LTS version recommended)
* **OpenAI API Key:** You need an API key from OpenAI. Get one at [https://platform.openai.com/account/api-keys](https://platform.openai.com/account/api-keys)
* **Python 3.x:** Required for the launcher script (included in most modern operating systems)
* **npx serve:** Will be installed automatically when running the application

## Setup

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/akmaalsh/2025p_ImagetoData.git
    cd 2025p_ImagetoData
    ```

2.  **Install Backend Dependencies:**
    ```bash
    cd "Image to Text/backend"
    npm install
    ```

3.  **Configure Backend Environment:**
    * Create a file named `.env` inside the `backend/` directory
    * Add your OpenAI API key to the `.env` file:
        ```
        OPENAI_API_KEY=sk-YourActualOpenAiApiKeyGoesHere
        ```
    * The `.env` file is already in `.gitignore` to prevent accidentally committing your API key

## Running the Application

### Option 1: Using the Python Launcher (Recommended)

The easiest way to run the application is using the Python launcher script:

1. Open a terminal/command prompt
2. Navigate to the project directory:
   ```bash
   cd "Image to Text"
   ```
3. Run the launcher script:
   ```bash
   python launch.py
   ```

The launcher script will:
- Start the backend server
- Start the frontend server
- Display the URLs for both servers
- Automatically open your default web browser to the frontend
- Show real-time server output in the terminal
- Handle graceful shutdown when you press Ctrl+C

### Option 2: Manual Launch

If you prefer to run the servers manually:

1.  **Start the Backend Server:**
    ```bash
    cd "Image to Text/backend"
    node server.js
    ```
    Keep this terminal running.

2.  **Start the Frontend Server:**
    * Open a new terminal window
    * Navigate to the frontend directory:
    ```bash
    cd "Image to Text/frontend"
    npx serve
    ```
    * Copy the URL shown in the terminal (usually something like `http://localhost:3000`)
    * Open the URL in your web browser

## Using the Application

1. Once the application is running, you'll see a modern web interface
2. Upload one or more images containing text by dragging and dropping or clicking the upload area
3. Click "Extract Paragraphs" to begin processing
4. Once processing is complete, you can:
   - View the extracted text in a collapsible format
   - Download the results in your preferred format (Excel, CSV, or text)
   - Process more images as needed

## Important Notes

* **API Costs:** Each text extraction uses the OpenAI GPT-4V API, which has associated costs. Be mindful of your usage.
* **Image Quality:** The accuracy of text extraction depends on:
  - Image quality and resolution
  - Text clarity and formatting
  - Font styles and sizes
* **Error Handling:**
  - Check the browser's developer console (F12) for frontend errors
  - Check the terminal output for backend errors
  - Common issues include invalid API keys or network problems
* **Security:** Your OpenAI API key is:
  - Only stored locally in the `.env` file
  - Only used by the backend server
  - Never exposed to the frontend
  - Protected from accidental commits by `.gitignore`

## Troubleshooting

* If the browser doesn't open automatically, copy the frontend URL from the terminal and paste it into your browser
* If you see "Invalid API Key" errors, check your `.env` file configuration
* If the servers won't start, make sure no other applications are using ports 3000 or 3001
* To stop the application:
  - If using the launcher: Press Ctrl+C in the terminal
  - If running manually: Press Ctrl+C in both terminal windows

## Author & Credits
Created by [Akmal Shldn](https://github.com/akmaalsh)
- GitHub: [akmaalsh](https://github.com/akmaalsh)
- LinkedIn: [Akmal Shalahuddin](https://www.linkedin.com/in/akmalshalahuddin/)

## Acknowledgments
- OpenAI for the GPT-4 Vision API
- SheetJS for Excel file handling
- The open-source community for various tools and libraries used 