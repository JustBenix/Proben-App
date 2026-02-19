
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const evaluateResponse = async (
  expectedText: string,
  userText: string,
  strictness: string
) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Evaluate this actor's line. 
      Expected: "${expectedText}"
      User input: "${userText}"
      Strictness: ${strictness}
      
      Return a score from 0 to 1 and a short helpful feedback message in German.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            feedback: { type: Type.STRING }
          },
          required: ["score", "feedback"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Evaluation error:", error);
    const score = userText.toLowerCase().includes(expectedText.toLowerCase().slice(0, 5)) ? 0.7 : 0.3;
    return { score, feedback: "Konnte keine KI-Bewertung durchführen. Manuelle Prüfung empfohlen." };
  }
};

export const suggestCueWords = async (text: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze this theater script block and suggest 3 unique "cue words" (Stichworte) that would trigger this line. 
      Text: "${text}"
      
      Return as a JSON array of strings.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    return ["Stichwort 1", "Stichwort 2"];
  }
};

export const cleanAndStructureScript = async (rawText: string) => {
  try {
    // We take a large chunk but keep it within limits for the first few blocks
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `This text was extracted from a theater script PDF and is messy. 
      Clean it up and split it into logical dialogue blocks. 
      Remove page numbers, headers, and footer artifacts.
      Preserve character names if possible.
      
      Raw Text:
      ${rawText.substring(0, 15000)}
      
      Return a JSON array of strings, where each string is one clean block of dialogue or stage direction.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Structuring error:", error);
    return null; // Fallback to manual split
  }
};
