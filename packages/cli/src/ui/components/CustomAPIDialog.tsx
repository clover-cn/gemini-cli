/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../colors.js';
import { TextInput } from './shared/TextInput.js';
import { LoadedSettings, SettingScope } from '../../config/settings.js';
import { Config } from '@google/gemini-cli-core';

interface CustomAPIDialogProps {
  onComplete: (success: boolean) => void;
  settings: LoadedSettings;
  config: Config;
}

export function CustomAPIDialog({
  onComplete,
  settings,
  config,
}: CustomAPIDialogProps): React.JSX.Element {
  const [endpoint, setEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [currentField, setCurrentField] = useState<'endpoint' | 'apiKey' | 'model'>('endpoint');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!endpoint.trim()) {
      setErrorMessage('Endpoint is required');
      return;
    }

    try {
      // Validate endpoint format
      new URL(endpoint);
    } catch {
      setErrorMessage('Please provide a valid URL endpoint');
      return;
    }

    try {
      // Set custom API configuration
      config.setCustomAPI(
        endpoint.trim(),
        apiKey.trim() || undefined,
        model.trim() || undefined,
        undefined, // supportsTools - auto-detect
        'text' // fallbackMode - default to text
      );

      // Save to settings
      settings.setValue(SettingScope.User, 'customAPI', {
        endpoint: endpoint.trim(),
        apiKey: apiKey.trim() || undefined,
        model: model.trim() || undefined,
        supportsTools: undefined,
        fallbackMode: 'text',
      });

      // Refresh content generator
      await config.refreshContentGenerator();
      
      onComplete(true);
    } catch (error) {
      setErrorMessage(`Failed to configure custom API: ${error}`);
    }
  };

  const handleCancel = () => {
    onComplete(false);
  };

  const nextField = () => {
    if (currentField === 'endpoint') {
      setCurrentField('apiKey');
    } else if (currentField === 'apiKey') {
      setCurrentField('model');
    } else {
      // 从最后一个字段循环回到第一个字段
      setCurrentField('endpoint');
    }
  };

  const prevField = () => {
    if (currentField === 'model') {
      setCurrentField('apiKey');
    } else if (currentField === 'apiKey') {
      setCurrentField('endpoint');
    } else {
      // 从第一个字段循环到最后一个字段
      setCurrentField('model');
    }
  };

  useInput((_input, key) => {
    if (key.escape) {
      handleCancel();
    } else if (key.tab) {
      if (key.shift) {
        prevField();
      } else {
        nextField();
      }
    } else if (key.return) {
      // Enter键直接保存配置
      handleSubmit();
    }
  });

  return (
    <Box
      borderStyle="round"
      borderColor={Colors.Gray}
      flexDirection="column"
      padding={1}
      width="100%"
    >
      <Text bold>Configure Custom API</Text>
      
      <Box marginTop={1}>
        <Text>API Endpoint (required):</Text>
      </Box>
      <TextInput
        value={endpoint}
        onChange={setEndpoint}
        placeholder="https://api.example.com/v1/chat/completions"
        isFocused={currentField === 'endpoint'}
      />

      <Box marginTop={1}>
        <Text>API Key (optional):</Text>
      </Box>
      <TextInput
        value={apiKey}
        onChange={setApiKey}
        placeholder="your-api-key"
        isFocused={currentField === 'apiKey'}
        mask={true}
      />

      <Box marginTop={1}>
        <Text>Model (optional):</Text>
      </Box>
      <TextInput
        value={model}
        onChange={setModel}
        placeholder="gpt-4, llama2, etc."
        isFocused={currentField === 'model'}
      />

      {errorMessage && (
        <Box marginTop={1}>
          <Text color={Colors.AccentRed}>{errorMessage}</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text color={Colors.Gray}>
          Tab/Shift+Tab: Navigate fields • Enter: Save configuration • Esc: Cancel
        </Text>
      </Box>
    </Box>
  );
}
