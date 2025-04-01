# Image to Text Converter

A powerful web application that extracts text content from images using OpenAI's GPT-4o model. This tool excels at converting text-based images into editable, searchable text while maintaining the original structure and organization.

## Features

### Modern Upload Interface
- **User-Friendly Design**
  - Drag and drop functionality
  - Multiple file support
  - Progress indicators
  - File type validation
  - Visual upload feedback

### Text Extraction
- **Intelligent Processing**
  - Maintains paragraph structure
  - Preserves text formatting
  - Handles multiple languages
  - Context-aware extraction
  - High accuracy results

### Real-time Feedback
- **Processing Updates**
  - Individual file progress
  - Overall batch status
  - Success/failure indicators
  - Error reporting
  - Processing time estimates

### Results Display
- **Organized Output**
  - Collapsible result sections
  - Clean text formatting
  - Easy navigation
  - Copy functionality
  - Preview capabilities

### Download Options
- **Multiple Formats**
  - Text files (TXT)
    - Individual files
    - Combined output
  - Excel format (XLSX)
    - Separate sheets
    - Single sheet
  - CSV format
    - Individual files
    - Combined data

## Setup Instructions

1. **Environment Configuration**
   ```bash
   # Install dependencies
   cd backend
   npm install
   
   # Set up environment
   echo "OPENAI_API_KEY=your_api_key_here" > .env
   ```

2. **Launch Application**
   ```bash
   # Using launch script (recommended)
   python3 launch.py
   
   # Or manually:
   # Terminal 1 (Backend)
   cd backend
   node server.js
   
   # Terminal 2 (Frontend)
   cd frontend
   npx serve
   ```

## Usage Guide

1. **Image Preparation**
   - Ensure clear, readable text
   - Good image resolution
   - Proper lighting/contrast
   - Supported formats: JPG, PNG, GIF

2. **File Upload**
   - Drag and drop files
   - Or use file selector
   - Monitor upload progress
   - Check file status

3. **Processing**
   - Click "Extract Text"
   - Wait for processing
   - Monitor progress bar
   - Review results

4. **Managing Results**
   - Expand/collapse sections
   - Review extracted text
   - Copy text as needed
   - Download in preferred format

## Technical Details

### Backend Implementation
- Express.js server
- OpenAI GPT-4o integration
- Sequential processing
- Error handling
- File management

### Frontend Features
- Responsive design
- Real-time updates
- Dynamic content loading
- Browser compatibility
- Mobile optimization

## Best Practices
- Use high-quality images
- Keep files under size limit
- Process in manageable batches
- Verify extracted text
- Save results promptly

## Error Handling
- Input validation
- Processing recovery
- Network error handling
- User notifications
- Graceful degradation

## Troubleshooting
1. **Common Issues**
   - API key verification
   - Server connectivity
   - File format support
   - Size limitations
   - Browser compatibility

2. **Solutions**
   - Check environment setup
   - Verify network connection
   - Monitor browser console
   - Review file requirements
   - Clear browser cache

## Author
Created by Akmal Shalahuddin
- GitHub: [akmaalsh](https://github.com/akmaalsh)
- LinkedIn: [Akmal Shalahuddin](https://www.linkedin.com/in/akmalshalahuddin/) 