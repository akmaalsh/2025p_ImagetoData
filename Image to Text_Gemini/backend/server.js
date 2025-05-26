// console.log("--- Server.js script started ---"); // For debugging
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const mime = require('mime-types');

const app = express();
const port = process.env.PORT || 3002; // Ensure this matches your setup

const PARAGRAPH_EXTRACTION_PROMPT = `Analyze the provided image containing text. Your goal is to extract the textual content, organized by paragraphs.

**Instructions:**

1.  **Read Text:** Accurately perform OCR on the entire image to read the text content.
2.  **Identify Paragraphs:** Identify distinct paragraphs or logical text blocks. Use visual cues like vertical spacing between blocks, indentation (especially for numbered or lettered lists like (a), (b), (c)), and changes in numbering (like 11, 12, 13...) to determine paragraph breaks. Treat each numbered/lettered item in a list as a separate paragraph if visually distinct.
3.  **Extract Content:** Extract the full text content of each identified paragraph. Preserve internal line breaks (\\n) within a paragraph where they exist in the original text, as they might be meaningful.
4.  **Exclude Headers/Footers:** Ignore page numbers (like 'XVI / 3'), standalone headers, or footers unless they are directly part of a paragraph's content flow. Also ignore visual elements like watermarks if possible.
5.  **Output Format:** Structure the output ONLY as a JSON object with a single key: \`"paragraphs"\`.
6.  **JSON Array:** The value associated with the \`"paragraphs"\` key MUST be a JSON array.
7.  **Paragraphs as Strings:** Each element within the \`"paragraphs"\` array MUST be a string containing the complete text of one extracted paragraph.
8.  **Order:** The paragraph strings in the array should appear in the same top-to-bottom, left-to-right order as they appear visually in the image.
9.  **Strict JSON:** Output ONLY the valid JSON object. Do not include any explanations, summaries, or markdown formatting (like \`\`\`json or \`\`\`). If no text paragraphs are found, return {"paragraphs": []}.
10. **Language:** The text can be in any language. Preserve the original language.
11. **Completeness:** Ensure all identifiable text within paragraphs is extracted. Do not summarize.
`;

app.use(cors());
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 20 * 1024 * 1024 }
});

app.post('/api/extract-paragraphs-gemini', upload.single('imageFile'), async (req, res) => {
    console.log(`Received request to /api/extract-paragraphs-gemini for file: ${req.file?.originalname}`);

    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
        return res.status(401).json({ success: false, error: "API key required" });
    }

    if (!req.file) {
        return res.status(400).json({ success: false, error: "No image file provided." });
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash-latest",
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            ],
            generationConfig: {
                responseMimeType: "application/json",
            }
        });

        const imageBase64 = req.file.buffer.toString('base64');
        let detectedMimeType = req.file.mimetype;

        if (!detectedMimeType || detectedMimeType === 'application/octet-stream') {
            detectedMimeType = mime.lookup(req.file.originalname) || 'image/jpeg';
        }
        if (!['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif'].includes(detectedMimeType)) {
            console.warn(`Unsupported MIME type: ${detectedMimeType}, attempting with image/jpeg as a fallback.`);
            detectedMimeType = 'image/jpeg';
        }

        const textPart = { text: PARAGRAPH_EXTRACTION_PROMPT };
        const imagePart = {
            inlineData: { data: imageBase64, mimeType: detectedMimeType }
        };
        const promptParts = [textPart, imagePart];

        console.log(`Sending request to Gemini API with MIME type: ${detectedMimeType}...`);
        const result = await model.generateContent({ contents: [{ role: "user", parts: promptParts }] });
        
        let jsonString;
        const candidate = result?.response?.candidates?.[0];

        if (candidate && candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
            const firstPart = candidate.content.parts[0];
            if (firstPart && typeof firstPart.text === 'string') {
                jsonString = firstPart.text; // The JSON string is in the 'text' property of the first part
                console.log("Extracted JSON string from response.parts[0].text:", jsonString.substring(0, 250) + "...");
            } else {
                // This case might occur if parts[0] is the direct object (less likely based on recent findings)
                // or if the structure is different.
                console.error("Gemini response parts[0] is not in the expected {text: 'json_string'} format, or text property is missing/not a string:", firstPart);
                // Attempt to use the full text response as a last resort if parts[0].text wasn't the string
                const fullTextResponse = result?.response?.text?.();
                if (fullTextResponse) {
                    console.log("Falling back to full text response as JSON string.");
                    jsonString = fullTextResponse;
                } else {
                    throw new Error("Unexpected structure in Gemini response part and no fallback text response available.");
                }
            }
        } else {
            // Fallback if the primary candidate/parts structure isn't found
            const textResponse = result?.response?.text?.(); 
            if (textResponse) {
                console.log("Gemini did not return expected parts structure, attempting to use full text response as JSON string.");
                jsonString = textResponse; 
            } else {
                console.error("Gemini response, candidate, or parts structure is unexpected or empty:", result?.response);
                throw new Error("No content found in Gemini response or response structure is unexpected.");
            }
        }

        if (!jsonString) { // Should be caught by throws above, but as a safeguard
             return res.status(500).json({ success: false, error: "Failed to extract any processable content string from Gemini API response." });
        }
        
        let parsedData;
        try {
            parsedData = JSON.parse(jsonString);
        } catch (parseError) {
            console.error("Failed to parse JSON string extracted from Gemini:", parseError);
            console.error("Problematic JSON string snippet:", jsonString.substring(0, 500));
            return res.status(500).json({ success: false, error: "Failed to parse the JSON content from Gemini API.", details: parseError.message, raw_response_string: jsonString });
        }
        
        console.log("Gemini API Response Content (successfully parsed from jsonString):", parsedData);

        if (!parsedData || !Array.isArray(parsedData.paragraphs)) {
            console.error("Parsed JSON missing 'paragraphs' array or invalid structure:", parsedData);
            return res.status(500).json({ 
                success: false, 
                error: "Invalid data structure from Gemini API (missing 'paragraphs' array).", 
                raw_parsed_response: parsedData // Send back what was parsed if it's not the expected structure
            });
        }

        console.log(`Successfully processed with Gemini. Found ${parsedData.paragraphs.length} paragraphs.`);
        res.json({ success: true, data: parsedData });

    } catch (error) {
        console.error("Error during Gemini API call or response processing:", error);
        let errorMessage = "An error occurred while communicating with the Gemini API or processing its response.";
        let errorDetails = error.message;
        
        if (error.message && (error.message.toLowerCase().includes("api key not valid") || error.message.toLowerCase().includes("invalid api key"))) {
             errorMessage = "Invalid API key provided to Gemini. Please check the API key.";
             return res.status(401).json({ success: false, error: errorMessage, details: errorDetails});
        }

        res.status(500).json({
            success: false,
            error: errorMessage,
            details: errorDetails
        });
    }
});

app.get('/gemini', (req, res) => res.send('Image Paragraph Extractor Backend (Gemini Version) is running!'));
app.listen(port, () => {
    console.log(`Gemini Backend server listening at http://localhost:${port}`);
});