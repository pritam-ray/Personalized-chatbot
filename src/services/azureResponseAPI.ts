/**
 * Azure OpenAI Response API Client
 * Uses Azure's Response API with session management for context retention
 * This reduces token costs by maintaining conversation context on Azure's side
 */

import type { Message } from './azureOpenAI';

const AZURE_ENDPOINT = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT;
const AZURE_API_KEY = import.meta.env.VITE_AZURE_OPENAI_API_KEY;
const AZURE_API_VERSION = import.meta.env.VITE_AZURE_OPENAI_API_VERSION || '2024-08-01-preview';
const AZURE_DEPLOYMENT = import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT_NAME;

interface ResponseAPIOptions {
  sessionId?: string; // Existing session ID for context continuity
  temperature?: number;
  maxTokens?: number;
}

export class AzureResponseAPI {
  private apiKey: string;
  private endpoint: string;
  private apiVersion: string;
  private deployment: string;

  constructor() {
    this.apiKey = AZURE_API_KEY;
    this.endpoint = AZURE_ENDPOINT;
    this.apiVersion = AZURE_API_VERSION;
    this.deployment = AZURE_DEPLOYMENT;
    
    if (!this.apiKey || !this.endpoint) {
      console.warn('[AzureResponseAPI] ⚠️ Azure OpenAI credentials not configured');
    }
  }

  isConfigured(): boolean {
    return !!(this.apiKey && this.endpoint && this.deployment);
  }

  /**
   * Stream a chat response with session management
   * If sessionId is provided, Azure maintains context automatically
   */
  async *streamWithSession(
    userMessage: string,
    options: ResponseAPIOptions = {}
  ): AsyncGenerator<{ content: string; sessionId?: string; done?: boolean }> {
    if (!this.isConfigured()) {
      throw new Error('Azure OpenAI not configured');
    }

    const url = `${this.endpoint}/openai/deployments/${this.deployment}/chat/completions?api-version=${this.apiVersion}`;
    
    const requestBody: any = {
      messages: [{ role: 'user', content: userMessage }],
      stream: true,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 4000,
    };

    // Add session context if provided
    if (options.sessionId) {
      requestBody.session_id = options.sessionId;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Azure Response API error: ${response.status} - ${error}`);
    }

    // Extract session ID from response headers
    const sessionId = response.headers.get('x-ms-session-id') || 
                      response.headers.get('azureml-model-session') ||
                      options.sessionId;

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('Response body is not readable');
    }

    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // Send session ID on completion
          yield { content: '', sessionId, done: true };
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();

          if (trimmedLine === '' || trimmedLine === 'data: [DONE]') {
            continue;
          }

          if (trimmedLine.startsWith('data: ')) {
            try {
              const jsonStr = trimmedLine.slice(6);
              const data = JSON.parse(jsonStr);

              if (data.choices?.[0]?.delta?.content) {
                yield { 
                  content: data.choices[0].delta.content,
                  sessionId
                };
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Send a message with full conversation history (fallback without session)
   */
  async *streamWithHistory(messages: Message[]): AsyncGenerator<string> {
    if (!this.isConfigured()) {
      throw new Error('Azure OpenAI not configured');
    }

    const url = `${this.endpoint}/openai/deployments/${this.deployment}/chat/completions?api-version=${this.apiVersion}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.apiKey,
      },
      body: JSON.stringify({
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        stream: true,
        max_tokens: 4000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Azure OpenAI error: ${response.status} - ${error}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('Response body is not readable');
    }

    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();

          if (trimmedLine === '' || trimmedLine === 'data: [DONE]') {
            continue;
          }

          if (trimmedLine.startsWith('data: ')) {
            try {
              const jsonStr = trimmedLine.slice(6);
              const data = JSON.parse(jsonStr);

              if (data.choices?.[0]?.delta?.content) {
                yield data.choices[0].delta.content;
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

export const azureResponseAPI = new AzureResponseAPI();
