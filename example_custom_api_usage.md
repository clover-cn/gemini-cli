# 自定义API使用示例

## 快速开始

1. **启动Gemini CLI**
   ```bash
   npm start
   ```

2. **配置自定义API**
   ```bash
   # 设置OpenAI API，指定使用GPT-4模型
   /api set https://api.openai.com/v1/chat/completions sk-your-openai-key gpt-4

   # 或设置本地Ollama服务，指定模型
   /api set http://localhost:11434/v1/chat/completions "" llama2

   # 或设置其他兼容服务如DeepSeek，指定模型
   /api set https://api.deepseek.com/v1/chat/completions your-deepseek-key deepseek-chat
   ```

3. **验证配置**
   ```bash
   /api show
   ```

4. **开始使用**
   现在你可以像平常一样使用Gemini CLI，但它将使用你配置的自定义API端点！

## 实际使用场景

### 场景1：使用OpenAI GPT-4
```bash
# 配置，明确指定使用GPT-4模型
/api set https://api.openai.com/v1/chat/completions sk-proj-your-openai-key gpt-4

# 现在所有对话都会使用GPT-4
请帮我写一个Python函数来计算斐波那契数列
```

### 场景2：使用本地Ollama
```bash
# 首先确保Ollama正在运行
# ollama serve

# 配置使用本地Ollama，指定模型（如llama2、codellama等）
/api set http://localhost:11434/v1/chat/completions "" llama2

# 现在使用本地模型
分析这段代码的性能问题
```

### 场景3：切换回Google AI
```bash
# 重置为默认的Google AI
/api reset

# 现在又回到了Gemini模型
```

## 配置持久化

你的自定义API配置会自动保存。你可以在以下位置找到配置文件：

- 用户级配置：`~/.gemini/settings.json`
- 项目级配置：`.gemini/settings.json`

## 支持的API格式

此功能支持任何遵循OpenAI聊天完成API格式的服务，包括但不限于：

- OpenAI GPT-3.5/GPT-4/GPT-4-turbo
- Azure OpenAI Service
- Anthropic Claude (通过代理)
- 本地部署的模型 (Ollama, LocalAI等)
- DeepSeek Chat
- 通义千问 (通过代理)
- 其他兼容OpenAI格式的服务

## 故障排除

### 常见问题

1. **API端点无法访问**
   ```
   Error: Custom API request failed: 404 Not Found
   ```
   - 检查endpoint URL是否正确
   - 确认API服务正在运行

2. **认证失败**
   ```
   Error: Custom API request failed: 401 Unauthorized
   ```
   - 检查API密钥是否正确
   - 确认API密钥有足够的权限

3. **格式不兼容**
   ```
   Error: Invalid response format
   ```
   - 确认API遵循OpenAI聊天完成格式
   - 检查API文档确认兼容性

### 调试技巧

1. **查看当前配置**
   ```bash
   /api show
   # 这会显示端点、API密钥状态和当前配置的模型
   ```

2. **重置为默认**
   ```bash
   /api reset
   ```

3. **使用curl测试API**
   ```bash
   curl -X POST "YOUR_ENDPOINT" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -d '{"messages":[{"role":"user","content":"test"}]}'
   ```
