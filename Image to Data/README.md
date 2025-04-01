# Image(s) to Data Converter

A modern web application that transforms tables in images into structured data formats using OpenAI's GPT-4V (GPT-4 Vision) model. Perfect for converting tables from images into Excel or CSV format with high accuracy.

## Features

* **Advanced AI Processing:** Utilizes OpenAI's GPT-4V model for accurate table extraction
* **Multiple Format Support:** Export data to both Excel and CSV formats
* **Batch Processing:** Upload and process multiple images at once
* **Context-Aware:** Provide image context for better extraction accuracy
* **Modern UI:** Clean, responsive interface with step-by-step guidance
* **Real-time Status:** Visual feedback during processing

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
    cd "Image to Data/backend"
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
   cd "Image to Data"
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
    cd "Image to Data/backend"
    node server.js
    ```
    Keep this terminal running.

2.  **Start the Frontend Server:**
    * Open a new terminal window
    * Navigate to the frontend directory:
    ```bash
    cd "Image to Data/frontend"
    npx serve
    ```
    * Copy the URL shown in the terminal (usually something like `http://localhost:3000`)
    * Open the URL in your web browser

## Using the Application

1. Once the application is running, you'll see a modern web interface with clear instructions
2. **Step 1:** Click "Choose Files" to select one or more images containing data tables
3. **Step 2:** Provide context about the table(s) to improve extraction accuracy
4. **Step 3:** Click "Extract Tables" to begin processing
5. **Step 4:** Once processing is complete, you can:
   - View the extracted data in table format
   - Download the results as Excel or CSV
   - Process more images as needed

## Important Notes

* **API Costs:** Each table extraction uses the OpenAI GPT-4V API, which has associated costs. Be mindful of your usage.
* **Image Quality:** The accuracy of table extraction depends on:
  - Image quality and resolution
  - Table complexity and layout
  - Text clarity and formatting
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

## Credits

Created by [Akmal Shldn](https://github.com/akmaalsh)

## Links

* [GitHub Repository](https://github.com/akmaalsh/2025p_ImagetoData)
* [Developer's LinkedIn](https://www.linkedin.com/in/akmalshalahuddin/)