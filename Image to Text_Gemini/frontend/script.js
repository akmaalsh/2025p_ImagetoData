console.log("--- script.js started ---"); // For debugging

const imageInput = document.getElementById('imageInput');
console.log("imageInput element:", imageInput); // For debugging

const submitButton = document.getElementById('submitButton');
console.log("submitButton element:", submitButton); // For debugging

const progressDiv = document.getElementById('progress');
const errorDiv = document.getElementById('error');
const resultsOutputDiv = document.getElementById('resultsOutput');
const downloadSectionDiv = document.getElementById('downloadSection');
const downloadTxtButton = document.getElementById('downloadTxtButton');
const downloadCsvButton = document.getElementById('downloadCsvButton');
const downloadSeparateSheets = document.getElementById('downloadSeparateSheets');
const downloadSingleSheet = document.getElementById('downloadSingleSheet');
const aggregationInfoDiv = document.getElementById('aggregationInfo');
const fileList = document.getElementById('fileList');
const toggleAllResults = document.getElementById('toggleAllResults');

// IMPORTANT: This URL must match your backend server's address, port, and the Gemini endpoint.
const BACKEND_API_URL = 'http://localhost:3002/api/extract-paragraphs-gemini';

// --- API Key Handling ---
const API_KEY_STORAGE_NAME = 'google_ai_api_key';

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded event fired. Running checkApiKey()."); // For debugging
    checkApiKey();
});

function checkApiKey() {
    console.log("checkApiKey() called."); // For debugging
    const apiKey = localStorage.getItem(API_KEY_STORAGE_NAME);
    if (!apiKey) {
        const modal = document.getElementById('apiKeyModal');
        console.log("apiKeyModal element:", modal); // For debugging
        if (modal) {
            modal.style.display = 'block';
        } else {
            console.error("apiKeyModal element not found! Cannot display API key input."); // For debugging
        }
        return false;
    }
    return apiKey;
}

function saveApiKey() {
    console.log("saveApiKey() called."); // For debugging
    const apiKeyInput = document.getElementById('apiKeyInput');
    if (!apiKeyInput) {
        console.error("apiKeyInput element not found!");
        return;
    }
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
        alert('Please enter a valid Google AI API key.');
        return;
    }
    localStorage.setItem(API_KEY_STORAGE_NAME, apiKey);
    const modal = document.getElementById('apiKeyModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function toggleApiKeyVisibility() {
    console.log("toggleApiKeyVisibility() called."); // For debugging
    const input = document.getElementById('apiKeyInput');
    const button = document.getElementById('toggleApiKey');
    if (!input || !button) {
        console.error("API key input or toggle button not found!");
        return;
    }
    if (input.type === 'password') {
        input.type = 'text';
        button.textContent = 'Hide';
    } else {
        input.type = 'password';
        button.textContent = 'Show';
    }
}

function clearApiKey() {
    console.log("clearApiKey() called."); // For debugging
    localStorage.removeItem(API_KEY_STORAGE_NAME);
    const apiKeyInput = document.getElementById('apiKeyInput');
    if (apiKeyInput) {
        apiKeyInput.value = '';
    }
    const modal = document.getElementById('apiKeyModal');
    if (modal) {
        modal.style.display = 'block';
    } else {
        console.error("apiKeyModal element not found! Cannot display after clearing key.");
    }
}

// --- State for Aggregated Data ---
let imageResults = [];
let totalFiles = 0;
let processedFileCount = 0;
let successfulFilesCount = 0;

// --- File Upload Handling ---
if (imageInput) {
    imageInput.addEventListener('change', (event) => {
        console.log("imageInput 'change' event fired."); // For debugging
        const files = event.target.files;
        if (!fileList) {
            console.error("fileList element not found!");
            return;
        }
        fileList.innerHTML = ''; 
        
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
    console.log("Event listener attached to imageInput."); // For debugging
} else {
    console.error("Could not find imageInput element to attach 'change' event listener."); // For debugging
}

// --- Button Click Handler ---
if (submitButton) {
    submitButton.addEventListener('click', async () => {
        console.log("submitButton 'click' event fired."); // For debugging
        const apiKey = checkApiKey(); // Ensure API key exists before proceeding
        if (!apiKey) {
            console.log("API key missing, aborting submission."); // For debugging
            // checkApiKey() already shows the modal if key is missing.
            return; 
        }

        if (!imageInput) {
            console.error("imageInput element not found for file processing!");
            showError("File input element is missing. Please refresh.");
            return;
        }
        const files = imageInput.files;
        if (!files || files.length === 0) {
            showError("Please select one or more image files.");
            return;
        }

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

        if (fileList) {
            Array.from(fileList.children).forEach(item => {
                item.className = 'file-item';
                item.querySelector('.file-status').textContent = 'Pending';
            });
        } else {
            console.warn("fileList element not found for status updates.");
        }


        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            processedFileCount++;
            showProgress(true, `Processing file ${processedFileCount} of ${totalFiles}: ${file.name}`);

            const fileItem = fileList ? fileList.children[i] : null;
            if (fileItem) {
                fileItem.querySelector('.file-status').textContent = 'Processing';
            }

            const formData = new FormData();
            formData.append('imageFile', file);

            try {
                console.log("Fetching backend URL:", BACKEND_API_URL); // For debugging
                const response = await fetch(BACKEND_API_URL, {
                    method: 'POST',
                    headers: {
                        'X-API-Key': apiKey // Sending the API key in the header
                    },
                    body: formData,
                });
                console.log("Backend response status:", response.status); // For debugging

                const data = await response.json();
                console.log("Backend response data:", data); // For debugging

                if (response.status === 401) {
                    showError(data.error || "Invalid or expired API key. Please enter a new key.");
                    clearApiKey(); 
                    showProgress(false); // Hide progress
                    submitButton.disabled = false; // Re-enable button
                    submitButton.textContent = 'Extract Paragraphs';
                    return; 
                }

                if (!response.ok || !data.success) {
                    const errorMsg = data.error || `Server error processing ${file.name}`;
                    appendMessage(`Error for ${file.name}: ${errorMsg} (Details: ${data.details || 'N/A'})`, 'error');
                    console.error(`Backend error for ${file.name}:`, data);
                    if (fileItem) {
                        fileItem.classList.add('error');
                        fileItem.querySelector('.file-status').textContent = 'Error';
                    }
                    continue;
                }
                
                if (!data.data || !Array.isArray(data.data.paragraphs)) {
                    appendMessage(`Invalid data structure received for ${file.name}. AI might not have found text or returned an unexpected format.`, 'warning');
                    console.warn(`Invalid data structure for ${file.name}:`, data.data);
                    if (fileItem) {
                        fileItem.classList.add('error'); 
                        fileItem.querySelector('.file-status').textContent = 'No Text / Invalid AI Response';
                    }
                    continue;
                }

                if (data.data.paragraphs.length > 0) {
                    imageResults.push({
                        filename: file.name,
                        paragraphs: data.data.paragraphs
                    });
                    successfulFilesCount++;
                    if (fileItem) {
                        fileItem.classList.add('success');
                        fileItem.querySelector('.file-status').textContent = 'Success';
                    }
                } else {
                    appendMessage(`Note: No paragraphs extracted by AI from ${file.name}. The image might not contain recognizable text or paragraphs.`, 'info');
                    if (fileItem) {
                        fileItem.classList.add('warning'); 
                        fileItem.querySelector('.file-status').textContent = 'No Text Found';
                    }
                }

            } catch (error) {
                appendMessage(`Network or application error processing ${file.name}: ${error.message}. Check console.`, 'error');
                console.error(`Application Error for ${file.name}:`, error);
                if (fileItem) {
                    fileItem.classList.add('error');
                    fileItem.querySelector('.file-status').textContent = 'Client Error';
                }
            }
        }

        showProgress(false);
        submitButton.disabled = false;
        submitButton.textContent = 'Extract Paragraphs';

        if (successfulFilesCount > 0) {
            displayResults(imageResults);
            if (downloadSectionDiv) downloadSectionDiv.style.display = 'block';
            if (downloadTxtButton) downloadTxtButton.disabled = false;
            if (downloadCsvButton) downloadCsvButton.disabled = false;
            if (downloadSeparateSheets) downloadSeparateSheets.disabled = false;
            if (downloadSingleSheet) downloadSingleSheet.disabled = false;

            if (aggregationInfoDiv) {
                if (totalFiles > 1 || processedFileCount !== successfulFilesCount) {
                    aggregationInfoDiv.textContent = `Successfully processed ${successfulFilesCount} of ${totalFiles} file(s). See messages above for details on any files with issues.`;
                } else if (totalFiles === 1 && successfulFilesCount === 1) {
                    aggregationInfoDiv.textContent = `Successfully processed ${files[0].name}.`;
                }
            }
        } else {
            if (resultsOutputDiv) resultsOutputDiv.innerHTML = '<p>No paragraphs extracted successfully from the selected image(s).</p>';
            if (files && files.length > 0 && errorDiv && !errorDiv.textContent) { 
                showError("Could not extract any paragraphs. The image(s) might not contain text, or the AI could not process them.");
            } else if (files && files.length === 0 && resultsOutputDiv) { 
                 resultsOutputDiv.innerHTML = '<p>No files were selected.</p>';
            }
            if (downloadSectionDiv) downloadSectionDiv.style.display = 'none';
        }
    });
    console.log("Event listener attached to submitButton."); // For debugging
} else {
    console.error("Could not find submitButton element to attach 'click' event listener."); // For debugging
}

// --- Toggle All Results ---
if (toggleAllResults) {
    toggleAllResults.addEventListener('click', () => {
        console.log("toggleAllResults 'click' event fired."); // For debugging
        const resultItems = document.querySelectorAll('.result-item');
        const isCurrentlyCollapsed = toggleAllResults.textContent === 'Expand All';
        
        resultItems.forEach(item => {
            if (isCurrentlyCollapsed) {
                item.classList.remove('collapsed');
            } else {
                item.classList.add('collapsed');
            }
        });
        toggleAllResults.textContent = isCurrentlyCollapsed ? 'Collapse All' : 'Expand All';
    });
    console.log("Event listener attached to toggleAllResults."); // For debugging
} else {
    console.error("Could not find toggleAllResults element to attach 'click' event listener.");
}


// --- Helper Functions ---
// (Ensuring these are robust and defined)

function showProgress(isLoading, message = '') {
    if (!progressDiv) {
        // console.warn("progressDiv not found for showProgress");
        return;
    }
    const progressText = progressDiv.querySelector('.progress-text');
    const progressBarFill = progressDiv.querySelector('.progress-bar-fill');
    
    progressDiv.style.display = isLoading ? 'block' : 'none';
    
    if (isLoading && progressText && progressBarFill) {
        progressText.textContent = message;
        const progress = totalFiles > 0 ? (processedFileCount / totalFiles) * 100 : 0;
        progressBarFill.style.width = `${progress}%`;
    } else if (progressBarFill) {
        if(progressText) progressText.textContent = '';
        progressBarFill.style.width = '0%';
    }
}

function clearMessages() {
    if (errorDiv) {
        errorDiv.innerHTML = ''; 
        errorDiv.style.display = 'none';
        errorDiv.className = 'status error'; 
    }
    if (resultsOutputDiv) resultsOutputDiv.innerHTML = '<p>Upload image(s) and click "Extract Paragraphs".</p>';
    if (aggregationInfoDiv) aggregationInfoDiv.textContent = '';
    if (downloadSectionDiv) downloadSectionDiv.style.display = 'none';
    
    const buttonsToDisable = [downloadTxtButton, downloadCsvButton, downloadSeparateSheets, downloadSingleSheet];
    buttonsToDisable.forEach(btn => {
        if (btn) btn.disabled = true;
    });

    imageResults = []; 
    successfulFilesCount = 0;
}

function showError(message) { 
    // clearMessages(); // showError is often an addition to other messages, or the main one.
                     // If called after clearMessages, it's fine. If meant to be the *only* message, clearMessages should precede it.
    if (!errorDiv) {
        console.error("errorDiv not found, cannot show error:", message);
        alert("Error: " + message); // Fallback
        return;
    }
    errorDiv.style.display = 'block';
    // errorDiv.classList.add('critical-error'); // This class might not exist or be what you want for all 'showError' calls
    errorDiv.className = 'status error critical-error has-messages'; // Be explicit


    let ul = errorDiv.querySelector('ul');
    if (!ul) {
        errorDiv.innerHTML = ''; // Clear previous direct text content before adding ul
        ul = document.createElement('ul');
        errorDiv.appendChild(ul);
    }
    const li = document.createElement('li');
    li.textContent = message;
    ul.appendChild(li);

    if (resultsOutputDiv && resultsOutputDiv.innerHTML.includes("Processing...")) {
       resultsOutputDiv.innerHTML = '<p>Extraction failed.</p>';
    }
}

function appendMessage(message, type = 'info') { 
    if (!errorDiv) {
        console.warn("errorDiv not found, cannot append message:", message);
        return;
    }
    errorDiv.style.display = 'block';
    errorDiv.classList.add('has-messages');

    let ul = errorDiv.querySelector('ul');
    if (!ul) {
        errorDiv.innerHTML = ''; 
        ul = document.createElement('ul');
        errorDiv.appendChild(ul);
    }
    const li = document.createElement('li');
    li.textContent = message;
    li.className = `message-${type}`; 
    ul.appendChild(li);
}

function displayResults(results) {
    if (!resultsOutputDiv) {
        console.error("resultsOutputDiv not found for displaying results.");
        return;
    }
    resultsOutputDiv.innerHTML = '';
    if (!results || results.length === 0) {
        resultsOutputDiv.innerHTML = "<p>No paragraphs were extracted successfully.</p>";
        return;
    }

    results.forEach((result, index) => {
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';
        
        const header = document.createElement('h3');
        header.textContent = `Image ${index + 1}: ${result.filename}`;
        resultItem.appendChild(header);

        const content = document.createElement('div');
        content.className = 'content';
        result.paragraphs.forEach((text, pIndex) => {
            const p = document.createElement('p');
            p.innerText = text; 
            p.style.whiteSpace = 'pre-line'; 
            if (pIndex < result.paragraphs.length - 1) {
                p.style.marginBottom = '1em'; 
            }
            content.appendChild(p);
        });
        resultItem.appendChild(content);
        resultsOutputDiv.appendChild(resultItem);

        if (header) { // Ensure header exists before adding listener
            header.addEventListener('click', () => {
                resultItem.classList.toggle('collapsed');
            });
        }
    });
    if (toggleAllResults) toggleAllResults.textContent = 'Collapse All';
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
         alert("File download is not fully supported in your browser or an error occurred.");
     }
}

function downloadTxt(results, filename = 'extracted_text_gemini.txt') {
    if (!results || results.length === 0) {
        alert("No results available to download.");
        return;
    }
    let textContent = `Extracted Text (Gemini Model)\n${"=".repeat(40)}\n\n`;
    results.forEach((result, index) => {
        textContent += `Image ${index + 1}: ${result.filename}\n`;
        textContent += `${"-".repeat(result.filename.length + 10)}\n\n`;
        textContent += result.paragraphs.join('\n\n'); 
        textContent += `\n\n${"=".repeat(40)}\n\n`;
    });
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
    triggerDownload(blob, filename);
}

function downloadExcelSeparateSheets(results, filename = 'extracted_text_gemini_separate.xlsx') {
    if (!results || results.length === 0) {
        alert("No results available to download.");
        return;
    }
    const wb = XLSX.utils.book_new();
    results.forEach((result, index) => {
        let sheetName = `Image ${index + 1}`;
        if (result.filename) {
            sheetName = result.filename.substring(0, 25).replace(/[*?:/\\[\]]/g, "_") + `_${index + 1}`;
        }
        sheetName = sheetName.substring(0, 31); // Final length check

        const wsData = [
            ["Image Filename:", result.filename],
            ["Extraction Date:", new Date().toLocaleString()],
            [""], 
            ["Paragraph Number", "Extracted Text"] 
        ];
        result.paragraphs.forEach((text, pIndex) => {
            wsData.push([`Paragraph ${pIndex + 1}`, text]);
        });
        
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws['!cols'] = [{wch:30}, {wch:20}, {wch:100}]; 
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });
    try {
      XLSX.writeFile(wb, filename);
    } catch (e) {
      console.error("Error writing Excel file:", e);
      alert("An error occurred while generating the Excel file.");
    }
}

function downloadExcelSingleSheet(results, filename = 'extracted_text_gemini_combined.xlsx') {
    if (!results || results.length === 0) {
        alert("No results available to download.");
        return;
    }
    const wb = XLSX.utils.book_new();
    const wsData = [["Image Filename", "Paragraph Number", "Extracted Text"]];
    results.forEach((result) => {
        result.paragraphs.forEach((text, paragraphIndex) => {
            wsData.push([
                result.filename,
                `Paragraph ${paragraphIndex + 1}`,
                text
            ]);
        });
    });
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{wch:30}, {wch:20}, {wch:100}]; 
    XLSX.utils.book_append_sheet(wb, ws, "All Extracted Text");
    try {
      XLSX.writeFile(wb, filename);
    } catch (e) {
      console.error("Error writing Excel file:", e);
      alert("An error occurred while generating the Excel file.");
    }
}

function downloadCSV(results, filename = 'extracted_text_gemini.csv') {
    if (!results || results.length === 0) {
        alert("No results available to download.");
        return;
    }
    const header = ["Image Filename", "Paragraph Number", "Extracted Text"];
    let csvContent = "\uFEFF"; 
    csvContent += header.map(h => `"${String(h).replace(/"/g, '""')}"`).join(",") + "\r\n";

    results.forEach((result) => {
        result.paragraphs.forEach((text, paragraphIndex) => {
            const row = [
                result.filename,
                `Paragraph ${paragraphIndex + 1}`,
                text
            ];
            csvContent += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",") + "\r\n";
        });
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    triggerDownload(blob, filename);
}

// --- Event Listeners for Download Buttons ---
// Ensuring elements exist before adding listeners
if(downloadTxtButton) downloadTxtButton.addEventListener('click', () => imageResults.length > 0 ? downloadTxt(imageResults) : alert("No results to download."));
if(downloadCsvButton) downloadCsvButton.addEventListener('click', () => imageResults.length > 0 ? downloadCSV(imageResults) : alert("No results to download."));
if(downloadSeparateSheets) downloadSeparateSheets.addEventListener('click', () => imageResults.length > 0 ? downloadExcelSeparateSheets(imageResults) : alert("No results to download."));
if(downloadSingleSheet) downloadSingleSheet.addEventListener('click', () => imageResults.length > 0 ? downloadExcelSingleSheet(imageResults) : alert("No results to download."));

// --- Initial State ---
console.log("Running clearMessages() on script load."); // For debugging
clearMessages(); // Initial UI setup
console.log("--- script.js finished initial execution ---"); // For debugging