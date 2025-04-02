# Images to Data & Text Converter

A web application that extracts text and tabular data from images using OpenAI's GPT-4o model. This project consists of two main applications:

1. **Images to Data Converter**: Extracts tabular data from images and converts them into structured formats
2. **Images to Text Converter**: Extracts paragraphs and text content from images

## Features

### Common Features
- Modern, user-friendly interface
- Drag and drop file upload
- Multiple file processing
- Real-time progress tracking
- Collapsible results view
- Multiple download formats
- Secure API key handling with browser storage

### Images to Data Converter
- Extracts tables from images
- Preserves table structure
- Download options:
  - Excel (single or separate sheets)
  - CSV (single or separate files)

### Images to Text Converter
- Extracts paragraphs and text content
- Maintains text organization
- Download options:
  - Excel (single or separate sheets)
  - CSV format
  - Text format

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/akmaalsh/2025p_ImagetoData.git
   cd 2025p_ImagetoData
   ```

2. Install dependencies:
   ```bash
   # Backend dependencies
   cd backend
   npm install

   # Frontend dependencies
   cd ../frontend
   npm install
   ```

3. Start the application:
   ```bash
   # Using the launch script
   python launch.py
   ```
   Or manually:
   ```bash
   # Start backend (from backend directory)
   node server.js

   # Start frontend (from frontend directory)
   npx serve
   ```

4. When you first open the application, you'll be prompted to enter your OpenAI API key:
   - The key is stored securely in your browser's localStorage
   - It's never sent to our servers
   - You can reset it anytime using the "Reset API Key" button
   - Get your API key from [OpenAI's website](https://platform.openai.com/api-keys)

5. If your API key becomes invalid or expires:
   - The application will automatically detect the error
   - You'll be prompted to enter a new API key
   - The old key will be cleared from your browser
   - Enter your new API key to continue using the application
   - You can also manually reset your API key using the "Reset API Key" button

## Technical Details

### Backend
- Node.js server with Express
- OpenAI GPT-4o model API integration
- Concurrent request handling
- Error handling and validation

### Frontend
- Pure HTML, CSS, and JavaScript
- Modern UI with CSS variables
- Responsive design
- Real-time status updates
- SheetJS for Excel file generation
- Secure API key management

## File Structure
```
.
├── Image to Data/
│   ├── backend/
│   │   ├── server.js
│   │   └── package.json
│   ├── frontend/
│   │   ├── index.html
│   │   ├── style.css
│   │   └── script.js
│   └── launch.py
├── Image to Text/
│   ├── backend/
│   │   ├── server.js
│   │   └── package.json
│   ├── frontend/
│   │   ├── index.html
│   │   ├── style.css
│   │   └── script.js
│   └── launch.py
└── README.md
```

## Security
- API keys are stored securely in the browser's localStorage
- Keys are never sent to our servers
- Input validation on both frontend and backend
- Secure file handling
- Clear user instructions for API key management

## Author & Credits
Created by Akmal Shalahuddin
- GitHub: [akmaalsh](https://github.com/akmaalsh)
- LinkedIn: [Akmal Shalahuddin](https://www.linkedin.com/in/akmalshalahuddin/)

## Acknowledgments
- OpenAI for the GPT-4o model API
- SheetJS for Excel file handling
- The open-source community for various tools and libraries used 
