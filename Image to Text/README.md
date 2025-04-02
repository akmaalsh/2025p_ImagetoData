# Image to Text Code Documentation

## Code Structure

### Backend (`/backend/server.js`)

The backend server handles image processing and text extraction using OpenAI's GPT-4o model.

#### Key Components:

1. **Server Setup**
```javascript
const express = require('express');
const app = express();
const port = process.env.PORT || 3001;
```
- Express server configuration
- Environment variable support
- CORS enabled for frontend access

2. **Paragraph Extraction Prompt**
```javascript
const PARAGRAPH_EXTRACTION_PROMPT = `...`;
```
- Detailed instructions for GPT-4o
- Paragraph identification rules
- Output format specifications
- Error handling guidelines

3. **Main Processing Endpoint**
```javascript
app.post('/api/extract-paragraphs', upload.single('imageFile'), async (req, res)
```
- Single file processing
- Image to base64 conversion
- OpenAI API integration
- Response validation

### Frontend Structure

1. **HTML (`/frontend/index.html`)**
   - File upload interface
   - Progress indicator
   - Results display
   - Download options
   - Social links and credits
   - API key input modal

2. **JavaScript Functions**
   - File handling
   - API communication
   - Results formatting
   - Download generation
   - Error handling
   - API key management

3. **CSS Styling (`/frontend/style.css`)**
   - Modern interface design
   - Responsive layout
   - Progress animations
   - Results formatting
   - Modal styling

## Data Flow

1. **Upload Process**
```javascript
// Frontend file handling
const formData = new FormData();
formData.append('imageFile', file);
```

2. **Processing Pipeline**
```javascript
// Backend processing
const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
        {
            role: "user",
            content: [
                { type: "text", text: PARAGRAPH_EXTRACTION_PROMPT },
                { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } }
            ]
        }
    ]
});
```

3. **Response Structure**
```javascript
// Expected response format
{
    success: true,
    data: {
        paragraphs: [
            "First paragraph text...",
            "Second paragraph text...",
            // ...
        ]
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

2. **Response Processing**
```javascript
const messageContent = response.choices[0]?.message?.content;
const parsedData = JSON.parse(jsonString);
```

## Error Handling

1. **Input Validation**
```javascript
if (!req.file) {
    return res.status(400).json({ 
        success: false, 
        error: "No image file provided." 
    });
}
```

2. **API Error Handling**
```javascript
try {
    // Process response
} catch (error) {
    console.error("Error calling OpenAI API:", error);
    res.status(500).json({
        success: false,
        error: "An error occurred while processing the image"
    });
}
```

## Launch Script (`launch.py`)
- Manages server startup
- Handles environment setup
- Opens browser automatically
- Provides real-time server output

## Dependencies
- express: Web framework
- multer: File upload handling
- openai: OpenAI API client
- cors: Cross-origin support
- dotenv: Environment configuration 