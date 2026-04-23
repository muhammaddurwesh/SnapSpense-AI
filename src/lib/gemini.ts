import { GoogleGenAI } from '@google/genai';

declare global {
  interface Window {
    __ENV__: {
      GEMINI_API_KEY: string;
    };
  }
}

// Fallback to import.meta.env for local development, but use window.__ENV__ in Docker/Cloud Run
const apiKey = (window.__ENV__?.GEMINI_API_KEY !== '${GEMINI_API_KEY}' ? window.__ENV__?.GEMINI_API_KEY : undefined) || import.meta.env.GEMINI_API_KEY;

const ai = new GoogleGenAI({ apiKey: apiKey });

export async function extractReceiptData(base64Image: string, mimeType: string) {
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is missing. Please add it to your .env file.");
    }

    const prompt = `
Analyze this receipt image and extract the following information.
Return ONLY a valid JSON object with no markdown formatting or backticks.
Do not wrap it in \`\`\`json ... \`\`\`.

Required JSON format:
{
    "merchant": "Name of the store or merchant",
    "currency": "Currency code like USD, EUR, etc.",
    "items": [
        {
            "name": "Item name",
            "price": 0.00,
            "category": "One of: Groceries, Dining, Entertainment, Technology, Health, Transport, or Other"
        }
    ],
    "total": 0.00,
    "tax": 0.00
}`;

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
            responseMimeType: 'application/json'
        }
    });

    const text = response.text || "{}";

    try {
        const cleanText = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(cleanText);
        return data;
    } catch (e) {
        console.error("Failed to parse Gemini response as JSON:", text);
        throw new Error("Gemini returned invalid JSON: " + text.substring(0, 60) + "...");
    }
}
