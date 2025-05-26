// console.log("--- Server.js script started ---"); // You can keep or remove this
require('dotenv').config(); // This line loads variables from .env into process.env
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const mime = require('mime-types');

const app = express();
const port = process.env.PORT || 3002;

// Load the API key from environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.error("FATAL ERROR: GEMINI_API_KEY is not defined in the .env file or environment variables.");
    // Optionally, you could exit the process if the key is critical for startup,
    // but for now, we'll let requests fail if the key isn't configured.
    // process.exit(1); // Uncomment to make the server exit if key is missing
}

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

    if (!GEMINI_API_KEY) { // Check if the key was loaded from .env
        console.error("GEMINI_API_KEY is not configured on the server.");
        return res.status(500).json({ success: false, error: "API key not configured on the server. Please contact the administrator." });
    }

    if (!req.file) {
        return res.status(400).json({ success: false, error: "No image file provided." });
    }

    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY); // Use the key from process.env
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
            console.warn(`Unsupported MIME type: ${detectedMimeType}, attempting with image/jpeg`);
            detectedMimeType = 'image/jpeg';
        }

        const imagePart = {
            inlineData: {
                data: imageBase64,
                mimeType: detectedMimeType
            }
        };

        const promptParts = [
            PARAGRAPH_EXTRACTION_PROMPT,
            imagePart
        ];

        console.log(`Sending request to Gemini API with MIME type: ${detectedMimeType}...`);
        const result = await model.generateContent({ contents: [{ role: "user", parts: promptParts }] });
        
        let messageContent;
        const candidate = result?.response?.candidates?.[0];

        if (candidate && candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
            messageContent = candidate.content.parts[0];
        } else {
            const textResponse = result?.response?.text?.();
            if (textResponse) {
                console.log("Gemini did not directly return JSON object, attempting to parse text response.");
                messageContent = JSON.parse(textResponse);
            } else {
                throw new Error("No content found in Gemini response or response structure is unexpected.");
            }
        }

        if (!messageContent) {
             return res.status(500).json({ success: false, error: "Received empty or invalid structured response from Gemini API." });
        }
        console.log("Gemini API Response Content (parsed or direct object):", messageContent);

        let parsedData;
        if (typeof messageContent === 'object') {
            parsedData = messageContent;
        } else if (typeof messageContent === 'string') {
            console.warn("Response content was a string, attempting to parse manually.");
            parsedData = JSON.parse(messageContent);
        } else {
             return res.status(500).json({ success: false, error: "Unexpected response type from Gemini API.", raw_response_type: typeof messageContent });
        }

        if (!parsedData || !Array.isArray(parsedData.paragraphs)) {
            console.error("Parsed JSON missing 'paragraphs' array or invalid structure:", parsedData);
            return res.status(500).json({ success: false, error: "Invalid data structure from Gemini API (missing 'paragraphs' array).", raw_response: messageContent });
        }

        console.log(`Successfully processed with Gemini. Found ${parsedData.paragraphs.length} paragraphs.`);
        res.json({ success: true, data: parsedData });

    } catch (error) {
        console.error("Error calling Gemini API or processing its response:", error);
        let errorMessage = "An error occurred while communicating with the Gemini API.";
        let errorDetails = error.message;
        // No longer need to check for "API key not valid" from client, as it's server-configured
        res.status(500).json({
            success: false,
            error: errorMessage,
            details: errorDetails,
            raw_error: error 
        });
    }
});

app.get('/gemini', (req, res) => res.send('Image Paragraph Extractor Backend (Gemini Version) is running!'));
app.listen(port, () => {
    if (!GEMINI_API_KEY) {
        console.warn(`**********************************************************************************`);
        console.warn(`* WARNING: GEMINI_API_KEY is not set. The API calls will fail.                 *`);
        console.warn(`* Please create a .env file in the backend directory with your GEMINI_API_KEY. *`);
        console.warn(`**********************************************************************************`);
    }
    console.log(`Gemini Backend server listening at http://localhost:${port}`);
});