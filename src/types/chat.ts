import type { Message } from '../services/azureOpenAI';

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  azureResponseId?: string; // Azure Response API response ID for context chaining
}
