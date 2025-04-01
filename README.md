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

### Images to Data Converter
- Extracts tables from images
- Preserves table structure
- Download options:
  - Excel (single or separate sheets)
  - CSV (single or separate sheets)

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

3. Create a `.env` file in the backend directory with your OpenAI API key:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```

4. Start the application:
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

## Usage

1. Open your browser and navigate to `http://localhost:3000`
2. Choose either "Images to Data" or "Images to Text" converter
3. Upload one or more image files by dragging them or clicking the upload area
4. Click "Extract Tables" or "Extract Paragraphs" depending on your chosen converter
5. Wait for the processing to complete
6. View results in the collapsible sections
7. Download results in your preferred format

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
- The `.env` file containing the API key is not included in the repository
- Input validation on both frontend and backend
- Secure file handling

## Author & Credits
Created by Akmal Shalahuddin
- GitHub: [akmaalsh](https://github.com/akmaalsh)
- LinkedIn: [Akmal Shalahuddin](https://www.linkedin.com/in/akmalshalahuddin/)

## Acknowledgments
- OpenAI for the GPT-4o model API
- SheetJS for Excel file handling
- The open-source community for various tools and libraries used 