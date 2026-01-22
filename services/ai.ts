
import { GoogleGenAI } from "@google/genai";

// Safe accessor for process.env.API_KEY to prevent ReferenceError
const getApiKey = () => {
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env.API_KEY;
    }
  } catch (e) {
    // process not defined
  }
  return undefined;
};

/**
 * Expose configuration status for debugging in the UI
 */
export const checkAIConfig = () => {
  const key = getApiKey();
  return {
    hasKey: !!key,
    keyPrefix: key ? key.substring(0, 5) + '...' : 'MISSING'
  };
};

const sanitizeOneSentence = (text: any): string => {
  if (typeof text !== 'string') return '';
  let clean = text.replace(/[-_]/g, ' ').replace(/\n/g, ' ').trim();
  clean = clean.replace(/\s+/g, ' ');
  const sentenceSplit = clean.match(/^(.+?)([.!?]\s|$)/);
  if (sentenceSplit) clean = sentenceSplit[1];
  clean = clean.replace(/[.!?,;:]+$/, '');
  return clean.substring(0, 80).trim();
};

/**
 * Generates SEO-optimized metadata.
 */
export const generateVideoMetadata = async (topic: string) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("AI Metadata: No API Key found.");
    return { 
      title: sanitizeOneSentence(topic), 
      description: `Exploring content related to ${topic}.`,
      hashtags: ['video', 'vidfree']
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a content strategist. Generate a title, a 2-sentence description, and 5 hashtags for: "${topic}". Format: JSON {title, description, hashtags: string[]}.`,
      config: { responseMimeType: "application/json" }
    });
    
    const result = JSON.parse(response.text || '{}');
    return {
      title: sanitizeOneSentence(result.title || topic),
      description: result.description || `Exploring ${topic}.`,
      hashtags: Array.isArray(result.hashtags) ? result.hashtags : ['trending']
    };
  } catch (error) {
    console.error("AI Metadata Generation failed:", error);
    return { title: sanitizeOneSentence(topic), description: `Video about ${topic}.`, hashtags: [] };
  }
};

/**
 * Generates an enhanced description using title and existing draft.
 */
export const generateEnhancedDescription = async (
  title: string, 
  currentDescription: string, 
  imageBase64?: string | null
): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Missing API Key. Ensure process.env.API_KEY is configured.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `Write a high-energy, professional 3-4 sentence video description for a video titled "${title}". ${currentDescription ? `Expand on this draft: "${currentDescription}".` : ''} English only. No special symbols.`;
  
  const parts: any[] = [];
  if (imageBase64) {
    let data = imageBase64;
    let mimeType = 'image/jpeg';
    if (imageBase64.startsWith('data:')) {
      const match = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        data = match[2];
      }
    }
    parts.push({ inlineData: { mimeType, data } });
  }
  parts.push({ text: prompt });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts },
    });

    const output = response.text?.trim();
    if (!output) throw new Error("AI returned no content.");
    return output;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "Failed to generate description.");
  }
};

/**
 * Segment subject using Flash Image model.
 */
export const segmentSubjectLayer = async (base64Image: string): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("Missing API configuration.");

  const ai = new GoogleGenAI({ apiKey });
  
  let data = base64Image;
  let mimeType = 'image/jpeg';
  if (base64Image.startsWith('data:')) {
    const match = base64Image.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      mimeType = match[1];
      data = match[2];
    }
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { mimeType, data } },
          { text: "Generate a precise B&W ALPHA MASK for this image. Subject must be WHITE. Background must be BLACK." }
        ]
      }
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error("No image data returned from AI.");
  } catch (error) {
    console.error("AI Subject isolation failed:", error);
    throw error;
  }
};
