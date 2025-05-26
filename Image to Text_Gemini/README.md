# Image to Text Converter (Gemini)

A modern web application that extracts text and paragraphs from images using Google's Gemini AI model.

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