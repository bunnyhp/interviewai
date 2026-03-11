export interface SessionContext {
  resumeText: string;
  jobDescription: string;
  roleTitle: string;
  companyName: string;
  companyResearch: string;
  systemPrompt: string;
}

export interface QAPair {
  id: string;
  question: string;
  answer: string;
  timestamp: Date;
}

export type MicState = 'idle' | 'listening' | 'processing' | 'streaming';
