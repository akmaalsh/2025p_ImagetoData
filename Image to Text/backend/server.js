require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { OpenAI } = require('openai');

const app = express();
const port = process.env.PORT || 3001;

// --- Configuration ---
const openaiApiKey = process.env.OPENAI_API_KEY;
if (!openaiApiKey) {
    console.error("FATAL ERROR: OPENAI_API_KEY environment variable not set.");
    process.exit(1);
}
const openai = new OpenAI({ apiKey: openaiApiKey });

// --- Prompt for Paragraph Extraction ---
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
9.  **Strict JSON:** Output ONLY the valid JSON object. Do not include any explanations, summaries, or markdown formatting (like \`\`\`json). If no text paragraphs are found return {"paragraphs": []}.
`;

// --- Middleware ---
app.use(cors());
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// --- API Endpoint ---
app.post('/api/extract-paragraphs', upload.single('imageFile'), async (req, res) => {
    console.log(`Received request to /api/extract-paragraphs for file: ${req.file?.originalname}`);

    if (!req.file) {
        return res.status(400).json({ success: false, error: "No image file provided." });
    }

    try {
        const base64Image = req.file.buffer.toString('base64');
        const mimeType = req.file.mimetype || 'image/jpeg';

        console.log("Sending request to OpenAI API...");

        const response = await openai.chat.completions.create({
            model: "gpt-4o", // Using specified model
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: PARAGRAPH_EXTRACTION_PROMPT },
                        {
                            type: "image_url",
                            image_url: { url: `data:${mimeType};base64,${base64Image}` },
                        },
                    ],
                },
            ],
            max_tokens: 3000,
        });

        console.log("Received response from OpenAI API.");

        const messageContent = response.choices && response.choices.length > 0
            ? response.choices[0]?.message?.content
            : null;

        if (!messageContent) {
             return res.status(500).json({ success: false, error: "Received empty response from API." });
        }
        console.log("Raw API Response Content Snippet:", messageContent.substring(0, 200));

        try {
            let jsonString = messageContent;
            const jsonBlockMatch = messageContent.match(/```json\s*([\s\S]*?)\s*```/);
            if (jsonBlockMatch && jsonBlockMatch[1]) jsonString = jsonBlockMatch[1];

            const parsedData = JSON.parse(jsonString);

            // Validate expected structure
            if (!parsedData || !Array.isArray(parsedData.paragraphs)) {
                console.error("Parsed JSON missing 'paragraphs' array:", parsedData);
                 return res.status(500).json({ success: false, error: "Invalid data structure from API (missing 'paragraphs' array).", raw_response: messageContent });
            }
            // Note: No 'error' key expected in successful response based on prompt

            console.log(`Successfully parsed response. Found ${parsedData.paragraphs.length} paragraphs.`);
            res.json({ success: true, data: parsedData });

        } catch (parseError) {
            console.error("Failed to parse API response as JSON:", parseError);
            console.error("Raw content that failed parsing:", messageContent);
            res.status(500).json({ success: false, error: "Failed to parse response from API.", raw_response: messageContent });
        }

    } catch (error) {
        console.error("Error calling OpenAI API:", error.response ? JSON.stringify(error.response.data) : error.message);
        res.status(500).json({
            success: false,
            error: "An error occurred while communicating with the OpenAI API.",
            details: error.message
        });
    }
});

app.get('/', (req, res) => res.send('Image Paragraph Extractor Backend is running!'));
app.listen(port, () => console.log(`Backend server listening at http://localhost:${port}`));