# Image to Text Converter (Gemini)

A modern web application that extracts text and paragraphs from images using Google's Gemini AI model.

## Step-by-Step Installation Guide

### Prerequisites

1. **Node.js and npm**
   - Download and install Node.js (version 16 or higher) from [nodejs.org](https://nodejs.org/)
   - Verify installation by running:
     ```bash
     node --version
     npm --version
     ```

2. **Google Gemini API Key**
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create or sign in to your Google account
   - Click "Create API Key"
   - Copy and save your API key securely

3. **Code Editor**
   - Any modern code editor (VS Code recommended)
   - Or a simple text editor

### Installation Steps

1. **Clone or Download the Repository**
   ```bash
   # Option 1: Clone using Git
   git clone https://github.com/akmaalsh/2025p_ImagetoData.git
   cd 2025p_ImagetoData/Image\ to\ Text_Gemini

   # Option 2: Download ZIP
   # Download and extract the ZIP file from GitHub
   ```

2. **Install Backend Dependencies**
   ```bash
   # Navigate to the backend directory
   cd backend

   # Install required packages
   npm install

   # If you encounter any errors, try:
   npm install --legacy-peer-deps
   ```

3. **Configure the Application**
   - No configuration file needed
   - API key will be entered through the UI
   - Default port is 3002 (can be changed in server.js if needed)

### Running the Application

1. **Start the Backend Server**
   ```bash
   # Make sure you're in the backend directory
   cd backend
   node server.js
   ```
   You should see: "Gemini Backend server listening at http://localhost:3002"

2. **Launch the Frontend**
   - Option 1: Using the launch script (Recommended)
     ```bash
     # From the Image to Text_Gemini directory
     python3 launch.py
     ```
   - Option 2: Manual launch
     - Navigate to the frontend directory
     - Open index.html in your web browser

3. **First-Time Setup**
   - When the application opens, you'll be prompted for your Gemini API key
   - Enter the API key you obtained from Google AI Studio
   - The key will be saved in your browser for future use

### Using the Application

1. **Upload Images**
   - Click "Choose Files" or drag and drop images
   - Supported formats: JPG, PNG, WEBP
   - Multiple files can be selected

2. **Process Images**
   - Click "Extract Paragraphs"
   - Wait for processing to complete
   - Results will appear below each image

3. **Download Results**
   - Choose your preferred format (TXT, CSV, Excel)
   - Click the corresponding download button
   - Files will be saved to your downloads folder

### Troubleshooting Common Issues

1. **Server Won't Start**
   - Check if port 3002 is already in use
   - Ensure Node.js is properly installed
   - Try running with administrator/sudo privileges

2. **API Key Issues**
   - Verify the API key is correctly copied
   - Check if the key has been activated
   - Ensure you have sufficient API quota

3. **Image Processing Errors**
   - Ensure images are clear and readable
   - Check file size (max 20MB)
   - Try converting to a different format

4. **Browser Issues**
   - Clear browser cache and cookies
   - Try a different modern browser
   - Enable JavaScript if disabled

### Updating the Application

1. **Get Latest Version**
   ```bash
   git pull origin main
   ```

2. **Update Dependencies**
   ```bash
   cd backend
   npm update
   ```

### Security Notes

- Never share your API key
- Use HTTPS in production
- Keep Node.js and npm updated
- Review Google's API usage terms

## Features

The backend server handles image processing and text extraction using Google's Gemini AI model.

### Frontend
- Clean, responsive web interface
- Drag and drop file upload
- Multiple image support
- Real-time progress tracking
- Download results in multiple formats (TXT, CSV, Excel)
- API key management

### Backend  
- Express.js server
- Multer for file handling
- Google Gemini API integration
- Error handling and validation

## Prerequisites

- Node.js 16+ and npm
- Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

## Setup

1. Install dependencies:
```bash
cd backend
npm install
```

2. Start the backend server:
```bash
node server.js
```

3. Open `frontend/index.html` in your browser

## Usage

1. Enter your Gemini API key when prompted
2. Select or drag and drop image files
3. Click "Extract Paragraphs" to process
4. Download results in your preferred format

## API Integration

Example request structure:
```javascript
const formData = new FormData();
formData.append('imageFile', file);

const response = await fetch('http://localhost:3001/api/extract-paragraphs', {
    method: 'POST',
    headers: {
        'X-API-Key': 'your-gemini-api-key'
    },
    body: formData
});
```

Example response:
```javascript
{
    "success": true,
    "data": {
        "paragraphs": [
            "First paragraph text...",
            "Second paragraph text...",
            "Third paragraph text..."
        ]
    }
}
```

## File Structure

```
image-to-text-gemini/
├── frontend/
│   ├── index.html
│   ├── script.js
│   └── style.css
├── backend/
│   ├── server.js
│   ├── package.json
│   └── package-lock.json
├── launch.py
└── README.md
```

## Error Handling

The application includes comprehensive error handling:
- API key validation
- File format validation
- Network error handling
- Google Gemini API error responses

## Dependencies

### Backend
- express: Web framework
- multer: File upload handling
- cors: Cross-origin resource sharing
- dotenv: Environment variable management
- @google/genai: Google Gemini API client

### Frontend
- Vanilla JavaScript (ES6+)
- XLSX library for Excel exports
- Modern CSS with Flexbox/Grid

## Security

- API keys stored locally in browser
- No server-side API key storage
- HTTPS recommended for production
- Input validation and sanitization

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## API Costs

Be mindful of Google Gemini API usage costs. Each image processed counts toward your API quota.

## Troubleshooting

1. **Server won't start**: Check Node.js version and npm install
2. **API errors**: Verify Gemini API key validity and quota
3. **Poor text extraction**: Ensure good image quality and contrast
4. **Browser issues**: Use a modern browser with ES6+ support

Common error messages:
- "API key required": Enter valid Gemini API key
- "Invalid API key format": Check API key format
- "No candidates in API response": API blocked the request

## Credits

Created by [Akmal Shldn](https://github.com/akmaalsh)

## Links

- [Developer's GitHub](https://github.com/akmaalsh)
- [Developer's LinkedIn](https://www.linkedin.com/in/akmalshalahuddin/) 