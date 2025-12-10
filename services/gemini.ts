import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export interface MetadataResult {
  title: string;
  description: string;
  author?: string;
  publishedTime?: string;
  keywords?: string[];
}

export async function fetchMetadataWithGemini(url: string): Promise<MetadataResult> {
  try {
    const model = 'gemini-2.5-flash';
    
    // We cannot use responseMimeType: "application/json" with googleSearch tool.
    // So we prompt the model to return a JSON string explicitly.
    const prompt = `
      I need metadata for this website: ${url}.
      First, use Google Search to find the actual page title, summary, author, publication date, and relevant tags/keywords.
      
      Then, output the result strictly as a JSON object with the following structure:
      {
        "title": "The page title (max 60 chars)",
        "description": "A concise description (max 120 chars)",
        "author": "Author name or organization (optional, empty string if unknown)",
        "publishedTime": "Publication date e.g., 'Oct 12, 2024' (optional, empty string if unknown)",
        "keywords": ["tag1", "tag2", "tag3"] (max 3 relevant short tags, optional)
      }
      
      Do not add markdown formatting (like \`\`\`json). Just the raw JSON string.
      If the website is not accessible or unknown, infer a generic title/description based on the domain name.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        // responseMimeType and responseSchema are NOT supported with googleSearch in the current API version.
      }
    });

    let text = response.text;
    if (!text) {
        throw new Error("Empty response from Gemini");
    }

    // Clean up if the model accidentally wraps it in markdown
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Metadata Error:", error);
    // Fallback if Gemini fails or parsing fails
    try {
        const domain = new URL(url).hostname;
        return {
          title: domain,
          description: "Link to " + url,
          author: "",
          publishedTime: "",
          keywords: []
        };
    } catch {
        return {
            title: "Website",
            description: url,
            author: "",
            publishedTime: "",
            keywords: []
        };
    }
  }
}