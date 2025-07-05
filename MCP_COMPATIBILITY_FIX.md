# 自定义API  MCP工具函数兼容性修改



## 🔧 解决方案

现在，即使是不支持MCP工具函数的模型也能正常使用Gemini CLI的所有功能！

### 核心功能

1. **工具函数支持检测** - 可以配置模型是否支持工具函数
2. **智能降级处理** - 当模型不支持工具函数时，自动转换为文本提示
3. **错误自动重试** - 检测到工具函数错误时自动重试
4. **灵活配置选项** - 支持多种配置模式

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

### 4. 清除自定义端点

```bash
/api reset
```

### 5. 切换回Google账号使用

```bash
// 1.先清除自定义端点
/api reset

// 2.切换Google账号或者其他即可
/auth
```
