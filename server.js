import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '10mb' }));

// Cloud Run provides the PORT environment variable
const port = process.env.PORT || 8080;

// Initialize the Gemini SDK
// It checks both GEMINI_API_KEY and VITE_GEMINI_API_KEY to ensure it works
const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY 
});

// Serve the static files built by Vite
app.use(express.static(path.join(__dirname, 'dist')));

app.post('/api/extract-receipt', async (req, res) => {
  try {
    const { base64Image, mimeType } = req.body;
    
    if (!base64Image || !mimeType) {
      return res.status(400).json({ error: "Image data and mime type are required" });
    }

    const prompt = `Analyze this receipt image and extract the following information.
    Format your response strictly as a JSON object with these exact keys:
    - storeName (string)
    - date (string, YYYY-MM-DD format)
    - total (number)
    - tax (number, 0 if not found)
    - items (array of objects, each with 'name' (string), 'price' (number), and 'category' (string like 'groceries', 'dining', 'technology', 'health', etc.))

    If any value cannot be found, use null. For numbers use 0 if not found.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: base64Image,
                mimeType: mimeType
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    res.json({ text: response.text });
  } catch (error) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: "Failed to extract receipt data: " + (error.message || "Unknown Error") });
  }
});

// For any other requests, serve index.html (This allows React Router to work)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
