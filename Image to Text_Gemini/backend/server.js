require('dotenv').config(); // For potential future backend-specific configs
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const mime = require('mime-types'); // For more robust MIME type detection

const app = express();
const port = process.env.PORT || 3002; // Changed port to avoid conflict if running both old and new
                                       // You can change this back to 3001 if preferred.

// --- Prompt for Paragraph Extraction (Adjusted for Gemini if needed, starting with similar) ---
// This prompt is crucial. It might need further tuning based on Gemini's response behavior.
const PARAGRAPH_EXTRACTION_PROMPT = `Analyze the provided image containing text. Your goal is to extract the textual content, organized by paragraphs.

**Instructions:**

1.  **Read Text:** Accurately perform OCR on the entire image to read the text content.
2.  **Identify Paragraphs:** Identify distinct paragraphs or logical text blocks. Use visual cues like vertical spacing between blocks, indentation (especially for numbered or lettered lists like (a), (b), (c)), and changes in numbering (like 11, 12, 13...) to determine paragraph breaks. Treat each numbered/lettered item in a list as a separate paragraph if visually distinct.
3.  **Extract Content:** Extract the full text content of each identified paragraph. Preserve internal line breaks (\\n) within a paragraph where they exist in the original text, as they might be meaningful.
4.  **Exclude Headers/Footers:** Ignore page numbers (like 'XVI / 3'), standalone headers, or footers unless they are directly part of a paragraph's content flow. Also ignore visual elements like watermarks if possible.
5.  **Output Format:** Structure the output ONLY as a JSON object with a single key: "paragraphs".
6.  **JSON Array:** The value associated with the "paragraphs" key MUST be a JSON array.
7.  **Paragraphs as Strings:** Each element within the "paragraphs" array MUST be a string containing the complete text of one extracted paragraph.
8.  **Order:** The paragraph strings in the array should appear in the same top-to-bottom, left-to-right order as they appear visually in the image.
9.  **Strict JSON:** Output ONLY the valid JSON object. Do not include any explanations, summaries, or markdown formatting. If no text paragraphs are found, return {"paragraphs": []}.
10. **Language:** The text can be in any language. Preserve the original language.
11. **Completeness:** Ensure all identifiable text within paragraphs is extracted. Do not summarize.`;

// --- Middleware ---
app.use(cors());
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 20 * 1024 * 1024 } // Gemini API has limits (e.g., 4MB for inline data in some models, but larger via other methods if needed)
                                          // Let's use a 20MB limit for Multer, but be mindful of API limits.
});

// --- API Endpoint ---
app.post('/api/extract-paragraphs-gemini', upload.single('imageFile'), async (req, res) => {
    console.log(`Received request to /api/extract-paragraphs-gemini for file: ${req.file?.originalname}`);

    const apiKey = req.headers['x-api-key']; // Expecting Gemini API key here
    if (!apiKey) {
        return res.status(401).json({ success: false, error: "API key required" });
    }
    // Note: Gemini API keys don't have a standard prefix like 'sk-', so we remove that specific check.

    if (!req.file) {
        return res.status(400).json({ success: false, error: "No image file provided." });
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        // For multimodal tasks, "gemini-1.5-flash-latest" is a good choice.
        // or "gemini-pro-vision" (older) or "gemini-1.5-pro-latest" for more complex tasks.
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash-latest", // Or "gemini-1.5-pro-latest"
            safetySettings: [ // Optional: Adjust safety settings if needed
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            ],
            generationConfig: {
                responseMimeType: "application/json", // This is crucial for direct JSON output
            }
        });

        const imageBase64 = req.file.buffer.toString('base64');
        let detectedMimeType = req.file.mimetype;

        // Fallback for MIME type if not provided or generic
        if (!detectedMimeType || detectedMimeType === 'application/octet-stream') {
            detectedMimeType = mime.lookup(req.file.originalname) || 'image/jpeg'; // Default if lookup fails
        }
        // Ensure it's a common image MIME type
        if (!['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif'].includes(detectedMimeType)) {
            console.warn(`Unsupported MIME type: ${detectedMimeType}, attempting with image/jpeg`);
            detectedMimeType = 'image/jpeg'; // Default or attempt common
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
        try {
            const candidate = result?.response?.candidates?.[0];
            if (candidate && candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
                messageContent = candidate.content.parts[0];
            } else {
                const textResponse = result?.response?.text?.();
                if (textResponse) {
                    messageContent = JSON.parse(textResponse);
                } else {
                    throw new Error("No content found in Gemini response or response is not JSON.");
                }
            }

            if (!messageContent) {
                return res.status(500).json({ success: false, error: "Received empty or invalid structured response from Gemini API." });
            }
            console.log("Raw Gemini API Response Content (parsed or direct object):", messageContent);

            let parsedData;
            if (typeof messageContent === 'string') {
                console.log("Response was a string, attempting to parse JSON from string:", messageContent.substring(0,200));
                parsedData = JSON.parse(messageContent);
            } else if (typeof messageContent === 'object') {
                parsedData = messageContent;
            } else {
                return res.status(500).json({ success: false, error: "Unexpected response type from Gemini API.", raw_response: messageContent });
            }

            if (!parsedData || !Array.isArray(parsedData.paragraphs)) {
                console.error("Parsed JSON missing 'paragraphs' array or invalid structure:", parsedData);
                return res.status(500).json({ success: false, error: "Invalid data structure from Gemini API (missing 'paragraphs' array).", raw_response: messageContent });
            }

            console.log(`Successfully processed with Gemini. Found ${parsedData.paragraphs.length} paragraphs.`);
            res.json({ success: true, data: parsedData });

        } catch (parseError) {
            console.error("Failed to parse Gemini API response or response was not valid JSON:", parseError);
            console.error("Raw content that failed processing (if available as text):", result?.response?.text ? result.response.text() : "N/A (might be structured or error)");
            res.status(500).json({ success: false, error: "Failed to parse response from Gemini API.", details: parseError.message, raw_response: result?.response?.text ? result.response.text() : "N/A" });
        }

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        let errorMessage = "An error occurred while communicating with the Gemini API.";
        let errorDetails = error.message;
        if (error.message && error.message.includes("API key not valid")) {
            errorMessage = "Invalid API key. Please check your Gemini API key.";
            return res.status(401).json({ success: false, error: errorMessage, details: errorDetails});
        }
        // More detailed error messages can be extracted from error.status or error.details if provided by the SDK
        res.status(500).json({
            success: false,
            error: errorMessage,
            details: errorDetails
        });
    }
});

app.get('/gemini', (req, res) => res.send('Image Paragraph Extractor Backend (Gemini Version) is running!'));
app.listen(port, () => console.log(`Gemini Backend server listening at http://localhost:${port}`)); 