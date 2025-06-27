# 自定义API功能

我已经成功为Gemini CLI添加了自定义API支持。现在你可以使用任何兼容OpenAI格式的API端点。

## 新功能

### 1. `/api` 命令
在Gemini CLI中，你可以使用以下命令管理自定义API设置：

- `/api set <endpoint> [api_key] [model]` - 设置自定义API端点、可选的API密钥和模型名称
- `/api show` - 显示当前的自定义API配置
- `/api reset` - 重置为默认的Google AI端点

### 2. 配置持久化
自定义API配置会保存在settings.json文件中，支持：
- 用户级配置 (`~/.gemini/settings.json`)
- 工作区级配置 (`.gemini/settings.json`)

## 使用示例

### 设置自定义API
```bash
# 设置OpenAI兼容的API端点，指定使用GPT-4模型
/api set https://api.openai.com/v1/chat/completions sk-your-api-key-here gpt-4

# 设置本地Ollama服务，指定模型
/api set http://localhost:11434/v1/chat/completions "" llama2

# 设置DeepSeek服务
/api set https://api.deepseek.com/v1/chat/completions your-deepseek-key deepseek-chat

# 只设置端点，使用默认模型
/api set http://localhost:8080/v1/chat/completions
```

### 查看当前配置
```bash
/api show
```

### 重置为默认
```bash
/api reset
```

## 配置文件格式

在`~/.gemini/settings.json`或`.gemini/settings.json`中，配置格式如下：

```json
{
  "customAPI": {
    "endpoint": "https://api.openai.com/v1/chat/completions",
    "apiKey": "sk-your-api-key-here",
    "model": "gpt-4"
  }
}
```

## 技术实现

### 修改的文件
1. `slashCommandProcessor.ts` - 添加了 `/api` 命令
2. `config.ts` (core) - 添加了 CustomAPIConfig 接口和相关方法
3. `contentGenerator.ts` - 添加了自定义API的ContentGenerator实现
4. `settings.ts` - 添加了CustomAPISettings接口
5. `config.ts` (cli) - 在配置加载时传递customAPI设置

### 兼容性
- 支持OpenAI兼容的API格式
- 自动将Gemini格式请求转换为OpenAI格式
- 支持流式响应（Server-Sent Events）
- 支持Bearer token认证
- 支持自定义模型名称配置
- 对于token计数，使用基于文本长度的估算（因为自定义API可能不支持token计数）
- 暂不支持embedding功能（自定义API通常用于聊天完成）

## 注意事项

1. **API格式**：确保你的自定义API兼容OpenAI的聊天完成格式
2. **认证**：API密钥将以Bearer token形式发送
3. **模型名称**：如果不指定模型，将使用默认的 `gpt-3.5-turbo`
4. **格式转换**：Gemini CLI会自动将内部请求格式转换为OpenAI格式
5. **流式响应**：如果API支持，会自动使用流式响应
6. **错误处理**：如果自定义API失败，会显示详细的错误信息

## 安全提醒

- API密钥会明文保存在settings.json文件中，请确保文件权限安全
- 建议使用环境变量或其他安全方式管理敏感信息
- 在共享项目时，注意不要提交包含API密钥的配置文件
