# Image to Data Code Documentation

## Code Structure

### Backend (`/backend/server.js`)

The backend server handles image processing and data extraction using OpenAI's GPT-4o model.

#### Key Components:

1. **Server Setup**
```javascript
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const wsPort = 3001;
```
- Express server on port 3000
- WebSocket server on port 3001 for real-time updates

2. **Image Processing Function**
```javascript
async function processImage(imageFile, imageDescription, columnCount, columnNames, columnExamples)
```
- Converts image to base64
- Constructs dynamic prompt for GPT-4o
- Validates and processes API response
- Returns structured data or error

3. **Batch Processing Endpoint**
```javascript
app.post('/api/extract-tables-batch', upload.array('imageFiles', 50), async (req, res)
```
- Handles multiple file uploads (up to 50 files)
- Sequential processing of images
- Real-time progress updates via WebSocket
- Job tracking with unique IDs

### Frontend Structure

1. **HTML (`/frontend/index.html`)**
   - Upload section with drag-and-drop
   - Column configuration inputs
   - Progress tracking display
   - Results section with collapsible items
   - Download options interface
   - API key input modal

2. **JavaScript Functions**
   - WebSocket connection management
   - File upload handling
   - Progress tracking
   - Dynamic column management
   - Download functionality
   - API key management (storage and validation)

3. **CSS Styling (`/frontend/style.css`)**
   - Modern UI components
   - Responsive design
   - Progress animations
   - Results formatting
   - Modal styling

## Data Flow

1. **Upload Process**
   ```javascript
   // Frontend sends files and configuration
   formData.append('imageFiles', file);
   formData.append('columnCount', count);
   formData.append('columnNames', names);
   ```

2. **Processing Pipeline**
   ```javascript
   // Backend processes each file
   for (const file of files) {
       const result = await processImage(file, ...);
       // Send progress via WebSocket
   }
   ```

3. **Results Handling**
   ```javascript
   // Backend response structure
   {
       success: true,
       data: {
           headers: [...],
           rows: [[...], [...]]
       }
   }
   ```

## API Integration

1. **API Key Management**
```javascript
// Frontend API key handling
function checkApiKey() {
    const apiKey = localStorage.getItem('openai_api_key');
    if (!apiKey) {
        document.getElementById('apiKeyModal').style.display = 'block';
        return false;
    }
    return apiKey;
}

// Backend API key validation
const apiKey = req.headers['x-api-key'];
if (!apiKey || !apiKey.startsWith('sk-')) {
    return res.status(401).json({ success: false, error: "Invalid API key" });
}
```

2. **API Call Structure**
```javascript
const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
        {
            role: "user",
            content: [
                { type: "text", text: dynamicPrompt },
                { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } }
            ]
        }
    ]
});
```

## Error Handling

1. **Input Validation**
```javascript
if (isNaN(columnCount) || columnCount <= 0) {
    return res.status(400).json({ success: false, error: "Invalid column count" });
}
```

2. **Processing Errors**
```javascript
try {
    const parsedData = JSON.parse(jsonString);
    // Validation checks...
} catch (error) {
    return { success: false, error: error.message };
}
```

## Launch Script (`launch.py`)
- Starts both frontend and backend servers
- Opens browser automatically
- Displays server output in real-time
- Handles server shutdown

## Dependencies
- express: Web server framework
- multer: File upload handling
- ws: WebSocket implementation
- openai: OpenAI API client
- cors: Cross-origin resource sharing 