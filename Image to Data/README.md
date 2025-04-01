# Image to Data Converter

A specialized web application that extracts tabular data from images using OpenAI's GPT-4o model. This tool is particularly useful for converting tables in images into structured, analyzable data formats.

## Features

### Upload and Processing
- **Modern Upload Interface**
  - Drag and drop functionality
  - Multiple file support
  - File type validation (JPG, PNG, GIF)
  - Visual feedback during upload
  - File list with status indicators

### Table Extraction
- **Flexible Column Configuration**
  - Dynamic column count adjustment
  - Custom column naming
  - Example content hints for better accuracy
  - Context/description field for improved extraction

### Real-time Processing
- **Progress Tracking**
  - Individual file status updates
  - Overall progress indication
  - Error handling and reporting
  - Sequential processing for reliability

### Results Management
- **Interactive Results View**
  - Collapsible result sections
  - Preview of extracted data
  - Success/failure indicators
  - Error messages for failed extractions

### Download Options
- **Multiple Export Formats**
  - Excel format (XLSX)
    - Single sheet option
    - Separate sheets per image
  - CSV format
    - Combined file option
    - Individual files per image

## Setup Instructions

1. **Environment Setup**
   ```bash
   # Install Node.js dependencies
   cd backend
   npm install
   
   # Create .env file
   echo "OPENAI_API_KEY=your_api_key_here" > .env
   ```

2. **Starting the Application**
   ```bash
   # Using the launch script (recommended)
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

1. **Preparing Your Images**
   - Ensure tables are clearly visible
   - Good contrast between text and background
   - Minimal image noise or artifacts
   - Supported formats: JPG, PNG, GIF

2. **Configuring the Extraction**
   - Set the number of columns
   - Name each column appropriately
   - Provide example content if available
   - Add context description for better accuracy

3. **Processing Images**
   - Upload one or more images
   - Monitor the progress bar
   - Wait for processing completion
   - Review results in the collapsible sections

4. **Downloading Results**
   - Choose your preferred format (Excel/CSV)
   - Select combined or separate files
   - Download and verify the data

## Technical Implementation

### Backend Architecture
- Express.js server
- OpenAI GPT-4o integration
- WebSocket for real-time updates
- Sequential image processing
- Robust error handling

### Frontend Design
- Modern UI with CSS variables
- Responsive layout
- Real-time WebSocket communication
- Client-side file handling
- Dynamic UI updates

## Error Handling
- File type validation
- Size limit checks
- API error recovery
- Network issue handling
- User feedback system

## Best Practices
- Use PNG format for clearest text
- Keep image sizes reasonable
- Provide accurate column information
- Add descriptive context
- Process files in manageable batches

## Troubleshooting
- Check API key configuration
- Verify server connectivity
- Monitor WebSocket connection
- Review browser console for errors
- Check file format compatibility

## Author
Created by Akmal Shalahuddin
- GitHub: [akmaalsh](https://github.com/akmaalsh)
- LinkedIn: [Akmal Shalahuddin](https://www.linkedin.com/in/akmalshalahuddin/) 