const uploadForm = document.getElementById('uploadForm');
const imageInput = document.getElementById('imageInput');
const submitButton = document.getElementById('submitButton');
const progressDiv = document.getElementById('progress');
const errorDiv = document.getElementById('error');
const resultsDiv = document.getElementById('resultsTableContainer');
const downloadButtonsDiv = document.getElementById('downloadButtons');
const downloadCsvButton = document.getElementById('downloadCsvButton');
const downloadXlsxButton = document.getElementById('downloadXlsxButton');
const columnCountInput = document.getElementById('columnCount');
const columnInputsWrapper = document.getElementById('columnInputsWrapper');
const imageDescriptionInput = document.getElementById('imageDescription');
const aggregationInfoDiv = document.getElementById('aggregationInfo');

const BACKEND_API_URL = 'http://localhost:3000/api/extract-table';

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
    columnInputsWrapper.innerHTML = ''; // Clear previous

    if (!isNaN(count) && count > 0) {
        for (let i = 0; i < count; i++) {
            const div = document.createElement('div');
            div.className = 'column-input-row'; // Add class for styling

            const nameLabel = document.createElement('label');
            nameLabel.textContent = `Col ${i + 1} Name: `;
            nameLabel.htmlFor = `colName${i}`;
            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.id = `colName${i}`;
            nameInput.name = `columnNames[]`; // Use array notation for backend
            nameInput.required = true;
            nameInput.placeholder = `Enter Name`;

            const exampleLabel = document.createElement('label');
            exampleLabel.textContent = ` Example: `;
            exampleLabel.htmlFor = `colExample${i}`;
            const exampleInput = document.createElement('input');
            exampleInput.type = 'text';
            exampleInput.id = `colExample${i}`;
            exampleInput.name = `columnExamples[]`; // Use array notation
            exampleInput.placeholder = `(Optional)`;

            div.appendChild(nameLabel);
            div.appendChild(nameInput);
            div.appendChild(exampleLabel);
            div.appendChild(exampleInput);
            columnInputsWrapper.appendChild(div);
        }
    }
}
// Add event listener
columnCountInput.addEventListener('input', generateColumnInputs);
// Initial call based on default value
generateColumnInputs();


// --- Form Submission Handler ---
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
    downloadButtonsDiv.style.display = 'none';
    submitButton.disabled = true;
    submitButton.textContent = 'Processing...';

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
        document.querySelectorAll('input[name="columnNames[]"]').forEach(input => formData.append('columnNames[]', input.value));
        document.querySelectorAll('input[name="columnExamples[]"]').forEach(input => formData.append('columnExamples[]', input.value));

        try {
            const response = await fetch(BACKEND_API_URL, {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

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
            appendMessage(`Network or Parsing error processing ${file.name}. Check console.`, 'error');
            console.error(`Workspace/Parse Error for ${file.name}:`, error);
        }
    } // End loop

    // --- Finalize UI ---
    showProgress(false);
    submitButton.disabled = false;
    submitButton.textContent = 'Extract Tables';
    imageInput.value = ''; // Clear file input selection

    aggregationInfoDiv.textContent = ''; // Clear previous aggregation info

    if (successfulFiles > 0) {
        renderTable(allExtractedData); // Render aggregated results
        downloadButtonsDiv.style.display = 'block';
        downloadCsvButton.disabled = false;
        downloadXlsxButton.disabled = false;
         if (files.length > 1) {
             aggregationInfoDiv.textContent = `Showing aggregated data from ${successfulFiles} of ${files.length} processed file(s). Check messages above for skipped files or warnings.`;
         }
    } else {
         resultsDiv.innerHTML = '<p>No table data extracted successfully.</p>';
         if (!errorDiv.textContent && files.length > 0) {
            showError("Could not extract any valid table data from the provided image(s).");
         } else if (!errorDiv.textContent && files.length === 0) {
             resultsDiv.innerHTML = '<p>No files selected.</p>';
         }
         downloadButtonsDiv.style.display = 'none';
         downloadCsvButton.disabled = true;
         downloadXlsxButton.disabled = true;
    }

}); // End of form submit listener

// --- Helper Functions ---

function showProgress(isLoading, message = '') {
    progressDiv.style.display = isLoading ? 'block' : 'none';
    if(isLoading) progressDiv.textContent = message;
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
        downloadButtonsDiv.style.display = 'none';
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
        downloadButtonsDiv.style.display = 'none';
        return;
    }

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');
    const headerCount = tableData.headers.length;

    const headerRow = document.createElement('tr');
    tableData.headers.forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    const rows = tableData.rows || [];
    if (rows.length === 0) {
         const row = document.createElement('tr');
         const cell = document.createElement('td');
         cell.colSpan = headerCount;
         cell.textContent = "No data rows extracted successfully.";
         cell.style.textAlign = "center";
         row.appendChild(cell);
         tbody.appendChild(row);
         downloadButtonsDiv.style.display = 'none'; // No rows to download
    } else {
        rows.forEach(rowData => {
            const row = document.createElement('tr');
            const currentRowData = Array.isArray(rowData) ? rowData : [];
            // Render cells based on header count, use "" for missing data
            // Backend validation should ensure consistency, but double-check here
            for (let i = 0; i < headerCount; i++) {
                 const td = document.createElement('td');
                 td.textContent = (currentRowData[i] !== undefined && currentRowData[i] !== null) ? currentRowData[i] : '';
                 row.appendChild(td);
            }
            // Ensure row has correct number of cells visually (optional defense)
            while(row.cells.length < headerCount) {
                 row.appendChild(document.createElement('td'));
            }
            tbody.appendChild(row);
        });
         downloadButtonsDiv.style.display = (headerCount > 0 && rows.length > 0) ? 'block' : 'none';
    }

    table.appendChild(thead);
    table.appendChild(tbody);
    resultsDiv.appendChild(table);
}

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

// Attach listeners using the aggregated data state
downloadCsvButton.addEventListener('click', () => {
    if (allExtractedData && allExtractedData.rows.length > 0) {
        downloadCSV(allExtractedData);
    } else {
         alert("No successful aggregated data available to download.");
     }
});
downloadXlsxButton.addEventListener('click', () => {
     if (allExtractedData && allExtractedData.rows.length > 0) {
         downloadXLSX(allExtractedData);
     } else {
        alert("No successful aggregated data available to download.");
     }
});

// --- Initial State ---
generateColumnInputs(); // Generate inputs based on default column count
downloadButtonsDiv.style.display = 'none';
resultsDiv.innerHTML = '<p>No data extracted yet.';
clearMessages();