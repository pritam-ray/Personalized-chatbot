const { ChatOpenAI } = require('@langchain/openai');
const { DynamicStructuredTool } = require('@langchain/core/tools');
const { ChatPromptTemplate } = require('@langchain/core/prompts');
const { AgentExecutor, createOpenAIToolsAgent } = require('langchain/agents');
const axios = require('axios');
const cheerio = require('cheerio');
const { z } = require('zod');

/**
 * Web Search Tool using DuckDuckGo (no API key needed)
 * Searches the web and returns relevant results
 */
class WebSearchService {
  constructor(azureConfig) {
    this.model = new ChatOpenAI({
      azureOpenAIApiKey: azureConfig.apiKey,
      azureOpenAIApiVersion: azureConfig.apiVersion,
      azureOpenAIApiInstanceName: azureConfig.instanceName,
      azureOpenAIApiDeploymentName: azureConfig.deploymentName,
      temperature: 0.7,
      streaming: true,
    });

    this.searchTool = new DynamicStructuredTool({
      name: 'web_search',
      description: 'Search the web for current information, news, facts, or any topic. Use this when you need up-to-date information or when the user asks about current events, recent news, or topics you don\'t have information about.',
      schema: z.object({
        query: z.string().describe('The search query to look up on the web'),
      }),
      func: async ({ query }) => {
        return await this.performWebSearch(query);
      },
    });
  }

  /**
   * Perform web search using DuckDuckGo HTML search
   */
  async performWebSearch(query) {
    try {
      console.log(`[WebSearch] Searching for: ${query}`);
      
      // Use DuckDuckGo HTML search (no API key required)
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);
      const results = [];

      // Parse DuckDuckGo results
      $('.result').each((i, element) => {
        if (i >= 5) return false; // Limit to top 5 results
        
        const title = $(element).find('.result__title').text().trim();
        const snippet = $(element).find('.result__snippet').text().trim();
        const url = $(element).find('.result__url').attr('href');
        
        if (title && snippet) {
          results.push({
            title,
            snippet,
            url: url || 'N/A'
          });
        }
      });

      if (results.length === 0) {
        return 'No results found for this query.';
      }

      // Format results for the AI
      let formattedResults = `Web Search Results for "${query}":\n\n`;
      results.forEach((result, index) => {
        formattedResults += `${index + 1}. ${result.title}\n`;
        formattedResults += `   ${result.snippet}\n`;
        formattedResults += `   URL: ${result.url}\n\n`;
      });

      console.log(`[WebSearch] Found ${results.length} results`);
      return formattedResults;
    } catch (error) {
      console.error('[WebSearch] Error:', error.message);
      return `Error performing web search: ${error.message}`;
    }
  }

  /**
   * Create an agent that can use web search
   */
  async createAgent() {
    const tools = [this.searchTool];

    const prompt = ChatPromptTemplate.fromMessages([
      ['system', `You are a helpful AI assistant with access to web search. 
When users ask about current events, recent information, or topics you're not sure about, use the web_search tool to find accurate information.
After getting search results, synthesize the information and provide a clear, concise answer with sources.
Always cite your sources when using web search results.`],
      ['placeholder', '{chat_history}'],
      ['human', '{input}'],
      ['placeholder', '{agent_scratchpad}'],
    ]);

    const agent = await createOpenAIToolsAgent({
      llm: this.model,
      tools,
      prompt,
    });

    return new AgentExecutor({
      agent,
      tools,
      verbose: true,
      maxIterations: 3,
    });
  }

  /**
   * Process a query with web search capability
   */
  async processQuery(userMessage, conversationHistory = []) {
    try {
      const agentExecutor = await this.createAgent();
      
      // Format conversation history for the agent
      const chatHistory = conversationHistory.map(msg => {
        return msg.role === 'user' 
          ? `Human: ${msg.content}`
          : `Assistant: ${msg.content}`;
      }).join('\n');

      const result = await agentExecutor.invoke({
        input: userMessage,
        chat_history: chatHistory,
      });

      return {
        success: true,
        response: result.output,
        usedWebSearch: result.intermediateSteps && result.intermediateSteps.length > 0,
      };
    } catch (error) {
      console.error('[WebSearch] Agent error:', error);
      return {
        success: false,
        error: error.message,
        response: 'I apologize, but I encountered an error while processing your request.',
      };
    }
  }

  /**
   * Process a query with streaming support
   */
  async processQueryStream(userMessage, conversationHistory = [], onToken) {
    try {
      const agentExecutor = await this.createAgent();
      
      // Format conversation history
      const chatHistory = conversationHistory.map(msg => {
        return msg.role === 'user' 
          ? `Human: ${msg.content}`
          : `Assistant: ${msg.content}`;
      }).join('\n');

      const stream = await agentExecutor.stream({
        input: userMessage,
        chat_history: chatHistory,
      });

      let fullResponse = '';
      let usedWebSearch = false;

      for await (const chunk of stream) {
        if (chunk.intermediateSteps) {
          usedWebSearch = true;
        }
        
        if (chunk.output) {
          // Stream the final output
          for (const char of chunk.output) {
            fullResponse += char;
            if (onToken) {
              onToken(char);
            }
          }
        }
      }

      return {
        success: true,
        response: fullResponse,
        usedWebSearch,
      };
    } catch (error) {
      console.error('[WebSearch] Streaming error:', error);
      return {
        success: false,
        error: error.message,
        response: 'I apologize, but I encountered an error while processing your request.',
      };
    }
  }
}

module.exports = WebSearchService;
