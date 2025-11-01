export interface GeminiConfig {
  apiKey: string;
}

export interface ChatMessage {
  role: "user" | "model";
  parts: string;
}

export interface VoiceAnalysis {
  pronunciationScore: number;
  fluencyScore: number;
  feedback: string;
  suggestedImprovements: string[];
}
