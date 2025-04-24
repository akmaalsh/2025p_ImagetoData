const uploadForm = document.getElementById('uploadForm');
const imageInput = document.getElementById('imageFile');
const submitButton = document.getElementById('extractButton');
const progressDiv = document.getElementById('progressContainer');
const progressBarElem = document.getElementById('progressBar');
const progressTextElem = document.getElementById('progressText');
const errorDiv = document.getElementById('error');
const resultsDiv = document.getElementById('resultsList');
const downloadButtonsDiv = document.getElementById('downloadButtons');
const downloadCsvButton = document.getElementById('downloadCSV');
const downloadXlsxButton = document.getElementById('downloadExcelSeparate');
const columnCountInput = document.getElementById('columnCount');
const columnInputsWrapper = document.getElementById('columnInputsWrapper');
const imageDescriptionInput = document.getElementById('imageDescription');
const aggregationInfoDiv = document.getElementById('aggregationInfo');
const fileList = document.getElementById('fileList');
const dropZone = document.getElementById('dropZone');

// WebSocket related variables
let ws = null;
let currentJobId = null;
const API_BASE_URL = 'http://localhost:3000';

const BACKEND_API_URL = 'http://localhost:3000/api/extract-table';

// --- Drag and drop handling ---
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--primary-color)';
    dropZone.style.background = 'var(--background-color)';
});

dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--border-color)';
    dropZone.style.background = 'var(--background-secondary)';
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--border-color)';
    dropZone.style.background = 'var(--background-secondary)';
    
    const files = e.dataTransfer.files;
    imageInput.files = files;
    updateFileList(files);
});

imageInput.addEventListener('change', () => {
    updateFileList(imageInput.files);
});

function updateFileList(files) {
    fileList.innerHTML = '';
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

// --- WebSocket handling ---
function connectWebSocket(port) {
    ws = new WebSocket(`ws://localhost:${port}`);
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        updateProgress(data);
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
        console.log('WebSocket connection closed');
    };
}

// --- Progress tracking ---
function updateProgress(data) {
    progressDiv.style.display = 'block';
    progressBarElem.style.width = `${data.progress}%`;
    progressTextElem.textContent = `Processing: ${data.processedCount}/${data.totalFiles} files (${data.progress}%)`;

    // Update file statuses
    if (data.latestResults) {
        data.latestResults.forEach(result => {
            const fileItems = document.querySelectorAll('.file-item');
            const fileItem = Array.from(fileItems).find(item => 
                item.querySelector('.file-name').textContent === result.filename
            );
            
            if (fileItem) {
                const statusSpan = fileItem.querySelector('.file-status');
                statusSpan.textContent = result.success ? 'Completed' : 'Failed';
                statusSpan.className = `file-status ${result.success ? 'success' : 'error'}`;
            }
        });
    }

    // Handle completion
    if (data.status === 'complete') {
        document.getElementById('resultsSection').style.display = 'block';
        displayResults(data.finalResults);
    }
}

// --- Results display for batch processing ---
function displayResults(results) {
    resultsDiv.innerHTML = '';

    results.results.forEach((result, index) => {
        const resultItem = document.createElement('div');
        resultItem.className = `result-item ${result.success ? 'success' : 'error'}`;
        
        if (result.success) {
            resultItem.innerHTML = `
                <h3 onclick="toggleResult(this)">${result.filename}</h3>
                <div class="content">
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>${result.data.headers.map(h => `<th>${h}</th>`).join('')}</tr>
                            </thead>
                            <tbody>
                                ${result.data.rows.map(row => 
                                    `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`
                                ).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        } else {
            resultItem.innerHTML = `
                <h3 onclick="toggleResult(this)">${result.filename}</h3>
                <div class="content">
                    <p class="error-message">Error: ${result.error}</p>
                </div>
            `;
        }
        
        resultsDiv.appendChild(resultItem);
    });
}

// --- State for Aggregated Data ---
let allExtractedData = {
    headers: [],
    rows: []
};
let masterColumnCount = 0; // Store the user-defined column count for the batch
let successfulFiles = 0; // Count successful extractions

// --- Dynamic Column Input Generation ---
function generateColumnInputs() {
    const count = parseInt(columnCountInput.value, 10);
    const columnDetails = document.getElementById('columnDetails');
    columnDetails.innerHTML = ''; // Clear previous

    if (!isNaN(count) && count > 0) {
        for (let i = 0; i < count; i++) {
            const columnDiv = document.createElement('div');
            columnDiv.className = 'column-input';
            columnDiv.innerHTML = `
                <label>Column ${i + 1}:</label>
                <input type="text" name="columnNames" placeholder="Column name" required>
                <input type="text" name="columnExamples" placeholder="Example content">
            `;
            columnDetails.appendChild(columnDiv);
        }
    }
}
// Add event listener
columnCountInput.addEventListener('change', generateColumnInputs);
// Initial call based on default value
generateColumnInputs();

// --- Form Submission Handler (for single file processing) ---
uploadForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const files = imageInput.files;
    if (!files || files.length === 0) {
        showError("Please select one or more image files.");
        return;
    }
    if (isNaN(parseInt(columnCountInput.value, 10)) || parseInt(columnCountInput.value, 10) <= 0) {
        showError("Please enter a valid number of columns.");
        return;
    }

    // Reset state for new batch
    allExtractedData = { headers: [], rows: [] };
    masterColumnCount = parseInt(columnCountInput.value, 10);
    successfulFiles = 0;
    clearMessages();
    showProgress(true, `Starting processing for ${files.length} file(s)...`);
    resultsDiv.innerHTML = '<p>Processing...</p>';
    submitButton.disabled = true;
    submitButton.textContent = 'Processing...';

    // Try batch processing if multiple files
    if (files.length > 1) {
        try {
            const formData = new FormData();
            
            // Add files
            Array.from(files).forEach(file => {
                formData.append('imageFiles', file);
            });

            // Add other form data
            formData.append('imageDescription', imageDescriptionInput.value);
            formData.append('columnCount', columnCountInput.value);
            
            // Add column details
            const columnNames = document.getElementsByName('columnNames');
            const columnExamples = document.getElementsByName('columnExamples');
            
            Array.from(columnNames).forEach(input => {
                formData.append('columnNames', input.value);
            });
            
            Array.from(columnExamples).forEach(input => {
                formData.append('columnExamples', input.value);
            });

            // Show progress container
            progressDiv.style.display = 'block';
            progressBarElem.style.width = '0%';
            progressTextElem.textContent = 'Starting processing...';

            // Submit the form
            const response = await fetch(`${API_BASE_URL}/api/extract-tables-batch`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            
            if (data.success) {
                currentJobId = data.jobId;
                connectWebSocket(data.wsPort);
                return; // Exit early as batch processing takes over
            } else {
                console.warn("Batch processing failed, falling back to individual processing:", data.error);
                // Continue with individual processing below
            }
        } catch (error) {
            console.warn("Batch processing error, falling back to individual processing:", error);
            // Continue with individual processing below
        }
    }

    // Process files individually
    let processedFileCount = 0;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        processedFileCount++;
        showProgress(true, `Processing file ${processedFileCount} of ${files.length}: ${file.name}`);

        // --- Gather ALL data for FormData ---
        const formData = new FormData();
        formData.append('imageFile', file); // Current file
        // Context data (same for all files in this batch)
        formData.append('imageDescription', imageDescriptionInput.value);
        formData.append('columnCount', columnCountInput.value);
        document.querySelectorAll('input[name="columnNames"]').forEach(input => formData.append('columnNames', input.value));
        document.querySelectorAll('input[name="columnExamples"]').forEach(input => formData.append('columnExamples', input.value));

        try {
            const response = await fetch(BACKEND_API_URL, {
                method: 'POST',
                body: formData,
            });

            let data;
            try {
                data = await response.json();
            } catch (jsonError) {
                appendMessage(`Error parsing response for ${file.name}: ${jsonError.message}`, 'error');
                console.error('JSON parsing error:', jsonError);
                continue;
            }

            // Handle backend errors or logical failures
            if (!response.ok || !data.success) {
                const errorMsg = data.error || `Server error for ${file.name}`;
                appendMessage(`Error for ${file.name}: ${errorMsg}`, 'error');
                console.error(`Backend error for ${file.name}:`, data);
                continue; // Skip to next file
            }

            // --- Process successful response for THIS file ---
            console.log(`Data received for ${file.name}:`, data.data);

            // Validate basic structure received
            if (!data.data || !data.data.headers || !data.data.rows || !Array.isArray(data.data.headers) || !Array.isArray(data.data.rows)) {
                appendMessage(`Invalid data structure received for ${file.name}. Skipping file.`, 'warning');
                console.warn(`Invalid data structure for ${file.name}:`, data.data);
                continue;
            }

            // Check if AI returned the expected number of headers specified by user
            if (data.data.headers.length !== masterColumnCount) {
                 appendMessage(`Column count mismatch for ${file.name}. AI returned ${data.data.headers.length} headers, expected ${masterColumnCount} based on input. Skipping file.`, 'warning');
                 console.warn(`Header count mismatch for ${file.name}. Expected ${masterColumnCount}, Got:`, data.data.headers);
                 continue;
             }

            // --- Aggregate Data ---
            // Use headers from the first successful file as the master headers for the batch display/download
            if (allExtractedData.headers.length === 0) {
                allExtractedData.headers = data.data.headers; // Should match user input now
            } else {
                // Optional: Could double-check if AI returned *different* header names than first file, though unlikely if prompt is followed.
                // For simplicity, we assume if length matches, headers are as specified.
            }

            // Add rows from this file to the aggregated list
            allExtractedData.rows.push(...data.data.rows);
            successfulFiles++;

        } catch (error) {
            appendMessage(`Network or Processing error for ${file.name}: ${error.message}`, 'error');
            console.error(`Workspace/Parse Error for ${file.name}:`, error);
        }
    } // End loop

    // --- Finalize UI ---
    showProgress(false);
    submitButton.disabled = false;
    submitButton.textContent = 'Extract Tables';
    imageInput.value = ''; // Clear file input selection

    const resultsSection = document.getElementById('resultsSection');
    if (successfulFiles > 0) {
        if (resultsSection) {
            resultsSection.style.display = 'block';
        }
        renderTable(allExtractedData); // Render aggregated results
        if (successfulFiles > 1 && aggregationInfoDiv) {
            aggregationInfoDiv.textContent = `Showing aggregated data from ${successfulFiles} of ${files.length} processed file(s). Check messages above for skipped files or warnings.`;
        }
    } else {
        resultsDiv.innerHTML = '<p>No table data extracted successfully.</p>';
        if (!errorDiv.textContent && files.length > 0) {
            showError("Could not extract any valid table data from the provided image(s).");
        } else if (!errorDiv.textContent && files.length === 0) {
            resultsDiv.innerHTML = '<p>No files selected.</p>';
        }
    }
}); // End of form submit listener

// --- Helper Functions ---

function showProgress(isLoading, message = '') {
    progressDiv.style.display = isLoading ? 'block' : 'none';
    if(isLoading) {
        // Try to extract percentage if present in the message
        const percentMatch = message.match(/\d+%/);
        if (percentMatch) {
            progressBarElem.style.width = percentMatch[0];
        }
        progressTextElem.textContent = message;
    }
}

function clearMessages() {
     errorDiv.textContent = '';
     errorDiv.style.display = 'none';
     errorDiv.className = 'status error'; // Reset class list
     // Keep resultsDiv showing 'Processing...' until loop ends or first table renders
}

// Shows a critical error message, clearing others
function showError(message) {
    clearMessages();
    if (message) {
        errorDiv.textContent = `Error: ${message}`;
        errorDiv.style.display = 'block';
        errorDiv.classList.add('critical-error');
        resultsDiv.innerHTML = '<p>Processing failed.</p>'; // Update results view on critical error
    }
}

// Appends messages (errors or warnings) to the error/info div
function appendMessage(message, type = 'warning') {
     errorDiv.style.display = 'block';
     errorDiv.classList.add('has-messages');
     // Apply critical error style if type is error, otherwise warning style is default via CSS
     if (type === 'error') {
         errorDiv.classList.add('critical-error');
     }
     // Append message using list items for better readability
     const li = document.createElement('li');
     li.textContent = message;
     // Ensure a UL exists or create one
     let ul = errorDiv.querySelector('ul');
     if (!ul) {
         ul = document.createElement('ul');
         // Clear any initial text content if starting list
         if (!errorDiv.hasChildNodes() || (errorDiv.childNodes.length === 1 && errorDiv.firstChild.nodeType === Node.TEXT_NODE)) {
             errorDiv.textContent = '';
         }
         errorDiv.appendChild(ul);
     }
     ul.appendChild(li);
}

// Renders the AGGREGATED table data
function renderTable(tableData) {
    resultsDiv.innerHTML = ''; // Clear previous content or 'Processing...' msg

    if (!tableData || !tableData.headers || !Array.isArray(tableData.headers) || tableData.headers.length === 0) {
        resultsDiv.innerHTML = '<p>No headers found in extracted data.</p>';
        return;
    }

    const resultItem = document.createElement('div');
    resultItem.className = 'result-item success';
    
    resultItem.innerHTML = `
        <h3 onclick="toggleResult(this)">Combined Results</h3>
        <div class="content">
            <div class="table-container">
                <table>
                    <thead>
                        <tr>${tableData.headers.map(h => `<th>${h}</th>`).join('')}</tr>
                    </thead>
                    <tbody>
                        ${tableData.rows.length === 0 ? 
                            `<tr><td colspan="${tableData.headers.length}" style="text-align: center">No data rows extracted successfully.</td></tr>` : 
                            tableData.rows.map(row => 
                                `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`
                            ).join('')
                        }
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    resultsDiv.appendChild(resultItem);
}

// Toggle result collapse/expand
window.toggleResult = function(header) {
    const resultItem = header.parentElement;
    resultItem.classList.toggle('collapsed');
};

// Toggle all results
document.getElementById('toggleAllResults')?.addEventListener('click', function() {
    const button = this;
    const resultItems = document.querySelectorAll('.result-item');
    const isCollapsing = button.textContent === 'Collapse All';

    resultItems.forEach(item => {
        if (isCollapsing) {
            item.classList.add('collapsed');
        } else {
            item.classList.remove('collapsed');
        }
    });

    button.textContent = isCollapsing ? 'Expand All' : 'Collapse All';
});

// --- Download Functions ---
// Operate on the aggregated 'allExtractedData'
function downloadCSV(data, filename = "extracted_data.csv") {
    if (!data || !data.headers || !data.rows || data.headers.length === 0 || data.rows.length === 0) {
        alert("No aggregated data available to download.");
        return;
    }
    let csvContent = "";
    const headerCount = data.headers.length;
    csvContent += data.headers.map(header => `"${String(header).replace(/"/g, '""')}"`).join(",") + "\r\n";
    data.rows.forEach(rowArray => {
        let row = [];
        const currentRowData = Array.isArray(rowArray) ? rowArray : [];
        for (let i = 0; i < headerCount; i++) {
            let cell = (currentRowData[i] !== undefined && currentRowData[i] !== null) ? String(currentRowData[i]) : '';
            row.push(`"${cell.replace(/"/g, '""')}"`);
        }
        if (row.length === headerCount) { // Should always be true now
           csvContent += row.join(",") + "\r\n";
        }
    });
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' }); // Add BOM
    triggerDownload(blob, filename);
}

function downloadXLSX(data, filename = "extracted_data.xlsx") {
     if (!data || !data.headers || !data.rows || data.headers.length === 0 || data.rows.length === 0) {
        alert("No aggregated data available to download.");
        return;
    }
     if (typeof XLSX === 'undefined') {
         alert("Excel library (SheetJS) not loaded. Cannot download XLSX.");
         return;
     }
     const headerCount = data.headers.length;
     // Ensure all rows match header count for SheetJS
     const worksheetData = [
        data.headers,
        ...data.rows.map(row => {
            const currentRowData = Array.isArray(row) ? row : [];
            if (currentRowData.length < headerCount) {
                return [...currentRowData, ...Array(headerCount - currentRowData.length).fill('')];
            } else if (currentRowData.length > headerCount) {
                return currentRowData.slice(0, headerCount);
            } else {
                return currentRowData;
            }
        })
    ];
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    try {
        XLSX.writeFile(wb, filename);
    } catch (error) {
         console.error("Error generating Excel file:", error);
         alert("Could not generate Excel file. See console for details.");
     }
}

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

// Attach listeners for the download buttons
document.getElementById('downloadCSV')?.addEventListener('click', () => {
    if (allExtractedData && allExtractedData.rows.length > 0) {
        downloadCSV(allExtractedData);
    } else {
        alert("No successful aggregated data available to download.");
    }
});

document.getElementById('downloadExcelSeparate')?.addEventListener('click', () => {
    if (allExtractedData && allExtractedData.rows.length > 0) {
        downloadXLSX(allExtractedData);
    } else {
        alert("No successful aggregated data available to download.");
    }
});

// Handle Excel combined downloads
document.getElementById('downloadExcelCombined')?.addEventListener('click', () => {
    const results = document.querySelectorAll('.result-item.success');
    if (results.length === 0) {
        alert('No successful results to download');
        return;
    }

    // Create workbook with single sheet
    const wb = XLSX.utils.book_new();
    let allRows = [];
    let headers = [];

    // Collect all data
    results.forEach((result, index) => {
        const table = result.querySelector('table');
        if (!table) return;

        const ws = XLSX.utils.table_to_sheet(table);
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (index === 0) {
            headers = data[0];
            allRows.push(data[0]); // Add headers only once
        }

        // Add filename column to each row
        const filename = result.querySelector('h3').textContent;
        data.slice(1).forEach(row => {
            allRows.push([filename, ...row]);
        });
    });

    // Create worksheet with combined data
    const ws = XLSX.utils.aoa_to_sheet([
        ['Filename', ...headers],
        ...allRows.slice(1)
    ]);

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Combined Data');

    // Save workbook
    XLSX.writeFile(wb, 'extracted_tables_combined.xlsx');
});

// Handle CSV combined downloads
document.getElementById('downloadCSVCombined')?.addEventListener('click', () => {
    const results = document.querySelectorAll('.result-item.success');
    if (results.length === 0) {
        alert('No successful results to download');
        return;
    }

    let allRows = [];
    let headers = [];

    // Collect all data
    results.forEach((result, index) => {
        const table = result.querySelector('table');
        if (!table) return;

        const ws = XLSX.utils.table_to_sheet(table);
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (index === 0) {
            headers = data[0];
            allRows.push(['Filename', ...headers].join(',')); // Add headers with filename column
        }

        // Add filename to each row
        const filename = result.querySelector('h3').textContent;
        data.slice(1).forEach(row => {
            allRows.push([filename, ...row].join(','));
        });
    });

    // Create and download CSV file
    const csv = allRows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'extracted_tables_combined.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
});