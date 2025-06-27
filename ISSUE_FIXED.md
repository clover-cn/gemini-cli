# ✅ 问题已修复：自定义API未生效

## 🐛 问题描述

你遇到的问题：在使用 `/api set https://api.siliconflow.cn/v1/chat/completions sk-imvhsrqgwvoyfmhubnqnomnrdkozhuzauygwksrlqnlvocac deepseek-ai/DeepSeek-V3` 设置自定义API后，似乎没有生效，仍然在使用默认的Google模型。

## 🔍 问题根因

我发现了两个关键问题：

### 1. 配置优先级问题
在 `createContentGeneratorConfig` 函数中，自定义API配置被设置了，但是后续的认证逻辑仍然会覆盖它，导致最终还是使用Google的认证流程。

### 2. 设置持久化问题
`/api` 命令只是将配置保存到运行时的Config对象中，但没有持久化到settings.json文件中，所以重启后配置就丢失了。

## 🛠 修复方案

### 修复1：配置优先级
修改了 `packages/core/src/core/contentGenerator.ts` 中的 `createContentGeneratorConfig` 函数：

```typescript
// Check for custom API configuration - if present, return immediately
const customAPI = config?.getCustomAPI?.();
if (customAPI?.endpoint) {
  contentGeneratorConfig.customAPI = customAPI;
  // When using custom API, return early without other auth validation
  return contentGeneratorConfig;
}
```

**关键点**：当检测到自定义API时，立即返回配置，不再执行后续的Google认证逻辑。

### 修复2：设置持久化
修改了 `packages/cli/src/ui/hooks/slashCommandProcessor.ts` 中的 `/api` 命令：

```typescript
// Save to settings file for persistence
settings.setValue(SettingScope.User, 'customAPI', {
  endpoint,
  apiKey,
  model,
});
```

**关键点**：将配置保存到用户设置文件中，确保持久化。

### 修复3：类型系统
更新了相关的TypeScript类型定义，确保编译通过：

1. 添加了 `CustomAPISettings` 接口支持模型名称
2. 更新了 `setValue` 方法的类型签名
3. 修复了格式转换函数的类型错误

## 🎯 现在的功能

### 完整的模型支持
```bash
# 支持指定具体模型
/api set https://api.siliconflow.cn/v1/chat/completions sk-your-key deepseek-ai/DeepSeek-V3
/api set https://api.openai.com/v1/chat/completions sk-your-key gpt-4
/api set http://localhost:11434/v1/chat/completions "" llama2
```

### 智能格式转换
- 自动将Gemini内部请求格式转换为OpenAI格式
- 支持流式响应
- 正确处理消息角色映射（user/assistant/system）

### 配置持久化
- 设置保存到 `~/.gemini/settings.json`
- 重启后配置仍然有效
- 支持工作区级别的配置覆盖

## 🚀 测试步骤

1. **构建项目**：
   ```bash
   npm run build
   ```

2. **启动CLI**：
   ```bash
   npm start
   ```

3. **设置自定义API**：
   ```bash
   /api set https://api.siliconflow.cn/v1/chat/completions sk-imvhsrqgwvoyfmhubnqnomnrdkozhuzauygwksrlqnlvocac deepseek-ai/DeepSeek-V3
   ```

4. **验证配置**：
   ```bash
   /api show
   ```
   应该显示：
   ```
   Current custom API:
   Endpoint: https://api.siliconflow.cn/v1/chat/completions
   API Key: [Set]
   Model: deepseek-ai/DeepSeek-V3
   Configuration saved to settings.
   ```

5. **测试对话**：
   ```
   你好
   ```
   现在应该使用DeepSeek模型响应，而不是Google Gemini。

6. **验证持久化**：
   - 退出CLI
   - 重新启动：`npm start`
   - 运行 `/api show` 确认配置还在

## 🎉 结果

现在你的自定义API配置应该正常工作了！你可以：

- ✅ 自由切换不同的AI模型
- ✅ 指定具体的模型名称（如 deepseek-ai/DeepSeek-V3）
- ✅ 配置会自动保存和持久化
- ✅ 支持本地模型（如Ollama）
- ✅ 支持各种OpenAI兼容的API服务

试试看吧！🚀
