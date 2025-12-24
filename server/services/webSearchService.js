const { AzureChatOpenAI } = require('@langchain/openai');
const { HumanMessage, SystemMessage, AIMessage } = require('@langchain/core/messages');
const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Web Search Tool using DuckDuckGo (no API key needed)
 * Searches the web and returns relevant results
 */
class WebSearchService {
  constructor(azureConfig) {
    // Validate configuration
    if (!azureConfig.apiKey || !azureConfig.endpoint || !azureConfig.deploymentName) {
      throw new Error('Missing Azure OpenAI configuration: apiKey, endpoint, and deploymentName are required');
    }
    
    // Extract the instance name from the endpoint URL
    // Endpoint format: https://{instance}.openai.azure.com
    const endpoint = azureConfig.endpoint;
    let instanceName = '';
    
    try {
      const url = new URL(endpoint);
      instanceName = url.hostname.split('.')[0]; // Extract {instance} from {instance}.openai.azure.com
    } catch (error) {
      console.error('[WebSearchService] Invalid endpoint URL:', endpoint);
      throw new Error('Invalid Azure OpenAI endpoint URL');
    }
    
    console.log('[WebSearchService] Initializing with:', {
      endpoint: azureConfig.endpoint,
      deploymentName: azureConfig.deploymentName,
      apiVersion: azureConfig.apiVersion,
    });
    
    this.model = new AzureChatOpenAI({
      azureOpenAIApiKey: azureConfig.apiKey,
      azureOpenAIApiVersion: azureConfig.apiVersion,
      azureOpenAIApiInstanceName: instanceName,
      azureOpenAIApiDeploymentName: azureConfig.deploymentName,
      temperature: 0.7,
      streaming: true,
    });
  }

  /**
   * Scrape actual content from a web page
   */
  async scrapeWebPage(url, maxLength = 3000) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 8000,
        maxRedirects: 3,
      });

      const $ = cheerio.load(response.data);
      
      // Remove script, style, nav, footer, and other non-content elements
      $('script, style, nav, footer, header, iframe, noscript').remove();
      
      // Try to find main content areas
      let content = '';
      const contentSelectors = [
        'article',
        'main',
        '[role="main"]',
        '.content',
        '.article-content',
        '.post-content',
        '#content',
        '.entry-content'
      ];
      
      for (const selector of contentSelectors) {
        const element = $(selector).first();
        if (element.length) {
          content = element.text();
          break;
        }
      }
      
      // Fallback to body if no content area found
      if (!content) {
        content = $('body').text();
      }
      
      // Clean up whitespace
      content = content
        .replace(/\s+/g, ' ')
        .replace(/\n+/g, '\n')
        .trim();
      
      return content.substring(0, maxLength);
    } catch (error) {
      console.log(`[Scraper] Failed to scrape ${url}: ${error.message}`);
      return null;
    }
  }

  /**
   * Perform real web search using Bing Search API
   */
  async performWebSearch(query) {
    try {
      console.log(`[Web Search] Searching for: ${query}`);
      
      const bingApiKey = process.env.BING_SEARCH_API_KEY;
      
      if (!bingApiKey) {
        console.warn('[Web Search] Bing API key not found, falling back to DuckDuckGo');
        return await this.performDuckDuckGoSearch(query);
      }

      // Bing Web Search API v7
      const searchUrl = 'https://api.bing.microsoft.com/v7.0/search';
      
      const response = await axios.get(searchUrl, {
        headers: {
          'Ocp-Apim-Subscription-Key': bingApiKey
        },
        params: {
          q: query,
          count: 5,
          responseFilter: 'Webpages',
          textFormat: 'HTML',
          safeSearch: 'Moderate'
        },
        timeout: 15000,
      });

      const webPages = response.data.webPages?.value || [];

      if (webPages.length === 0) {
        return 'No web search results found for this query. Please try rephrasing your question.';
      }

      console.log(`[Web Search] Found ${webPages.length} results, scraping content...`);

      // Format results with rich content
      let combinedContent = `🌐 WEB SEARCH RESULTS\n${'='.repeat(60)}\n\n`;
      combinedContent += `Search Query: "${query}"\n`;
      combinedContent += `Found ${webPages.length} relevant web pages\n\n`;
      
      // Scrape content from top results in parallel
      const scrapePromises = webPages.slice(0, 3).map(async (page, i) => {
        const scrapedContent = await this.scrapeWebPage(page.url);
        return { page, scrapedContent, index: i };
      });
      
      const scrapedResults = await Promise.all(scrapePromises);
      
      for (const { page, scrapedContent, index } of scrapedResults) {
        const i = index;
        
        combinedContent += `\n${'─'.repeat(60)}\n`;
        combinedContent += `🔍 RESULT ${i + 1}: ${page.name}\n`;
        combinedContent += `${'─'.repeat(60)}\n\n`;
        
        // Add scraped content if available, otherwise use snippet
        if (scrapedContent) {
          combinedContent += `${scrapedContent}\n\n`;
        } else if (page.snippet) {
          combinedContent += `${page.snippet}\n\n`;
        }
        
        // Add date if available
        if (page.dateLastCrawled) {
          const date = new Date(page.dateLastCrawled);
          combinedContent += `📅 Last Updated: ${date.toLocaleDateString()}\n`;
        }
        
        combinedContent += `🔗 Source: ${page.url}\n`;
      }
      
      // Add remaining results without full content
      for (let i = 3; i < webPages.length; i++) {
        const page = webPages[i];
        combinedContent += `\n${'─'.repeat(60)}\n`;
        combinedContent += `🔍 RESULT ${i + 1}: ${page.name}\n`;
        combinedContent += `${'─'.repeat(60)}\n\n`;
        combinedContent += `${page.snippet}\n\n`;
        combinedContent += `🔗 Source: ${page.url}\n`;
      }

      combinedContent += `\n${'='.repeat(60)}\n`;
      combinedContent += `💡 Use the information above to provide a comprehensive, accurate, and up-to-date answer.\n`;

      console.log(`[Web Search] Compiled content: ${combinedContent.length} characters from ${webPages.length} results`);
      return combinedContent;
    } catch (error) {
      console.error('[Web Search] Error:', error.message);
      
      // Fallback to DuckDuckGo if Bing fails
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.warn('[Web Search] Bing API authentication failed, falling back to DuckDuckGo');
        return await this.performDuckDuckGoSearch(query);
      }
      
      if (error.code === 'ECONNABORTED') {
        return 'Web search timed out. Please try again.';
      }
      return `Unable to perform web search at this time. Error: ${error.message}`;
    }
  }

  /**
   * Fallback: DuckDuckGo HTML search with content scraping
   */
  async performDuckDuckGoSearch(query) {
    try {
      console.log(`[DuckDuckGo] Searching for: ${query}`);
      
      // Use DuckDuckGo HTML search
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);
      const results = [];

      // Parse DuckDuckGo HTML results
      $('.result').each((i, element) => {
        if (i >= 5) return false;
        
        const title = $(element).find('.result__title').text().trim();
        const snippet = $(element).find('.result__snippet').text().trim();
        const url = $(element).find('.result__url').attr('href');
        
        if (title && url) {
          // Extract actual URL from DuckDuckGo redirect
          let actualUrl = url;
          try {
            if (url.includes('uddg=')) {
              const urlParams = new URLSearchParams(url.split('?')[1]);
              actualUrl = decodeURIComponent(urlParams.get('uddg') || url);
            }
          } catch (e) {
            actualUrl = url;
          }
          
          results.push({ title, snippet, url: actualUrl });
        }
      });

      if (results.length === 0) {
        return 'No search results found. I will answer based on my training data.';
      }

      console.log(`[DuckDuckGo] Found ${results.length} results, scraping content...`);

      let combinedContent = `🔍 WEB SEARCH RESULTS\n${'='.repeat(60)}\n\n`;
      combinedContent += `Search Query: "${query}"\n`;
      combinedContent += `Found ${results.length} relevant web pages\n\n`;

      // Scrape content from top 3 results
      const scrapePromises = results.slice(0, 3).map(async (result, i) => {
        const scrapedContent = await this.scrapeWebPage(result.url);
        return { result, scrapedContent, index: i };
      });
      
      const scrapedResults = await Promise.all(scrapePromises);
      
      for (const { result, scrapedContent, index } of scrapedResults) {
        combinedContent += `\n${'─'.repeat(60)}\n`;
        combinedContent += `📄 RESULT ${index + 1}: ${result.title}\n`;
        combinedContent += `${'─'.repeat(60)}\n\n`;
        
        if (scrapedContent) {
          combinedContent += `${scrapedContent}\n\n`;
        } else if (result.snippet) {
          combinedContent += `${result.snippet}\n\n`;
        }
        
        combinedContent += `🔗 Source: ${result.url}\n`;
      }
      
      // Add remaining results with snippets only
      for (let i = 3; i < results.length; i++) {
        const result = results[i];
        combinedContent += `\n${'─'.repeat(60)}\n`;
        combinedContent += `📄 RESULT ${i + 1}: ${result.title}\n`;
        combinedContent += `${'─'.repeat(60)}\n\n`;
        combinedContent += `${result.snippet}\n\n`;
        combinedContent += `🔗 Source: ${result.url}\n`;
      }

      combinedContent += `\n${'='.repeat(60)}\n`;

      console.log(`[DuckDuckGo] Search complete with ${results.length} results`);
      return combinedContent;
    } catch (error) {
      console.error('[DuckDuckGo] Error:', error.message);
      return 'Unable to fetch search results. I will answer based on my training data.';
    }
  }

  /**
   * Determine if web search is needed for the query
   */
  async shouldUseWebSearch(userMessage) {
    // Keywords that suggest current information is needed
    const currentInfoKeywords = [
      'latest', 'recent', 'current', 'today', 'now', 'news',
      'weather', 'price', 'stock', 'update', 'happening'
    ];
    
    const lowerMessage = userMessage.toLowerCase();
    return currentInfoKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Process a query with web search capability
   */
  async processQuery(userMessage, conversationHistory = [], forceSearch = true) {
    try {
      console.log('[WebSearchService] Process query. Force search:', forceSearch);
      // Always search when web search is explicitly enabled
      const needsSearch = forceSearch;
      let searchResults = '';
      
      if (needsSearch) {
        searchResults = await this.performWebSearch(userMessage);
        console.log('[WebSearchService] Web search results obtained:', searchResults.length, 'chars');
      }

      // Build conversation messages
      const messages = [
        new SystemMessage(
          `You are a helpful AI assistant${needsSearch ? ' with access to current web search results' : ''}. ` +
          'Provide clear, accurate, and helpful responses. ' +
          (needsSearch ? 'When using web search results, cite your sources by mentioning the information came from web search.' : '')
        ),
      ];

      // Add conversation history
      conversationHistory.forEach(msg => {
        if (msg.role === 'user') {
          messages.push(new HumanMessage(msg.content));
        } else if (msg.role === 'assistant') {
          messages.push(new AIMessage(msg.content));
        }
      });

      // Add current query with search results if available
      if (searchResults) {
        messages.push(new HumanMessage(
          `Question: ${userMessage}\n\n${searchResults}\n\nBased on the web search results provided above, please give me a comprehensive and well-organized answer to my question. Structure your response with clear paragraphs and include relevant details from the sources.`
        ));
      } else {
        messages.push(new HumanMessage(userMessage));
      }

      const response = await this.model.invoke(messages);

      return {
        success: true,
        response: response.content,
        usedWebSearch: needsSearch && searchResults.length > 0,
      };
    } catch (error) {
      console.error('[WebSearch] Error:', error);
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
      // Send initial searching status
      if (onToken) {
        onToken('🔍 Searching the web...\n\n');
      }
      
      // ALWAYS search since this endpoint is only called when web search button is enabled
      const needsSearch = true;
      let searchResults = '';
      
      searchResults = await this.performWebSearch(userMessage);
      console.log('[WebSearchService] Web search completed. Results length:', searchResults.length);
      
      // Send status update that search is complete
      if (onToken) {
        onToken('✓ Search complete. Analyzing results...\n\n');
      }

      // Build conversation messages
      const messages = [
        new SystemMessage(
          `You are a knowledgeable AI assistant with access to real-time web search results. ` +
          'Your responses should be:\n' +
          '1. Accurate and based on the current web search results provided\n' +
          '2. Well-structured with clear sections or bullet points when appropriate\n' +
          '3. Comprehensive yet concise\n' +
          '4. Include relevant facts, dates, and context from the search results\n' +
          '5. Cite sources by mentioning website names or organizations when presenting information\n' +
          '6. Provide up-to-date information based on the search results\n\n' +
          'Format your response in a user-friendly way with proper paragraphs and organization.'
        ),
      ];

      // Add conversation history
      conversationHistory.forEach(msg => {
        if (msg.role === 'user') {
          messages.push(new HumanMessage(msg.content));
        } else if (msg.role === 'assistant') {
          messages.push(new AIMessage(msg.content));
        }
      });

      // Add current query with search results if available
      if (searchResults) {
        messages.push(new HumanMessage(
          `Question: ${userMessage}\n\n${searchResults}\n\nBased on the web search results provided above, please give me a comprehensive and well-organized answer to my question. Structure your response with clear paragraphs and include relevant details from the sources.`
        ));
      } else {
        messages.push(new HumanMessage(userMessage));
      }

      const stream = await this.model.stream(messages);

      console.log('[WebSearchService] Stream created, processing chunks...');
      let fullResponse = '';
      for await (const chunk of stream) {
        const content = chunk.content;
        if (content) {
          fullResponse += content;
          if (onToken) {
            onToken(content);
          }
        }
      }

      console.log('[WebSearchService] Stream complete. Response length:', fullResponse.length);
      return {
        success: true,
        response: fullResponse,
        usedWebSearch: needsSearch && searchResults.length > 0,
      };
    } catch (error) {
      console.error('[WebSearchService] Streaming error:', error);
      console.error('[WebSearchService] Error details:', error.message);
      return {
        success: false,
        error: error.message,
        response: 'I apologize, but I encountered an error while processing your request.',
      };
    }
  }
}

module.exports = WebSearchService;
