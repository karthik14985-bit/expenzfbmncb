
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, ReceiptData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const scanReceipt = async (base64Image: string): Promise<ReceiptData | null> => {
  const prompt = "Extract transaction details from this receipt: Total Amount, Description (Store/Merchant Name), Category (pick from: Food & Drink, Shopping, Housing, Transport, Travel, Entertainment, Health, Utilities, Other), and Date (YYYY-MM-DD).";
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { data: base64Image.split(',')[1], mimeType: "image/jpeg" } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER },
            description: { type: Type.STRING },
            category: { type: Type.STRING },
            date: { type: Type.STRING }
          },
          required: ["amount", "description", "category", "date"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Receipt Scan Error:", error);
    return null;
  }
};
