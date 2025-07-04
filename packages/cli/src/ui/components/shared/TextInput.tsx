/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../../colors.js';

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isFocused?: boolean;
  mask?: boolean;
}

export function TextInput({
  value,
  onChange,
  placeholder = '',
  isFocused = false,
  mask = false,
}: TextInputProps): React.JSX.Element {
  const [cursorPosition, setCursorPosition] = useState(value.length);

  useEffect(() => {
    setCursorPosition(value.length);
  }, [value]);

  useInput(
    (input, key) => {
      if (!isFocused) return;

      if (key.backspace || key.delete) {
        if (cursorPosition > 0) {
          const newValue = value.slice(0, cursorPosition - 1) + value.slice(cursorPosition);
          onChange(newValue);
          setCursorPosition(cursorPosition - 1);
        }
      } else if (key.leftArrow) {
        setCursorPosition(Math.max(0, cursorPosition - 1));
      } else if (key.rightArrow) {
        setCursorPosition(Math.min(value.length, cursorPosition + 1));
      } else if (key.ctrl && input === 'a') {
        // Ctrl+A: 全选（移动光标到开始）
        setCursorPosition(0);
      } else if (key.ctrl && input === 'e') {
        // Ctrl+E: 移动光标到末尾
        setCursorPosition(value.length);
      } else if (key.ctrl && input === 'v') {
        // Ctrl+V: 粘贴操作 - 这里我们不能直接处理剪贴板，但可以让用户直接输入
        // 实际的粘贴会通过正常的input事件处理
        return;
      } else if (key.ctrl && input === 'u') {
        // Ctrl+U: 清空当前行
        onChange('');
        setCursorPosition(0);
      } else if (input && !key.ctrl && !key.meta && !key.tab && !key.return && !key.escape) {
        // 处理正常字符输入，包括粘贴的文本
        const newValue = value.slice(0, cursorPosition) + input + value.slice(cursorPosition);
        onChange(newValue);
        setCursorPosition(cursorPosition + input.length);
      }
    },
    { isActive: isFocused }
  );

  const displayValue = mask && value ? '*'.repeat(value.length) : value;
  const displayText = displayValue || placeholder;
  const textColor = value ? Colors.Foreground : Colors.Gray;
  const borderColor = isFocused ? Colors.AccentBlue : Colors.Gray;

  // Cursor display is handled in the render section below

  return (
    <Box
      borderStyle="single"
      borderColor={borderColor}
      paddingX={1}
      width="100%"
    >
      <Text color={textColor}>
        {isFocused && cursorPosition <= displayText.length ? (
          <>
            {displayText.slice(0, cursorPosition)}
            <Text inverse>{cursorPosition < displayText.length ? displayText[cursorPosition] : ' '}</Text>
            {displayText.slice(cursorPosition + 1)}
          </>
        ) : (
          displayText
        )}
      </Text>
    </Box>
  );
}
