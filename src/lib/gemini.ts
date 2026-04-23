export async function extractReceiptData(base64Image: string, mimeType: string) {
    const response = await fetch('/api/extract-receipt', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ base64Image, mimeType })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to extract receipt data");
    }

    const data = await response.json();
    const text = data.text || "{}";

    try {
        const cleanText = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
        const parsedData = JSON.parse(cleanText);
        return parsedData;
    } catch (e) {
        console.error("Failed to parse Gemini response as JSON:", text);
        throw new Error("Gemini returned invalid JSON: " + text.substring(0, 60) + "...");
    }
}
