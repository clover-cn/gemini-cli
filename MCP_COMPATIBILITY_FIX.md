# 自定义API MCP工具函数兼容性修复

## 🎯 问题描述

用户在使用自定义API时遇到错误：
```
✕ [API Error: Custom API stream request failed: 400 Bad Request - {"error":{"message":"Invalid schema for function 'fetch': \"INTEGER\" is not valid under any of the schemas listed in the 'anyOf' keyword (request id: 20250704084605358808989b1BEWt8W)","type":"invalid_request_error","param":"","code":"invalid_request_error"}}]
```

这个错误表明部分模型不支持工具函数调用，导致请求失败。

## 🔧 解决方案

我为自定义API添加了MCP工具函数兼容性处理，让不支持MCP的模型也能正常使用。

### 核心功能

1. **工具函数支持检测** - 可以配置模型是否支持工具函数
2. **智能降级处理** - 当模型不支持工具函数时，自动转换为文本提示
3. **错误自动重试** - 检测到工具函数错误时自动重试
4. **灵活配置选项** - 支持多种配置模式

### 新增配置选项

#### CustomAPIConfig 接口更新
```typescript
export interface CustomAPIConfig {
  endpoint: string;
  apiKey?: string;
  model?: string;
  supportsTools?: boolean;           // 是否支持工具函数
  fallbackMode?: 'text' | 'disabled'; // 降级模式
}
```

#### 配置参数说明

- **supportsTools**: 
  - `true` - 明确支持工具函数
  - `false` - 明确不支持工具函数
  - `undefined` - 自动检测（默认）

- **fallbackMode**:
  - `text` - 将工具函数转换为文本提示（默认）
  - `disabled` - 完全禁用工具函数

## 🚀 使用方法

### 1. 基本命令格式
```bash
/api set <endpoint> [api_key] [model] [supports_tools] [fallback_mode]
```

### 2. 使用示例

#### 设置支持工具函数的API（如OpenAI）
```bash
/api set https://api.openai.com/v1/chat/completions sk-your-key gpt-4 true text
```

#### 设置不支持工具函数的API（如某些开源模型）
```bash
/api set https://api.siliconflow.cn/v1/chat/completions sk-your-key deepseek-ai/DeepSeek-V3 false text
```

#### 设置自动检测的API（推荐）
```bash
/api set http://localhost:11434/v1/chat/completions "" llama2 auto text
```

#### 设置禁用工具函数的API
```bash
/api set https://api.example.com/v1/chat/completions key model false disabled
```

### 3. 查看当前配置
```bash
/api show
```

输出示例：
```
Current custom API:
Endpoint: https://api.siliconflow.cn/v1/chat/completions
API Key: [Set]
Model: deepseek-ai/DeepSeek-V3
Tool support: disabled
Fallback mode: text
```

## 🔄 工作原理

### 1. 工具函数转换
当 `supportsTools=false` 且 `fallbackMode=text` 时：
- 将工具函数声明转换为文本描述
- 添加到系统提示中
- 模型以文本形式返回工具调用结果

### 2. 错误自动重试
当检测到工具函数相关错误时：
- 自动禁用工具函数
- 使用文本降级模式重试请求
- 对用户透明，无需手动干预

### 3. 智能检测
错误检测关键词：
- `function`
- `tool`
- `schema`
- `anyOf`
- `INTEGER`

## 📝 配置文件格式

在 `~/.gemini/settings.json` 中：
```json
{
  "customAPI": {
    "endpoint": "https://api.siliconflow.cn/v1/chat/completions",
    "apiKey": "sk-your-key",
    "model": "deepseek-ai/DeepSeek-V3",
    "supportsTools": false,
    "fallbackMode": "text"
  }
}
```

## 🧪 测试验证

运行测试脚本验证修复：
```bash
node test_mcp_compatibility.js
```

测试覆盖：
- ✅ 支持工具函数的API配置
- ✅ 不支持工具函数的API配置  
- ✅ 自动检测模式配置
- ✅ 禁用降级模式配置
- ✅ ContentGenerator创建

## 🎉 修复效果

- **兼容性提升** - 支持更多不同类型的API端点
- **用户体验改善** - 自动处理工具函数兼容性问题
- **配置灵活性** - 提供多种配置选项满足不同需求
- **错误恢复** - 自动重试机制提高成功率

现在，即使是不支持MCP工具函数的模型也能正常使用Gemini CLI的所有功能！
