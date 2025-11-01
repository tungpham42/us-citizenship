// services/geminiService.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
  }

  async generatePracticeQuestion(category?: string): Promise<string> {
    const prompt = category
      ? `Generate a US citizenship practice question about ${category}. Return only the question text.`
      : `Generate a random US citizenship practice question. Return only the question text.`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error("Error generating question:", error);
      throw error;
    }
  }

  async evaluateAnswer(
    question: string,
    userAnswer: string,
    correctAnswer: string
  ): Promise<{
    isCorrect: boolean;
    explanation: string;
    alternativeAnswers: string[];
  }> {
    const prompt = `
      Question: "${question}"
      Correct Answer: "${correctAnswer}"
      User's Answer: "${userAnswer}"
      
      Evaluate if the user's answer is correct. Consider:
      - Synonyms and equivalent meanings
      - Partial matches
      - Common variations
      
      Return JSON format:
      {
        "isCorrect": boolean,
        "explanation": "brief explanation",
        "alternativeAnswers": ["array of acceptable variations"]
      }
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      throw new Error("Invalid response format");
    } catch (error) {
      console.error("Error evaluating answer:", error);
      // Fallback to basic evaluation
      return {
        isCorrect:
          userAnswer.toLowerCase().includes(correctAnswer.toLowerCase()) ||
          correctAnswer.toLowerCase().includes(userAnswer.toLowerCase()),
        explanation: "Basic evaluation",
        alternativeAnswers: [],
      };
    }
  }

  async getPronunciationFeedback(
    text: string,
    userAudioTranscript: string
  ): Promise<{
    score: number;
    feedback: string;
    improvements: string[];
  }> {
    const prompt = `
      Compare the original text with the user's pronunciation:
      Original: "${text}"
      User's attempt: "${userAudioTranscript}"
      
      Provide pronunciation feedback in JSON format:
      {
        "score": 0-100,
        "feedback": "overall feedback",
        "improvements": ["specific improvement suggestions"]
      }
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const textResponse = response.text().trim();

      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      throw new Error("Invalid response format");
    } catch (error) {
      console.error("Error getting pronunciation feedback:", error);
      return {
        score: 70,
        feedback: "Basic pronunciation evaluation",
        improvements: ["Practice speaking slowly and clearly"],
      };
    }
  }
}
