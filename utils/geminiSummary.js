import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function generateSummary(content){
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
    Summarize the following blog in STRICTLY 3-4 concise lines.
    Do not exceed 4 lines.  No bullet points.

    Blog:
    ${content}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;

    return response.text().trim();
}