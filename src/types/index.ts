export interface Question {
  id: number;
  question: string;
  answer: string;
  category: string;
}

export interface VoiceOption {
  name: string;
  lang: string;
  gender: "female" | "male";
  voiceURI?: string;
}

export interface SpeechState {
  isPlaying: boolean;
  selectedVoice: string;
  availableVoices: VoiceOption[];
}

export interface VoiceSelectorProps {
  selectedVoice: string;
  onVoiceChange: (voice: string) => void;
  onTestVoice: (voiceName: string) => void;
  isPlaying?: boolean;
  availableVoices: VoiceOption[];
}
