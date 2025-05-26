require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/genai');

const app = express();
const port = process.env.PORT || 3001;

// --- Prompt for Paragraph Extraction (Adjusted for Gemini if needed, but looks generally okay) ---
// Ensured backticks and quotes are properly escaped for a JS string literal.
const PARAGRAPH_EXTRACTION_PROMPT = `Analyze the provided image containing text. Your goal is to extract the textual content, organized by paragraphs.\n\n**Instructions:**\n\n1.  **Read Text:** Accurately perform OCR on the entire image to read the text content.\n2.  **Identify Paragraphs:** Identify distinct paragraphs or logical text blocks. Use visual cues like vertical spacing between blocks, indentation (especially for numbered or lettered lists like (a), (b), (c)), and changes in numbering (like 11, 12, 13...) to determine paragraph breaks. Treat each numbered/lettered item in a list as a separate paragraph if visually distinct.\n3.  **Extract Content:** Extract the full text content of each identified paragraph. Preserve internal line breaks (\\\\n) within a paragraph where they exist in the original text, as they might be meaningful.\n4.  **Exclude Headers/Footers:** Ignore page numbers (like 'XVI / 3'), standalone headers, or footers unless they are directly part of a paragraph's content flow. Also ignore visual elements like watermarks if possible.\n5.  **Output Format:** Structure the output ONLY as a JSON object with a single key: \`"paragraphs"\`.\n6.  **JSON Array:** The value associated with the \`"paragraphs"\` key MUST be a JSON array.\n7.  **Paragraphs as Strings:** Each element within the \`"paragraphs"\` array MUST be a string containing the complete text of one extracted paragraph.\n8.  **Order:** The paragraph strings in the array should appear in the same top-to-bottom, left-to-right order as they appear visually in the image.\n9.  **Strict JSON Adherence:** Output ONLY the valid JSON object. Do not include any explanations, summaries, or markdown formatting (like \`\`\`json). If no text paragraphs are found return {"paragraphs": []}.`;

// --- Middleware ---
app.use(cors());
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// --- API Endpoint ---
app.post('/api/extract-paragraphs', upload.single('imageFile'), async (req, res) => {
    console.log('Received request to /api/extract-paragraphs for file: ' + (req.file ? req.file.originalname : 'No file'));

    // Check for API key in headers (assuming frontend sends it as x-api-key)
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
        return res.status(401).json({ success: false, error: "API key required" });
    }
    // Basic validation for Gemini API key (though format isn't strictly defined like OpenAI's 'sk-')
    // For now, just check if it's a non-empty string.
    if (typeof apiKey !== 'string' || apiKey.trim() === '') {
        return res.status(401).json({ success: false, error: "Invalid API key format or empty key." });
    }

    // Create Gemini AI instance with user's API key
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-04-17" }); // Or gemini-pro-vision if older SDK/more specific model needed

    if (!req.file) {
        return res.status(400).json({ success: false, error: "No image file provided." });
    }

    try {
        const base64Image = req.file.buffer.toString('base64');
        const mimeType = req.file.mimetype || 'image/jpeg';

        console.log('Sending request to Gemini API...');

        const imagePart = {
            inlineData: {
                data: base64Image,
                mimeType: mimeType
            }
        };

        const result = await model.generateContent([PARAGRAPH_EXTRACTION_PROMPT, imagePart]);
        const geminiResponse = await result.response; // Corrected variable name

        // Check for safety ratings or blocks from Gemini
        if (geminiResponse.promptFeedback && geminiResponse.promptFeedback.blockReason) {
            const blockReason = geminiResponse.promptFeedback.blockReason;
            console.error('Request blocked by Gemini API due to: ' + blockReason);
            return res.status(400).json({ success: false, error: 'Request blocked by API: ' + blockReason });
        }

        if (!geminiResponse.candidates || geminiResponse.candidates.length === 0) {
            console.error('No candidates in response from Gemini API.');
            return res.status(500).json({ success: false, error: 'No candidates in API response' });
        }

        const candidate = geminiResponse.candidates[0];
        if (candidate.finishReason && candidate.finishReason !== 'STOP' && candidate.finishReason !== 'MAX_TOKENS') {
             console.warn('Gemini Model finished with reason: ' + candidate.finishReason);
        }
        
        // Assuming the response content is in parts and needs to be joined.
        const messageContent = candidate.content && candidate.content.parts 
            ? candidate.content.parts.map(part => part.text).join('') 
            : '';

        console.log('Received response from Gemini API.');

        if (!messageContent) {
             return res.status(500).json({ success: false, error: "Received empty response content from API." });
        }
        // console.log("Raw API Response Content Snippet:", messageContent.substring(0, 200));

        try {
            let jsonString = messageContent.trim();
            // Gemini might return JSON directly, or within ```json ... ```. Prioritize direct parsing if possible.
            const jsonBlockMatch = jsonString.match(/^```(?:json)?\\s*([\\s\\S]*?)\\s*```$/);
            if (jsonBlockMatch && jsonBlockMatch[1]) {
                jsonString = jsonBlockMatch[1].trim();
            }
            // Basic cleaning: if it's not a valid JSON object start, try to find the first '{' and last '}'
            else if (!jsonString.startsWith('{') || !jsonString.endsWith('}')){
                const firstBrace = jsonString.indexOf('{');
                const lastBrace = jsonString.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                    jsonString = jsonString.substring(firstBrace, lastBrace + 1);
                }
            }

            const parsedData = JSON.parse(jsonString);

            // Validate expected structure
            if (!parsedData || !Array.isArray(parsedData.paragraphs)) {
                console.error("Parsed JSON missing 'paragraphs' array:", parsedData);
                 return res.status(500).json({ success: false, error: "Invalid data structure from API (missing 'paragraphs' array).", raw_response: messageContent.substring(0, 500) });
            }

            console.log('Successfully parsed response. Found ' + parsedData.paragraphs.length + ' paragraphs.');
            res.json({ success: true, data: parsedData });

        } catch (parseError) {
            console.error("Failed to parse API response as JSON:", parseError);
            console.error("Raw content that failed parsing (length " + jsonString.length + "):", jsonString.substring(0,1000));
            res.status(500).json({ success: false, error: "Failed to parse response from API.", raw_response: messageContent.substring(0, 500) });
        }

    } catch (error) {
        console.error("Error calling Gemini API:", error.message);
        // Check if it's a GoogleGenerativeAIError for more specific details
        if (error.constructor.name === 'GoogleGenerativeAIError') {
             console.error("Gemini API Error Details:", error.statusInfo || error.message);
        }
        res.status(500).json({
            success: false,
            error: "An error occurred while communicating with the Gemini API.",
            details: error.message
        });
    }
});

app.get('/', (req, res) => res.send('Image Paragraph Extractor Backend (Gemini) is running!'));
app.listen(port, () => console.log('Backend server (Gemini) listening at http://localhost:' + port));