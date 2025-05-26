const uploadForm = document.getElementById('uploadForm');
const imageInput = document.getElementById('imageInput');
const submitButton = document.getElementById('submitButton');
const progressDiv = document.getElementById('progress');
const errorDiv = document.getElementById('error'); // For errors/warnings
const resultsOutputDiv = document.getElementById('resultsOutput');
const downloadSectionDiv = document.getElementById('downloadSection');
const downloadTxtButton = document.getElementById('downloadTxtButton');
const downloadCsvButton = document.getElementById('downloadCsvButton');
const downloadSeparateSheets = document.getElementById('downloadSeparateSheets');
const downloadSingleSheet = document.getElementById('downloadSingleSheet');
const aggregationInfoDiv = document.getElementById('aggregationInfo');
const fileList = document.getElementById('fileList');
const toggleAllResults = document.getElementById('toggleAllResults');

// Use the correct port for this backend (defaulting to 3001)
const BACKEND_API_URL = 'http://localhost:3001/api/extract-paragraphs';

// Check for API key when page loads
document.addEventListener('DOMContentLoaded', () => {
    checkApiKey();
});

// API Key Handling
function checkApiKey() {
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
        document.getElementById('apiKeyModal').style.display = 'block';
        return false;
    }
    return apiKey;
}

function saveApiKey() {
    const apiKey = document.getElementById('apiKeyInput').value.trim();
    if (!apiKey) {
        alert('Please enter a valid API key');
        return;
    }
    localStorage.setItem('gemini_api_key', apiKey);
    document.getElementById('apiKeyModal').style.display = 'none';
}

function toggleApiKeyVisibility() {
    const input = document.getElementById('apiKeyInput');
    const button = document.getElementById('toggleApiKey');
    if (input.type === 'password') {
        input.type = 'text';
        button.textContent = 'Hide';
    } else {
        input.type = 'password';
        button.textContent = 'Show';
    }
}

// Add function to clear API key
function clearApiKey() {
    localStorage.removeItem('gemini_api_key');
    document.getElementById('apiKeyModal').style.display = 'block';
    document.getElementById('apiKeyInput').value = '';
}

// --- State for Aggregated Data ---
let imageResults = []; // Store results for each image: [{filename, paragraphs}]
let totalFiles = 0;
let processedFileCount = 0;
let successfulFilesCount = 0;

// --- File Upload Handling ---
imageInput.addEventListener('change', (event) => {
    const files = event.target.files;
    fileList.innerHTML = ''; // Clear previous files
    
    if (files.length > 0) {
        Array.from(files).forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <span class="file-name">${file.name}</span>
                <span class="file-status">Pending</span>
            `;
            fileList.appendChild(fileItem);
        });
    }
});

// --- Button Click Handler ---
submitButton.addEventListener('click', async () => {
    const apiKey = checkApiKey();
    if (!apiKey) return;

    const files = imageInput.files;
    if (!files || files.length === 0) {
        showError("Please select one or more image files.");
        return;
    }

    // Reset state for new batch
    imageResults = [];
    totalFiles = files.length;
    processedFileCount = 0;
    successfulFilesCount = 0;

    clearMessages();
    showProgress(true, `Starting processing for ${totalFiles} file(s)...`);
    resultsOutputDiv.innerHTML = '<p>Processing...</p>';
    downloadSectionDiv.style.display = 'none';
    submitButton.disabled = true;
    submitButton.textContent = 'Processing...';

    // Update all file items to pending
    Array.from(fileList.children).forEach(item => {
        item.className = 'file-item';
        item.querySelector('.file-status').textContent = 'Pending';
    });

    // --- Loop through selected files ---
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        processedFileCount++;
        showProgress(true, `Processing file ${processedFileCount} of ${totalFiles}: ${file.name}`);

        // Update file status to processing
        const fileItem = fileList.children[i];
        fileItem.querySelector('.file-status').textContent = 'Processing';

        const formData = new FormData();
        formData.append('imageFile', file);

        try {
            const response = await fetch(BACKEND_API_URL, {
                method: 'POST',
                headers: {
                    'X-API-Key': apiKey
                },
                body: formData,
            });

            const data = await response.json();

            // Handle API key errors
            if (response.status === 401) {
                showError("Invalid or expired API key. Please enter a new key.");
                clearApiKey();
                return;
            }

            if (!response.ok || !data.success) {
                const errorMsg = data.error || `Server error processing ${file.name}`;
                appendMessage(`Error for ${file.name}: ${errorMsg}`, 'error');
                console.error(`Backend error for ${file.name}:`, data);
                fileItem.classList.add('error');
                fileItem.querySelector('.file-status').textContent = 'Error';
                continue;
            }

            console.log(`Data received for ${file.name}:`, data.data);

            if (!data.data || !Array.isArray(data.data.paragraphs)) {
                appendMessage(`Invalid data structure received for ${file.name}. Skipping file results.`, 'warning');
                console.warn(`Invalid data structure for ${file.name}:`, data.data);
                fileItem.classList.add('error');
                fileItem.querySelector('.file-status').textContent = 'Error';
                continue;
            }

            if (data.data.paragraphs.length > 0) {
                imageResults.push({
                    filename: file.name,
                    paragraphs: data.data.paragraphs
                });
                successfulFilesCount++;
                fileItem.classList.add('success');
                fileItem.querySelector('.file-status').textContent = 'Success';
            } else {
                appendMessage(`Note: No paragraphs extracted by AI from ${file.name}.`, 'info');
                fileItem.classList.add('error');
                fileItem.querySelector('.file-status').textContent = 'No Text';
            }

        } catch (error) {
            appendMessage(`Network or application error processing ${file.name}. Check console.`, 'error');
            console.error(`Workspace/Application Error for ${file.name}:`, error);
            fileItem.classList.add('error');
            fileItem.querySelector('.file-status').textContent = 'Error';
        }
    }

    // --- Finalize UI after processing all files ---
    showProgress(false);
    submitButton.disabled = false;
    submitButton.textContent = 'Extract Paragraphs';
    imageInput.value = '';

    if (successfulFilesCount > 0) {
        displayResults(imageResults);
        downloadSectionDiv.style.display = 'block';
        downloadTxtButton.disabled = false;
        downloadCsvButton.disabled = false;
        downloadSeparateSheets.disabled = false;
        downloadSingleSheet.disabled = false;
        if (totalFiles > 1) {
            aggregationInfoDiv.textContent = `Successfully processed ${successfulFilesCount} of ${totalFiles} file(s). See messages above for details on any skipped files or errors.`;
        }
    } else {
        resultsOutputDiv.innerHTML = '<p>No paragraphs extracted successfully from the selected image(s).</p>';
        if (!errorDiv.textContent && files.length > 0) {
            showError("Could not extract any paragraphs from the provided image(s).");
        } else if (!errorDiv.textContent && files.length === 0) {
            resultsOutputDiv.innerHTML = '<p>No files were selected.</p>';
        }
        downloadSectionDiv.style.display = 'none';
    }
});

// --- Toggle All Results ---
toggleAllResults.addEventListener('click', () => {
    const resultItems = document.querySelectorAll('.result-item');
    const isAllCollapsed = toggleAllResults.textContent === 'Expand All';
    
    resultItems.forEach(item => {
        if (isAllCollapsed) {
            item.classList.remove('collapsed');
        } else {
            item.classList.add('collapsed');
        }
    });
    
    toggleAllResults.textContent = isAllCollapsed ? 'Collapse All' : 'Expand All';
});

// --- Helper Functions ---

function showProgress(isLoading, message = '') {
    const progressDiv = document.getElementById('progress');
    const progressText = progressDiv.querySelector('.progress-text');
    const progressBarFill = progressDiv.querySelector('.progress-bar-fill');
    
    progressDiv.style.display = isLoading ? 'block' : 'none';
    
    if (isLoading) {
        progressText.textContent = message;
        // Calculate progress percentage based on processed files
        const progress = (processedFileCount / totalFiles) * 100;
        progressBarFill.style.width = `${progress}%`;
    } else {
        progressText.textContent = '';
        progressBarFill.style.width = '0%';
    }
}

function clearMessages() {
     errorDiv.textContent = '';
     errorDiv.style.display = 'none';
     errorDiv.className = 'status error'; // Reset class list
     resultsOutputDiv.innerHTML = '<p>Upload image(s) and click "Extract Paragraphs".</p>'; // Reset results area too
     aggregationInfoDiv.textContent = '';
     downloadSectionDiv.style.display = 'none';
     downloadTxtButton.disabled = true;
     downloadCsvButton.disabled = true;
     downloadSeparateSheets.disabled = true;
     downloadSingleSheet.disabled = true;
     imageResults = []; // Clear aggregated data
     successfulFilesCount = 0;
}

// Shows a critical error message, clearing others
function showError(message) {
    clearMessages();
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    errorDiv.classList.add('critical-error'); // Use specific class for critical errors
    if (resultsOutputDiv.innerHTML.includes("Processing...")) {
       resultsOutputDiv.innerHTML = '<p>Extraction failed.</p>';
    }
}

// Appends messages (errors or warnings or info) to the message div
function appendMessage(message, type = 'warning') {
     errorDiv.style.display = 'block';
     errorDiv.classList.add('has-messages'); // Base class for messages present

     // Determine styling based on type
     let messagePrefix = "• ";
     if (type === 'error') {
          errorDiv.classList.add('critical-error'); // Use error styling defined in CSS
          messagePrefix = "• Error: ";
     } else if (type === 'warning') {
          // Use default warning style from CSS (.has-messages)
          messagePrefix = "• Warning: ";
     } else { // Info type
          messagePrefix = "• Note: ";
     }

     // Append message using list items for better readability
     let ul = errorDiv.querySelector('ul');
     if (!ul) {
         ul = document.createElement('ul');
         // Clear any initial text content if starting list
         if (!errorDiv.hasChildNodes() || (errorDiv.childNodes.length === 1 && errorDiv.firstChild.nodeType === Node.TEXT_NODE)) {
             errorDiv.textContent = '';
         }
         errorDiv.appendChild(ul);
     }
     const li = document.createElement('li');
     li.textContent = message; // Prefix added here if desired, or keep clean
     ul.appendChild(li);
}

// Displays the results organized by image
function displayResults(results) {
    resultsOutputDiv.innerHTML = '';

    if (!results || results.length === 0) {
        const p = document.createElement('p');
        p.textContent = "No paragraphs were extracted successfully.";
        resultsOutputDiv.appendChild(p);
        return;
    }

    results.forEach((result, index) => {
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';
        
        // Create header with image name
        const header = document.createElement('h3');
        header.textContent = `Image ${index + 1}: ${result.filename}`;
        resultItem.appendChild(header);

        // Create content container
        const content = document.createElement('div');
        content.className = 'content';

        // Add paragraphs
        result.paragraphs.forEach((text, pIndex) => {
            const p = document.createElement('p');
            p.textContent = text;
            if (pIndex < result.paragraphs.length - 1) {
                p.style.marginBottom = '1rem';
            }
            content.appendChild(p);
        });

        resultItem.appendChild(content);
        resultsOutputDiv.appendChild(resultItem);

        // Add click handler for collapsible functionality
        header.addEventListener('click', () => {
            resultItem.classList.toggle('collapsed');
        });
    });
}

// --- Download Functions ---

// Function to generate base filename for batch
function getBatchBaseFilename() {
     // Use a generic name for aggregated results
     return 'aggregated_extracted_text';
}

// Download as TXT (uses aggregatedParagraphs)
function downloadTxt(results, filename = 'extracted_text.txt') {
    if (!results || results.length === 0) {
        alert("No results available to download.");
        return;
    }

    let textContent = '';
    results.forEach((result, index) => {
        textContent += `Image ${index + 1}: ${result.filename}\n`;
        textContent += '='.repeat(40) + '\n\n';
        textContent += result.paragraphs.join('\n\n');
        textContent += '\n\n' + '-'.repeat(40) + '\n\n';
    });

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
    triggerDownload(blob, filename);
}

function downloadExcelSeparateSheets(results, filename = 'extracted_text.xlsx') {
    if (!results || results.length === 0) {
        alert("No results available to download.");
        return;
    }

    const wb = XLSX.utils.book_new();
    
    results.forEach((result, index) => {
        const wsData = [
            ["Image", result.filename],
            [""],
            ...result.paragraphs.map((text, pIndex) => [`Paragraph ${pIndex + 1}`, text])
        ];
        
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, `Image ${index + 1}`);
    });

    try {
        XLSX.writeFile(wb, filename);
    } catch (error) {
        console.error(error);
        alert("Could not generate Excel file.");
    }
}

function downloadExcelSingleSheet(results, filename = 'extracted_text_combined.xlsx') {
    if (!results || results.length === 0) {
        alert("No results available to download.");
        return;
    }

    const wb = XLSX.utils.book_new();
    const wsData = [["Image", "Paragraph", "Text"]];

    results.forEach((result, imageIndex) => {
        result.paragraphs.forEach((text, paragraphIndex) => {
            wsData.push([
                result.filename,
                `Paragraph ${paragraphIndex + 1}`,
                text
            ]);
        });
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "All Images");

    try {
        XLSX.writeFile(wb, filename);
    } catch (error) {
        console.error(error);
        alert("Could not generate Excel file.");
    }
}

// Generic download trigger
function triggerDownload(blob, filename) {
     const link = document.createElement("a");
     if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } else {
         alert("File download is not fully supported in your browser.");
     }
}

// --- Event Listeners for Download Buttons ---
downloadTxtButton.addEventListener('click', () => {
    if (imageResults && imageResults.length > 0) {
        downloadTxt(imageResults);
    } else {
        alert("No successful results available to download.");
    }
});

downloadSeparateSheets.addEventListener('click', () => {
    if (imageResults && imageResults.length > 0) {
        downloadExcelSeparateSheets(imageResults);
    } else {
        alert("No successful results available to download.");
    }
});

downloadSingleSheet.addEventListener('click', () => {
    if (imageResults && imageResults.length > 0) {
        downloadExcelSingleSheet(imageResults);
    } else {
        alert("No successful results available to download.");
    }
});

// Add CSV download function
function downloadCSV(results, filename = 'extracted_text.csv') {
    if (!results || results.length === 0) {
        alert("No results available to download.");
        return;
    }

    const header = ["Image", "Paragraph Number", "Text"];
    let csvContent = "";
    csvContent += header.map(h => `"${h.replace(/"/g, '""')}"`).join(",") + "\r\n";

    results.forEach((result, imageIndex) => {
        result.paragraphs.forEach((text, paragraphIndex) => {
            const row = [
                result.filename,
                `Paragraph ${paragraphIndex + 1}`,
                text
            ];
            csvContent += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",") + "\r\n";
        });
    });

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    triggerDownload(blob, filename);
}

// Add CSV download button event listener
downloadCsvButton.addEventListener('click', () => {
    if (imageResults && imageResults.length > 0) {
        downloadCSV(imageResults);
    } else {
        alert("No successful results available to download.");
    }
});

// --- Initial State ---
clearMessages(); // Initial cleanup on load