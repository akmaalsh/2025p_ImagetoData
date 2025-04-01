# Image Table Extractor Application

This application allows users to upload an image containing a table and uses the OpenAI API (GPT-4 Vision model) to extract the data into a structured format (HTML table).

## Prerequisites

* **Node.js and npm:** Download and install from [https://nodejs.org/](https://nodejs.org/) (LTS version recommended).
* **OpenAI API Key:** You need an API key from OpenAI. Get one at [https://platform.openai.com/account/api-keys](https://platform.openai.com/account/api-keys).

## Setup

1.  **Clone the Repository:**
    ```bash
    git clone <your-repo-url>
    cd image-table-extractor
    ```

2.  **Install Backend Dependencies:**
    ```bash
    cd backend
    npm install
    ```

3.  **Configure Backend Environment:**
    * Create a file named `.env` inside the `backend/` directory.
    * Open the `.env` file and add your OpenAI API key:
        ```
        OPENAI_API_KEY=sk-YourActualOpenAiApiKeyGoesHere
        # You can optionally add PORT=3001 if you want to use a different port
        ```
    * **IMPORTANT:** Ensure the `.env` file is listed in your `.gitignore` file (if using Git) to prevent accidentally committing your secret API key.

## Running the Application

1.  **Start the Backend Server:**
    * Open a terminal/command prompt.
    * Navigate to the `backend/` directory.
    * Run the server:
        ```bash
        node server.js
        ```
    * You should see a message like `Backend server listening at http://localhost:3000`. Keep this terminal running.

2.  **Serve the Frontend:**
    * Open a *second* terminal/command prompt.
    * Navigate to the `frontend/` directory.
    * The simplest way to serve static files locally is using `npx`:
        ```bash
        # Make sure you are in the frontend directory
        npx serve .
        ```
        (If you don't have `npx` or `serve`, you can install it globally `npm install -g serve` or use a VS Code extension like "Live Server".)
    * The `serve` command will likely output a URL like `http://localhost:3001` (it often picks a different port than the backend).

3.  **Access the Application:**
    * Open your web browser and navigate to the frontend URL provided in the second terminal (e.g., `http://localhost:3001`).

## Usage

1.  Click "Choose File" and select an image containing a data table.
2.  Click the "Extract Table" button.
3.  Wait for the processing to complete (you'll see a loading indicator).
4.  The extracted table data will be displayed below, or an error message will appear if something goes wrong.

## Notes

* **API Costs:** Calls to the OpenAI API cost money based on usage. Be mindful of this during development and testing.
* **Error Handling:** Basic error handling is implemented. Check the browser's developer console (F12) and the backend terminal for more detailed error logs if issues occur.
* **Extraction Accuracy:** The accuracy of the table extraction depends heavily on the image quality, table complexity, and the capabilities of the specific OpenAI model used.
* **Security:** The OpenAI API key is handled on the backend and read from an environment variable (`.env` file), which is the standard secure practice. **Never** expose your API key directly in the frontend JavaScript code.