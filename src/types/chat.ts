import type { Message } from '../services/azureOpenAI';

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  azureSessionId?: string; // Azure Response API session ID for context management
}
