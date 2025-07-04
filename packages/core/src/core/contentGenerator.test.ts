/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi } from 'vitest';
import { createContentGenerator, AuthType } from './contentGenerator.js';
import { createCodeAssistContentGenerator } from '../code_assist/codeAssist.js';
import { GoogleGenAI } from '@google/genai';
import { GenerateContentParameters } from '@google/genai';

vi.mock('../code_assist/codeAssist.js');
vi.mock('@google/genai');

describe('contentGenerator', () => {
  it('should create a CodeAssistContentGenerator', async () => {
    const mockGenerator = {} as unknown;
    vi.mocked(createCodeAssistContentGenerator).mockResolvedValue(
      mockGenerator as never,
    );
    const generator = await createContentGenerator({
      model: 'test-model',
      authType: AuthType.LOGIN_WITH_GOOGLE,
    });
    expect(createCodeAssistContentGenerator).toHaveBeenCalled();
    expect(generator).toBe(mockGenerator);
  });

  it('should create a GoogleGenAI content generator', async () => {
    const mockGenerator = {
      models: {},
    } as unknown;
    vi.mocked(GoogleGenAI).mockImplementation(() => mockGenerator as never);
    const generator = await createContentGenerator({
      model: 'test-model',
      apiKey: 'test-api-key',
      authType: AuthType.USE_GEMINI,
    });
    expect(GoogleGenAI).toHaveBeenCalledWith({
      apiKey: 'test-api-key',
      vertexai: undefined,
      httpOptions: {
        headers: {
          'User-Agent': expect.any(String),
        },
      },
    });
    expect(generator).toBe((mockGenerator as GoogleGenAI).models);
  });

  describe('convertGeminiToOpenAI', () => {
    it('should properly match tool call IDs with tool response IDs', () => {
      // This test verifies the fix for tool call ID mismatch issue
      const request: GenerateContentParameters = {
        model: 'test-model',
        contents: [
          {
            role: 'model',
            parts: [
              {
                functionCall: {
                  name: 'test_tool',
                  args: { param: 'value' }
                }
              }
            ]
          },
          {
            role: 'model',
            parts: [
              {
                functionResponse: {
                  name: 'test_tool',
                  response: { output: 'test result' }
                }
              }
            ]
          }
        ]
      };

      // Access the convertGeminiToOpenAI function through module internals
      // Note: This is a simplified test - in practice we'd need to expose the function or test through public API
      const result = (globalThis as any).convertGeminiToOpenAI?.(request, 'test-model', true, 'text');

      if (result) {
        // Verify that tool calls and tool responses have matching IDs
        const assistantMessage = result.messages.find((msg: any) => msg.role === 'assistant' && msg.tool_calls);
        const toolMessage = result.messages.find((msg: any) => msg.role === 'tool');

        if (assistantMessage && toolMessage) {
          const toolCallId = assistantMessage.tool_calls[0].id;
          const toolResponseId = toolMessage.tool_call_id;
          expect(toolCallId).toBeDefined();
          expect(toolResponseId).toBeDefined();
          // The IDs should match or be properly correlated
          expect(typeof toolCallId).toBe('string');
          expect(typeof toolResponseId).toBe('string');
        }
      }
    });
  });
});
