/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CountTokensResponse,
  GenerateContentResponse,
  GenerateContentParameters,
  CountTokensParameters,
  EmbedContentResponse,
  EmbedContentParameters,
  GoogleGenAI,
} from '@google/genai';
import { createCodeAssistContentGenerator } from '../code_assist/codeAssist.js';
import { DEFAULT_GEMINI_MODEL } from '../config/models.js';
import { getEffectiveModel } from './modelCheck.js';

/**
 * Interface abstracting the core functionalities for generating content and counting tokens.
 */
export interface ContentGenerator {
  generateContent(
    request: GenerateContentParameters,
  ): Promise<GenerateContentResponse>;

  generateContentStream(
    request: GenerateContentParameters,
  ): Promise<AsyncGenerator<GenerateContentResponse>>;

  countTokens(request: CountTokensParameters): Promise<CountTokensResponse>;

  embedContent(request: EmbedContentParameters): Promise<EmbedContentResponse>;
}

export enum AuthType {
  LOGIN_WITH_GOOGLE = 'oauth-personal',
  USE_GEMINI = 'gemini-api-key',
  USE_VERTEX_AI = 'vertex-ai',
}

export type ContentGeneratorConfig = {
  model: string;
  apiKey?: string;
  vertexai?: boolean;
  authType?: AuthType | undefined;
  customAPI?: {
    endpoint: string;
    apiKey?: string;
    model?: string;
  };
};

export async function createContentGeneratorConfig(
  model: string | undefined,
  authType: AuthType | undefined,
  config?: { getModel?: () => string; getCustomAPI?: () => any },
): Promise<ContentGeneratorConfig> {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const googleApiKey = process.env.GOOGLE_API_KEY;
  const googleCloudProject = process.env.GOOGLE_CLOUD_PROJECT;
  const googleCloudLocation = process.env.GOOGLE_CLOUD_LOCATION;

  // Use runtime model from config if available, otherwise fallback to parameter or default
  const effectiveModel = config?.getModel?.() || model || DEFAULT_GEMINI_MODEL;

  const contentGeneratorConfig: ContentGeneratorConfig = {
    model: effectiveModel,
    authType,
  };
  
  // Check for custom API configuration - if present, return immediately
  const customAPI = config?.getCustomAPI?.();
  if (customAPI?.endpoint) {
    contentGeneratorConfig.customAPI = customAPI;
    // When using custom API, return early without other auth validation
    return contentGeneratorConfig;
  }

  // 如果没有自定义API，确保使用默认的Google端点和模型
  contentGeneratorConfig.model = model || DEFAULT_GEMINI_MODEL;
  
  // if we are using google auth nothing else to validate for now
  if (authType === AuthType.LOGIN_WITH_GOOGLE) {
    return contentGeneratorConfig;
  }

  if (authType === AuthType.USE_GEMINI && geminiApiKey) {
    contentGeneratorConfig.apiKey = geminiApiKey;
    contentGeneratorConfig.model = await getEffectiveModel(
      contentGeneratorConfig.apiKey,
      contentGeneratorConfig.model,
    );

    return contentGeneratorConfig;
  }

  if (
    authType === AuthType.USE_VERTEX_AI &&
    !!googleApiKey &&
    googleCloudProject &&
    googleCloudLocation
  ) {
    contentGeneratorConfig.apiKey = googleApiKey;
    contentGeneratorConfig.vertexai = true;
    contentGeneratorConfig.model = await getEffectiveModel(
      contentGeneratorConfig.apiKey,
      contentGeneratorConfig.model,
    );

    return contentGeneratorConfig;
  }

  return contentGeneratorConfig;
}

export async function createContentGenerator(
  config: ContentGeneratorConfig,
  sessionId?: string,
): Promise<ContentGenerator> {
  const version = process.env.CLI_VERSION || process.version;
  const httpOptions = {
    headers: {
      'User-Agent': `GeminiCLI/${version} (${process.platform}; ${process.arch})`,
    },
  };
  
  // Handle custom API configuration
  if (config.customAPI?.endpoint) {
    return createCustomAPIContentGenerator(config.customAPI, httpOptions);
  }
  
  if (config.authType === AuthType.LOGIN_WITH_GOOGLE_PERSONAL) {
    return createCodeAssistContentGenerator(httpOptions, config.authType);
  }

  if (
    config.authType === AuthType.USE_GEMINI ||
    config.authType === AuthType.USE_VERTEX_AI
  ) {
    const googleGenAI = new GoogleGenAI({
      apiKey: config.apiKey === '' ? undefined : config.apiKey,
      vertexai: config.vertexai,
      httpOptions,
    });

    return googleGenAI.models;
  }

  throw new Error(
    `Error creating contentGenerator: Unsupported authType: ${config.authType}`,
  );
}

// Helper function to convert Gemini format to OpenAI format
function convertGeminiToOpenAI(request: GenerateContentParameters, customModel?: string): any {
  const openAIRequest: any = {
    model: customModel || 'gpt-3.5-turbo', // Default model if not specified
    messages: [],
    stream: false,
  };

  // Convert contents to messages
  if (request.contents) {
    // Handle array or single content
    const contentsArray = Array.isArray(request.contents) ? request.contents : [request.contents];
    
    for (const content of contentsArray) {
      // Use any type to handle the complex union type
      const contentAny = content as any;
      
      const message: any = {
        role: contentAny.role === 'user' ? 'user' : contentAny.role === 'model' ? 'assistant' : 'system',
        content: '',
      };

      if (contentAny.parts) {
        // Combine all text parts
        const textParts = contentAny.parts
          .filter((part: any) => part.text)
          .map((part: any) => part.text)
          .join('');
        message.content = textParts;
      } else if (typeof contentAny === 'string') {
        // Handle string content directly
        message.content = contentAny;
      }

      if (message.content) {
        openAIRequest.messages.push(message);
      }
    }
  }

  // Handle generation config (accessing through any type to avoid strict typing issues)
  const requestAny = request as any;
  if (requestAny.generationConfig) {
    if (requestAny.generationConfig.temperature !== undefined) {
      openAIRequest.temperature = requestAny.generationConfig.temperature;
    }
    if (requestAny.generationConfig.maxOutputTokens !== undefined) {
      openAIRequest.max_tokens = requestAny.generationConfig.maxOutputTokens;
    }
    if (requestAny.generationConfig.topP !== undefined) {
      openAIRequest.top_p = requestAny.generationConfig.topP;
    }
  }

  return openAIRequest;
}

// Helper function to convert OpenAI response to Gemini format
function convertOpenAIToGemini(openAIResponse: any): GenerateContentResponse {
  // Create response with proper typing using unknown cast first
  const geminiResponse = {
    candidates: [] as any[],
    text: '',
    data: undefined,
    functionCalls: [],
    executableCode: null,
    codeExecutionResult: null,
  } as unknown as GenerateContentResponse;

  if (openAIResponse.choices && openAIResponse.choices.length > 0) {
    const choice = openAIResponse.choices[0];
    const textContent = choice.message?.content || choice.delta?.content || '';
    
    const candidate: any = {
      content: {
        parts: [
          {
            text: textContent,
          },
        ],
        role: 'model',
      },
      finishReason: choice.finish_reason === 'stop' ? 'STOP' : 'OTHER',
      index: choice.index || 0,
    };

    if (!geminiResponse.candidates) {
      (geminiResponse as any).candidates = [];
    }
    (geminiResponse as any).candidates.push(candidate);
    
    // Set the text property for compatibility (use any cast to bypass readonly)
    (geminiResponse as any).text = textContent;
  }

  // Add usage information if available
  const responseAny = geminiResponse as any;
  if (openAIResponse.usage) {
    responseAny.usageMetadata = {
      promptTokenCount: openAIResponse.usage.prompt_tokens || 0,
      candidatesTokenCount: openAIResponse.usage.completion_tokens || 0,
      totalTokenCount: openAIResponse.usage.total_tokens || 0,
    };
  }

  return geminiResponse;
}

// Custom API ContentGenerator implementation
function createCustomAPIContentGenerator(
  customAPI: { endpoint: string; apiKey?: string; model?: string },
  httpOptions: any,
): ContentGenerator {
  return {
    async generateContent(request: GenerateContentParameters): Promise<GenerateContentResponse> {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...httpOptions.headers,
      };
      
      if (customAPI.apiKey) {
        headers['Authorization'] = `Bearer ${customAPI.apiKey}`;
      }
      
      // Convert Gemini request to OpenAI format
      const openAIRequest = convertGeminiToOpenAI(request, customAPI.model);
      
      const response = await fetch(customAPI.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(openAIRequest),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Custom API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const openAIResponse = await response.json();
      return convertOpenAIToGemini(openAIResponse);
    },
    
    async generateContentStream(request: GenerateContentParameters): Promise<AsyncGenerator<GenerateContentResponse>> {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        ...httpOptions.headers,
      };
      
      if (customAPI.apiKey) {
        headers['Authorization'] = `Bearer ${customAPI.apiKey}`;
      }
      
      // Convert Gemini request to OpenAI format and enable streaming
      const openAIRequest = convertGeminiToOpenAI(request, customAPI.model);
      openAIRequest.stream = true;
      
      const response = await fetch(customAPI.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(openAIRequest),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Custom API stream request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response reader');
      }
      
      async function* generator(): AsyncGenerator<GenerateContentResponse> {
        const decoder = new TextDecoder();
        let buffer = '';
        
        try {
          while (true) {
            const { done, value } = await reader!.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  return;
                }
                try {
                  const openAIChunk = JSON.parse(data);
                  // Convert OpenAI streaming chunk to Gemini format
                  const geminiChunk = convertOpenAIToGemini(openAIChunk);
                  yield geminiChunk;
                } catch (e) {
                  // Ignore invalid JSON
                }
              }
            }
          }
        } finally {
          reader!.releaseLock();
        }
      }
      
      return generator();
    },
    
    async countTokens(request: CountTokensParameters): Promise<CountTokensResponse> {
      // For custom APIs, we'll return a simple count based on text length
      // This is a fallback implementation
      const textContent = JSON.stringify(request);
      const estimatedTokens = Math.ceil(textContent.length / 4); // Rough estimation
      
      return {
        totalTokens: estimatedTokens,
      };
    },
    
    async embedContent(request: EmbedContentParameters): Promise<EmbedContentResponse> {
      // Custom API embedding not implemented
      throw new Error('Embedding not supported for custom APIs');
    },
  };
}

