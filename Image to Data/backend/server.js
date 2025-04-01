require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { OpenAI } = require('openai'); // Using OpenAI

const app = express();
const port = process.env.PORT || 3000;

// --- Configuration ---
const openaiApiKey = process.env.OPENAI_API_KEY;
if (!openaiApiKey) {
    console.error("FATAL ERROR: OPENAI_API_KEY environment variable not set.");
    process.exit(1);
}
const openai = new OpenAI({ apiKey: openaiApiKey });

// --- Middleware ---
app.use(cors());
// No need for express.json() or express.urlencoded() when using multer for multipart/form-data
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// Configure Multer
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// --- API Endpoint ---
// Use upload.any() to handle all incoming fields
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

    // --- Validation Block for Text Inputs from req.body (CORRECTED ACCESS) ---
    const { imageDescription: rawImageDesc, columnCount: rawColumnCount } = req.body;
    // *** CORRECTED: Access keys WITHOUT the [] ***
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

1.  **Strict JSON Structure:** Output ONLY a JSON object with exactly two keys:
    * \`"headers"\`: An array containing exactly ${columnCount} strings, using these specific names in this exact order: [${finalColumnNames.map(name => `"${name}"`).join(", ")}].
    * \`"rows"\`: An array of arrays, where each inner array represents a single extracted row.

2.  **Column Count Consistency:** CRUCIAL. Ensure **every** inner array in \`"rows"\` has **exactly ${columnCount} elements**, corresponding precisely to the specified headers.

3.  **Data Mapping:** Accurately map the visual data from the image into the correct specified columns based on the names and examples provided above. Handle grouping/hierarchical rows by placing their data in the appropriate columns and using "" for others according to the specified structure.

4.  **Empty Cells:** Represent visually empty cells within the table structure as empty strings (""). Do NOT omit cells.

5.  **Multi-line Text:** Combine multi-line text within a single visual cell into one string (use space as separator).

6.  **Accuracy/Illegibility:** Perform OCR carefully. Use "UNCLEAR" for genuinely illegible text.

7.  **No Table Found:** If no table matching the description is detected, return ONLY \`{"error": "No table detected"}\`.

8.  **Strict Output Format:** Output ONLY the valid JSON object. No explanations or markdown formatting.
`; // End dynamicPrompt

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
            res.status(500).json({ success: false, error: "Failed to parse response from API.", raw_response: messageContent });
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