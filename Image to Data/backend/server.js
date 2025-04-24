require('dotenv').config({ path: '../.env' });
console.log('Current working directory:', process.cwd());
console.log('Attempting to load API key:', process.env.OPENAI_API_KEY ? 'Found API key' : 'API key not found');

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { OpenAI } = require('openai');
const WebSocket = require('ws');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;
const wsPort = 3001;

// WebSocket server for progress updates
const wss = new WebSocket.Server({ port: wsPort });
console.log(`WebSocket server is running on port ${wsPort}`);

// Track active jobs
const activeJobs = new Map();

// --- Configuration ---
const openaiApiKey = process.env.OPENAI_API_KEY;
if (!openaiApiKey) {
    console.error("FATAL ERROR: OPENAI_API_KEY environment variable not set.");
    process.exit(1);
}
const openai = new OpenAI({ apiKey: openaiApiKey });

// --- Middleware ---
app.use(cors());

// Configure Multer
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Utility function to process a single image
async function processImage(imageFile, imageDescription, columnCount, columnNames, columnExamples) {
    try {
        const base64Image = imageFile.buffer.toString('base64');
        const mimeType = imageFile.mimetype || 'image/jpeg';

        // Build the prompt (existing prompt building code)
        let columnDescriptions = `There are exactly ${columnCount} columns in this table with the following names and content examples:\n`;
        for (let i = 0; i < columnCount; i++) {
            const name = columnNames[i] || `Column ${i + 1}`;
            const example = columnExamples[i] ? ` (example content is like "${columnExamples[i]}")` : "";
            columnDescriptions += `Column ${i + 1} Name: "${name}"${example}\n`;
        }

        const dynamicPrompt = `
You are an expert table data extraction assistant. Analyze "${imageDescription}" provided as an image.
Extract the main data table according to these precise specifications:

${columnDescriptions}

**Output Requirements:**
1. **Strict JSON Structure:** Output ONLY a JSON object with exactly two keys:
   * \`"headers"\`: An array containing exactly ${columnCount} strings, using these specific names in this exact order: [${columnNames.map(name => `"${name}"`).join(", ")}].
   * \`"rows"\`: An array of arrays, where each inner array represents a single extracted row.
2. **Column Count Consistency:** Ensure every inner array in \`"rows"\` has exactly ${columnCount} elements.
3. **Empty Cells:** Represent empty cells as empty strings ("").
4. **Multi-line Text:** Combine multi-line text within cells using space as separator.
5. **Illegible Text:** Use "UNCLEAR" for genuinely illegible text.
6. **No Table Found:** Return \`{"error": "No table detected"}\` if no table is found.
7. **Strict Output Format:** Output ONLY the valid JSON object.`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: dynamicPrompt },
                        { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } }
                    ]
                }
            ],
            max_tokens: 3000,
        });

        const messageContent = response.choices[0]?.message?.content;
        if (!messageContent) {
            throw new Error("Empty response from API");
        }

        // Parse and validate response
        let jsonString = messageContent;
        const jsonBlockMatch = messageContent.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonBlockMatch && jsonBlockMatch[1]) jsonString = jsonBlockMatch[1];

        const parsedData = JSON.parse(jsonString);

        // Validation checks
        if (parsedData.error) {
            return { success: false, error: parsedData.error, filename: imageFile.originalname };
        }

        if (!parsedData || !Array.isArray(parsedData.headers) || !Array.isArray(parsedData.rows)) {
            throw new Error("Invalid data structure received from API");
        }

        if (parsedData.headers.length !== columnCount) {
            throw new Error(`Header count mismatch: Expected ${columnCount}, got ${parsedData.headers.length}`);
        }

        const inconsistentRow = parsedData.rows.find(row => !Array.isArray(row) || row.length !== columnCount);
        if (inconsistentRow) {
            throw new Error(`Inconsistent row length detected`);
        }

        return { 
            success: true, 
            data: parsedData, 
            filename: imageFile.originalname 
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            filename: imageFile.originalname
        };
    }
}

// Batch processing endpoint
app.post('/api/extract-tables-batch', upload.array('imageFiles', 50), async (req, res) => {
    try {
        const files = req.files;
        if (!files || files.length === 0) {
            return res.status(400).json({ success: false, error: "No files uploaded" });
        }

        // Generate unique job ID
        const jobId = Date.now().toString();
        
        // Parse other parameters
        const imageDescription = req.body.imageDescription || "this image";
        const columnCount = parseInt(req.body.columnCount, 10);
        const columnNames = Array.isArray(req.body.columnNames) ? req.body.columnNames : [req.body.columnNames];
        const columnExamples = Array.isArray(req.body.columnExamples) ? req.body.columnExamples : [req.body.columnExamples];

        // Validate parameters
        if (isNaN(columnCount) || columnCount <= 0 || columnNames.length !== columnCount || columnExamples.length !== columnCount) {
            return res.status(400).json({
                success: false,
                error: `Invalid column specification: Expected ${columnCount} columns but received ${columnNames.length} names and ${columnExamples.length} examples.`
            });
        }

        // Initialize job tracking
        const totalFiles = files.length;
        let processedCount = 0;
        const results = [];
        
        // Store job info
        activeJobs.set(jobId, {
            total: totalFiles,
            processed: 0,
            results: []
        });

        // Process files concurrently with rate limiting
        const CONCURRENT_LIMIT = 5;
        const chunks = [];
        for (let i = 0; i < files.length; i += CONCURRENT_LIMIT) {
            chunks.push(files.slice(i, i + CONCURRENT_LIMIT));
        }

        // Send initial response
        res.json({ 
            success: true, 
            jobId,
            message: `Processing ${totalFiles} files`,
            wsPort: wsPort
        });

        // Process chunks sequentially, but files within chunks concurrently
        for (const chunk of chunks) {
            const chunkPromises = chunk.map(file => 
                processImage(file, imageDescription, columnCount, columnNames, columnExamples)
            );

            const chunkResults = await Promise.all(chunkPromises);
            results.push(...chunkResults);
            processedCount += chunk.length;

            // Update progress via WebSocket
            const progress = Math.round((processedCount / totalFiles) * 100);
            wss.clients.forEach(client => {
                client.send(JSON.stringify({
                    jobId,
                    progress,
                    processedCount,
                    totalFiles,
                    latestResults: chunkResults
                }));
            });

            // Update job tracking
            const jobInfo = activeJobs.get(jobId);
            if (jobInfo) {
                jobInfo.processed = processedCount;
                jobInfo.results = results;
            }

            // Add a small delay between chunks to avoid rate limiting
            if (chunks.length > 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        // Mark job as complete
        const finalResults = {
            jobId,
            totalProcessed: processedCount,
            results: results
        };
        
        // Clean up job tracking
        activeJobs.delete(jobId);

        // Send final update via WebSocket
        wss.clients.forEach(client => {
            client.send(JSON.stringify({
                jobId,
                progress: 100,
                processedCount,
                totalFiles,
                status: 'complete',
                finalResults
            }));
        });

    } catch (error) {
        console.error('Batch processing error:', error);
        // Send error via WebSocket
        wss.clients.forEach(client => {
            client.send(JSON.stringify({
                jobId,
                status: 'error',
                error: error.message
            }));
        });
    }
});

// Status endpoint
app.get('/api/job-status/:jobId', (req, res) => {
    const jobId = req.params.jobId;
    const jobInfo = activeJobs.get(jobId);
    
    if (!jobInfo) {
        return res.json({ status: 'not_found' });
    }

    res.json({
        status: 'in_progress',
        progress: Math.round((jobInfo.processed / jobInfo.total) * 100),
        processed: jobInfo.processed,
        total: jobInfo.total
    });
});

// Keep the existing single file endpoint
app.post('/api/extract-table', upload.any(), async (req, res) => {
    // Log received body and files for debugging
    console.log("Received req.body:", JSON.stringify(req.body, null, 2));
    console.log("Received req.files:", req.files);

    // --- Find the image file from req.files ---
    const imageFile = req.files ? req.files.find(f => f.fieldname === 'imageFile') : null;
    if (!imageFile) {
        console.log("No file with fieldname 'imageFile' uploaded");
        return res.status(400).json({ success: false, error: "No image file with fieldname 'imageFile' provided." });
    }

    // --- Validation Block for Text Inputs from req.body ---
    const { imageDescription: rawImageDesc, columnCount: rawColumnCount } = req.body;
    // Handle column names and examples which might be arrays or single values
    const rawColumnNames = req.body.columnNames;
    const rawColumnExamples = req.body.columnExamples;

    const imageDescription = rawImageDesc || "this image"; // Default description
    const columnCount = parseInt(rawColumnCount, 10);

    // Coerce to array robustly
    const finalColumnNames = !rawColumnNames ? [] : (Array.isArray(rawColumnNames) ? rawColumnNames : [rawColumnNames]);
    const finalColumnExamples = !rawColumnExamples ? [] : (Array.isArray(rawColumnExamples) ? rawColumnExamples : [rawColumnExamples]);

    console.log("Parsed values for validation check:", { columnCount, receivedNameCount: finalColumnNames.length, receivedExampleCount: finalColumnExamples.length }); // Log parsed lengths

    // Updated Validation Check
    if (isNaN(columnCount) || columnCount <= 0 || finalColumnNames.length !== columnCount || finalColumnExamples.length !== columnCount) {
        console.error("Column specification validation FAILED. Data mismatch:", {
            expectedCount: columnCount,
            nameCount: finalColumnNames.length,
            exampleCount: finalColumnExamples.length,
            namesReceived: finalColumnNames, // Log received arrays for debugging
            examplesReceived: finalColumnExamples
         });
        // Provide a slightly more informative error message back to frontend
        return res.status(400).json({ success: false, error: `Invalid column specification: Expected ${columnCount} columns based on input, but received ${finalColumnNames.length} names and ${finalColumnExamples.length} examples.` });
    }
    console.log("Column specification validation PASSED.");
    // --- End of Validation Block ---


    // --- Proceed if validation passed ---
    try {
        console.log("Processing uploaded file:", imageFile.originalname); // Use imageFile
        const base64Image = imageFile.buffer.toString('base64'); // Use imageFile
        const mimeType = imageFile.mimetype || 'image/jpeg'; // Use imageFile

        // --- Dynamically build the prompt ---
        console.log("Building dynamic prompt...");
        let columnDescriptions = `There are exactly ${columnCount} columns in this table with the following names and content examples:\n`;
        for (let i = 0; i < columnCount; i++) {
            // Use finalColumnNames/Examples which are guaranteed to be arrays of correct length here
            const name = finalColumnNames[i] || `Column ${i + 1}`;
            const example = finalColumnExamples[i] ? ` (example content is like "${finalColumnExamples[i]}")` : "";
            columnDescriptions += `Column ${i + 1} Name: "${name}"${example}\n`;
        }

        const dynamicPrompt = `
You are an expert table data extraction assistant. Analyze "${imageDescription}" provided as an image.
Extract the main data table according to these precise specifications:

${columnDescriptions}

**Output Requirements:**

1.  **Strict JSON Structure:** Output ONLY valid JSON with exactly two keys:
    * \`"headers"\`: An array containing exactly ${columnCount} strings, using these specific names in this exact order: [${finalColumnNames.map(name => `"${name}"`).join(", ")}].
    * \`"rows"\`: An array of arrays, where each inner array represents a single extracted row.

2.  **Column Count Consistency:** CRUCIAL. Ensure **every** inner array in \`"rows"\` has **exactly ${columnCount} elements**, corresponding precisely to the specified headers.

3.  **Data Mapping:** Accurately map the visual data from the image into the correct specified columns based on the names and examples provided above. Handle grouping/hierarchical rows by placing their data in the appropriate columns and using "" for others according to the specified structure.

4.  **Empty Cells:** Represent visually empty cells within the table structure as empty strings (""). Do NOT omit cells.

5.  **Multi-line Text:** Combine multi-line text within a single visual cell into one string (use space as separator).

6.  **Accuracy/Illegibility:** Perform OCR carefully. Use "UNCLEAR" for genuinely illegible text.

7.  **No Table Found:** If no table matching the description is detected, return ONLY \`{"error": "No table detected"}\`.

8.  **Strict Output Format:** Output ONLY the valid JSON object. No explanations or markdown formatting. The JSON must be properly formatted and parseable.`; // End dynamicPrompt

        console.log("Sending dynamic prompt to API...");
        // --- Make API call ---
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [ { role: "user", content: [ { type: "text", text: dynamicPrompt }, { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } } ] } ],
            max_tokens: 3000,
        });

        console.log("Received response from API.");
        const messageContent = response.choices && response.choices.length > 0 ? response.choices[0]?.message?.content : null;

        if (!messageContent) {
            console.error("API response content is empty or invalid.");
            return res.status(500).json({ success: false, error: "Received empty response from API." });
         }
        console.log("Raw API Response Content Snippet:", messageContent.substring(0, 200));

        // --- Handle response ---
        try {
            let jsonString = messageContent;
            const jsonBlockMatch = messageContent.match(/```json\s*([\s\S]*?)\s*```/);
            if (jsonBlockMatch && jsonBlockMatch[1]) jsonString = jsonBlockMatch[1];

            // Clean the JSON string before parsing
            jsonString = jsonString.trim();
            
            const parsedData = JSON.parse(jsonString);

            // Check for AI-reported error first
            if (parsedData.error) {
                 console.log("API indicated an error:", parsedData.error);
                 if (parsedData.error === "No table detected") {
                     return res.json({ success: false, error: parsedData.error }); // Let frontend handle known errors like 'No table'
                 } else {
                     return res.status(400).json({ success: false, error: parsedData.error }); // Treat other AI errors as bad request
                 }
            }
             // Validate basic structure
             if (!parsedData || typeof parsedData !== 'object' || !Array.isArray(parsedData.headers) || !Array.isArray(parsedData.rows)) {
                console.error("Parsed JSON does not contain headers/rows arrays:", parsedData);
                 return res.status(500).json({ success: false, error: "Invalid data structure received from API (missing headers/rows arrays).", raw_response: messageContent });
            }

             // *** Adjusted Backend Validation (using columnCount from user input) ***
            // 1. Check if header count matches user specification
            if (parsedData.headers.length !== columnCount) {
                 console.error(`Header count mismatch: AI returned ${parsedData.headers.length}, user specified ${columnCount}.`);
                 return res.status(500).json({ success: false, error: `AI returned ${parsedData.headers.length} headers, but ${columnCount} were specified by input.`, raw_response: messageContent.substring(0, 500) });
             }
             // 2. Check if all rows have the user-specified column count
            const inconsistentRow = parsedData.rows.find(row => !Array.isArray(row) || row.length !== columnCount);
            if (inconsistentRow) {
                console.error(`Row inconsistency detected by backend. Expected ${columnCount} columns. Problem row found.`);
                 return res.status(500).json({ success: false, error: `Inconsistent row length detected in API response (expected ${columnCount} columns).`, raw_response: messageContent.substring(0, 500) });
            }

            console.log("Successfully parsed API response and passed validation.");
            res.json({ success: true, data: parsedData }); // Send successful, consistent data

        } catch (parseError) {
            console.error("Failed to parse API response as JSON:", parseError);
            console.error("Raw content that failed parsing:", messageContent);
            res.status(500).json({ success: false, error: "Failed to parse response from API: " + parseError.message, raw_response: messageContent });
        }

    } catch (error) {
        console.error("Error calling API:", error.response ? JSON.stringify(error.response.data) : error.message);
        res.status(500).json({
            success: false,
            error: "An error occurred while communicating with the API.",
            details: error.message
        });
    }
}); // End endpoint

app.get('/', (req, res) => res.send('Image Table Extractor Backend is running!'));
app.listen(port, () => console.log(`Backend server listening at http://localhost:${port}`));