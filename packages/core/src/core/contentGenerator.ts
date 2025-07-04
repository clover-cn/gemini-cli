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

// Helper function to generate a summary response when tool responses are present
function generateToolResponseSummary(request: GenerateContentParameters): GenerateContentResponse {
  const contentsArray = Array.isArray(request.contents) ? request.contents : [request.contents];

  // Extract tool responses and create a summary
  const toolResponses: string[] = [];
  for (const content of contentsArray) {
    const contentAny = content as any;
    if (contentAny?.parts) {
      for (const part of contentAny.parts) {
        if (part.functionResponse) {
          const funcResp = part.functionResponse;
          const responseContent = funcResp.response?.output ||
                                funcResp.response?.content ||
                                JSON.stringify(funcResp.response || {});
          toolResponses.push(`Tool ${funcResp.name} executed successfully. Result: ${responseContent}`);
        }
      }
    }
  }

  const summaryText = toolResponses.length > 0
    ? toolResponses.join('\n\n')
    : 'Tool execution completed successfully.';

  return {
    text: summaryText,
    data: undefined,
    functionCalls: undefined,
    executableCode: undefined,
    codeExecutionResult: undefined,
    candidates: [{
      content: {
        parts: [{ text: summaryText }],
        role: 'model'
      },
      finishReason: 'STOP' as any,
      index: 0
    }]
  };
}

// Helper function to parse text-based tool calls
function parseTextBasedToolCall(text: string): { tool_name: string; parameters: any } | null {
  try {
    // Try to parse the entire text as JSON first
    const parsed = JSON.parse(text.trim());
    if (parsed.tool_name && typeof parsed.tool_name === 'string') {
      return {
        tool_name: parsed.tool_name,
        parameters: parsed.parameters || {}
      };
    }
  } catch (e) {
    // If not valid JSON, try to extract JSON from text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.tool_name && typeof parsed.tool_name === 'string') {
          return {
            tool_name: parsed.tool_name,
            parameters: parsed.parameters || {}
          };
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }
  }
  return null;
}

// Helper function to create stream generator from reader
async function* createStreamGenerator(reader: ReadableStreamDefaultReader<Uint8Array>): AsyncGenerator<GenerateContentResponse> {
  const decoder = new TextDecoder();
  let buffer = '';
  let accumulatedContent = '';
  let lastResponse: GenerateContentResponse | null = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            // Stream is done, check for text-based tool calls in accumulated content
            if (accumulatedContent && lastResponse) {
              const textBasedToolCall = parseTextBasedToolCall(accumulatedContent);
              if (textBasedToolCall) {
                // Generate a unique tool call ID
                const toolCallId = `${textBasedToolCall.tool_name}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

                // Create a final response with the tool call
                const functionCall = {
                  name: textBasedToolCall.tool_name,
                  args: textBasedToolCall.parameters || {},
                  id: toolCallId
                };

                const finalResponse: GenerateContentResponse = {
                  text: lastResponse.text || '',
                  data: lastResponse.data,
                  executableCode: lastResponse.executableCode,
                  codeExecutionResult: lastResponse.codeExecutionResult,
                  functionCalls: [functionCall],
                  candidates: (lastResponse.candidates || []).map(candidate => ({
                    ...candidate,
                    content: {
                      ...candidate.content,
                      parts: [
                        ...(candidate.content?.parts || []),
                        { functionCall }
                      ]
                    }
                  }))
                };

                yield finalResponse;
              }
            }
            return;
          }
          try {
            const openAIChunk = JSON.parse(data);
            // Convert OpenAI streaming chunk to Gemini format
            const geminiChunk = convertOpenAIToGemini(openAIChunk);

            // Accumulate content for final tool call parsing
            const chunkContent = openAIChunk.choices?.[0]?.delta?.content || '';
            if (chunkContent) {
              accumulatedContent += chunkContent;
            }

            lastResponse = geminiChunk;
            yield geminiChunk;
          } catch (e) {
            // Ignore invalid JSON
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

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
    supportsTools?: boolean;
    fallbackMode?: 'text' | 'disabled';
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
  
  if (config.authType === AuthType.LOGIN_WITH_GOOGLE) {
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
function convertGeminiToOpenAI(request: GenerateContentParameters, customModel?: string, supportsTools?: boolean, fallbackMode?: 'text' | 'disabled'): any {
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
        // Handle different types of parts
        const textParts: string[] = [];
        const toolCalls: any[] = [];
        const toolResponses: any[] = [];

        for (const part of contentAny.parts) {
          if (part.text) {
            textParts.push(part.text);
          } else if (part.functionCall) {
            // Convert Gemini function call to OpenAI tool call format
            toolCalls.push({
              id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
              type: 'function',
              function: {
                name: part.functionCall.name,
                arguments: JSON.stringify(part.functionCall.args || {})
              }
            });
          } else if (part.functionResponse) {
            // Convert Gemini function response to OpenAI tool response format
            const responseContent = part.functionResponse.response?.output ||
                                  part.functionResponse.response?.content ||
                                  JSON.stringify(part.functionResponse.response || {});
            toolResponses.push({
              tool_call_id: part.functionResponse.id || `call_${Date.now()}`,
              role: 'tool',
              name: part.functionResponse.name,
              content: typeof responseContent === 'string' ? responseContent : JSON.stringify(responseContent)
            });
          }
        }

        // Set message content and tool calls
        message.content = textParts.join('');
        if (toolCalls.length > 0) {
          message.tool_calls = toolCalls;
        }

        // Handle tool responses based on whether tools are supported
        if (toolResponses.length > 0) {
          if (supportsTools !== false) {
            // Standard tool response handling for APIs that support tools
            // First add the current message if it has content or tool calls
            if (message.content || message.tool_calls) {
              openAIRequest.messages.push(message);
            }
            // Then add tool response messages
            for (const toolResponse of toolResponses) {
              openAIRequest.messages.push(toolResponse);
            }
            // Skip adding the message again below
            continue;
          } else {
            // For APIs that don't support tools, embed tool results in the conversation
            // Convert tool responses to text and add to the next user message or create a new one
            const toolResultTexts = toolResponses.map(tr =>
              `Tool ${tr.name} result: ${tr.content}`
            ).join('\n\n');

            // Add the current message if it has content or tool calls
            if (message.content || message.tool_calls) {
              openAIRequest.messages.push(message);
            }

            // Add tool results as a user message
            openAIRequest.messages.push({
              role: 'user',
              content: `Previous tool execution results:\n\n${toolResultTexts}\n\nPlease provide a response based on these results.`
            });

            // Skip adding the message again below
            continue;
          }
        }
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

  // Handle tools conversion from Gemini format to OpenAI format
  if (request.config?.tools && Array.isArray(request.config.tools)) {
    const openAITools: any[] = [];
    let toolDescriptions: string[] = [];

    for (const toolGroup of request.config.tools) {
      if (toolGroup && typeof toolGroup === 'object' && 'functionDeclarations' in toolGroup) {
        const functionDeclarations = (toolGroup as any).functionDeclarations;

        if (Array.isArray(functionDeclarations)) {
          for (const funcDecl of functionDeclarations) {
            if (funcDecl && funcDecl.name) {
              // If model supports tools, add to tools array
              if (supportsTools !== false) {
                const openAITool = {
                  type: 'function',
                  function: {
                    name: funcDecl.name,
                    description: funcDecl.description || '',
                    parameters: funcDecl.parameters || { type: 'object', properties: {} }
                  }
                };
                openAITools.push(openAITool);
              } else if (fallbackMode === 'text') {
                // If model doesn't support tools, collect tool descriptions for text fallback
                const paramStr = funcDecl.parameters ?
                  JSON.stringify(funcDecl.parameters, null, 2) :
                  'No parameters';
                toolDescriptions.push(
                  `Tool: ${funcDecl.name}\nDescription: ${funcDecl.description || 'No description'}\nParameters: ${paramStr}`
                );
              }
            }
          }
        }
      }
    }

    // Add tools to request if model supports them
    if (supportsTools !== false && openAITools.length > 0) {
      openAIRequest.tools = openAITools;
    } else if (fallbackMode === 'text' && toolDescriptions.length > 0) {
      // Add tool descriptions to system message for text fallback
      const toolsPrompt = `\n\nAvailable tools - When you need to use a tool, respond with a JSON object in this exact format:
{
  "tool_name": "function_name",
  "parameters": { /* parameters object */ }
}

Available tools:
${toolDescriptions.join('\n\n')}

IMPORTANT: Always include the "tool_name" field with the exact function name when making tool calls.`;



      // Find system message or add to first user message
      if (openAIRequest.messages.length > 0) {
        const systemMsg = openAIRequest.messages.find((msg: any) => msg.role === 'system');
        if (systemMsg) {
          systemMsg.content += toolsPrompt;
        } else {
          // Add as system message at the beginning
          openAIRequest.messages.unshift({
            role: 'system',
            content: `You are a helpful assistant.${toolsPrompt}`
          });
        }
      }
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

    const parts: any[] = [];
    const functionCalls: any[] = [];

    // Add text content if present and check for text-based tool calls
    if (textContent) {
      // Try to parse text-based tool calls (for models that don't support native tool calling)
      const textBasedToolCall = parseTextBasedToolCall(textContent);
      if (textBasedToolCall) {
        // Add the tool call as a function call part
        const functionCall = {
          name: textBasedToolCall.tool_name,
          args: textBasedToolCall.parameters || {}
        };
        functionCalls.push(functionCall);
        parts.push({ functionCall });

        // Also add the original text for context
        parts.push({ text: textContent });
      } else {
        parts.push({ text: textContent });
      }
    }

    // Handle function calls from OpenAI format
    if (choice.message?.tool_calls && Array.isArray(choice.message.tool_calls)) {
      for (const toolCall of choice.message.tool_calls) {
        if (toolCall.type === 'function' && toolCall.function) {
          const functionCall = {
            name: toolCall.function.name,
            args: {}
          };

          // Parse arguments if they exist
          if (toolCall.function.arguments) {
            try {
              functionCall.args = JSON.parse(toolCall.function.arguments);
            } catch (error) {
              console.warn('Failed to parse function arguments:', toolCall.function.arguments);
              functionCall.args = {};
            }
          }

          functionCalls.push(functionCall);
          parts.push({ functionCall });
        }
      }
    }

    const candidate: any = {
      content: {
        parts,
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

    // Set function calls at the top level for compatibility
    if (functionCalls.length > 0) {
      (geminiResponse as any).functionCalls = functionCalls;
    }
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
  customAPI: { endpoint: string; apiKey?: string; model?: string; supportsTools?: boolean; fallbackMode?: 'text' | 'disabled' },
  httpOptions: any,
): ContentGenerator {
  return {
    async generateContent(request: GenerateContentParameters): Promise<GenerateContentResponse> {
      // Check if this request contains tool responses (function responses)
      const contentsArray = Array.isArray(request.contents) ? request.contents : [request.contents];
      const hasToolResponses = contentsArray.some((content: any) =>
        content?.parts?.some((part: any) => part.functionResponse)
      );

      // If request contains tool responses, generate a summary response instead of calling API
      if (hasToolResponses) {
        return generateToolResponseSummary(request);
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...httpOptions.headers,
      };

      if (customAPI.apiKey) {
        headers['Authorization'] = `Bearer ${customAPI.apiKey}`;
      }

      // Convert Gemini request to OpenAI format
      const openAIRequest = convertGeminiToOpenAI(request, customAPI.model, customAPI.supportsTools, customAPI.fallbackMode);
      
      const response = await fetch(customAPI.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(openAIRequest),
      });
      
      if (!response.ok) {
        const errorText = await response.text();

        // Check if error is related to tool/function calling
        const isToolError = errorText.includes('function') ||
                           errorText.includes('tool') ||
                           errorText.includes('schema') ||
                           errorText.includes('anyOf') ||
                           errorText.includes('INTEGER');

        // If it's a tool-related error and we haven't tried fallback yet
        if (isToolError && customAPI.supportsTools !== false && customAPI.fallbackMode !== 'disabled') {
          console.warn('Tool function error detected, retrying with tools disabled...');

          // Retry with tools disabled
          const fallbackRequest = convertGeminiToOpenAI(request, customAPI.model, false, 'text');
          const fallbackResponse = await fetch(customAPI.endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(fallbackRequest),
          });

          if (!fallbackResponse.ok) {
            const fallbackErrorText = await fallbackResponse.text();
            throw new Error(`Custom API request failed even with tools disabled: ${fallbackResponse.status} ${fallbackResponse.statusText} - ${fallbackErrorText}`);
          }

          const fallbackOpenAIResponse = await fallbackResponse.json();
          return convertOpenAIToGemini(fallbackOpenAIResponse);
        }

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
      const openAIRequest = convertGeminiToOpenAI(request, customAPI.model, customAPI.supportsTools, customAPI.fallbackMode);
      openAIRequest.stream = true;
      
      const response = await fetch(customAPI.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(openAIRequest),
      });
      
      if (!response.ok) {
        const errorText = await response.text();

        // Check if error is related to tool/function calling
        const isToolError = errorText.includes('function') ||
                           errorText.includes('tool') ||
                           errorText.includes('schema') ||
                           errorText.includes('anyOf') ||
                           errorText.includes('INTEGER');

        // If it's a tool-related error and we haven't tried fallback yet
        if (isToolError && customAPI.supportsTools !== false && customAPI.fallbackMode !== 'disabled') {
          console.warn('Tool function error detected in stream, retrying with tools disabled...');

          // Retry with tools disabled
          const fallbackRequest = convertGeminiToOpenAI(request, customAPI.model, false, 'text');
          fallbackRequest.stream = true;

          const fallbackResponse = await fetch(customAPI.endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(fallbackRequest),
          });

          if (!fallbackResponse.ok) {
            const fallbackErrorText = await fallbackResponse.text();
            throw new Error(`Custom API stream request failed even with tools disabled: ${fallbackResponse.status} ${fallbackResponse.statusText} - ${fallbackErrorText}`);
          }

          // Use the fallback response for streaming
          const fallbackReader = fallbackResponse.body?.getReader();
          if (!fallbackReader) {
            throw new Error('Failed to get fallback response reader');
          }

          return createStreamGenerator(fallbackReader);
        }

        throw new Error(`Custom API stream request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      return createStreamGenerator(reader);
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

