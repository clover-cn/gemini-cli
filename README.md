# 自定义API  MCP工具函数兼容性修改



## 🔧 解决方案

现在，即使是不支持MCP工具函数的模型也能正常使用Gemini CLI的所有功能！

### 核心功能

1. **工具函数支持检测** - 可以配置模型是否支持工具函数
2. **智能降级处理** - 当模型不支持工具函数时，自动转换为文本提示
3. **错误自动重试** - 检测到工具函数错误时自动重试
4. **灵活配置选项** - 支持多种配置模式

## 📦 安装指南

### 系统要求

- Node.js >= 18.0.0
- npm（随 Node.js 一起安装）

### 快速安装

#### 方法一：使用 npm（推荐）

```bash
# 克隆仓库
git clone https://github.com/clover-cn/gemini-cli.git
cd gemini-cli

# 安装依赖
npm install

# 构建项目
npm run bundle

# 全局安装
npm install -g .
```



#### 方法二：使用安装脚本

**Linux/macOS:**
```bash
chmod +x install.sh
./install.sh
```

**Windows (命令提示符):**
```cmd
install.bat
```

**Windows (PowerShell):**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\install.ps1
```

### 验证安装

安装完成后，验证 CLI 是否正常工作：

```bash
# 检查版本
gemini-plus --version

# 显示帮助
gemini-plus --help

# 启动 CLI
gemini-plus
```

### 卸载

要卸载全局包：

```bash
npm uninstall -g gemini-plus
```

### 故障排除

#### 找不到命令
如果遇到"找不到命令"错误，请确保：
1. 安装成功完成
2. npm 全局 bin 目录在您的 PATH 中
3. 尝试重启终端

#### 权限错误
在 Linux/macOS 上，您可能需要使用 `sudo` 进行全局安装：
```bash
sudo npm install -g .
```

或者配置 npm 使用不同的全局包目录。

### 开发模式

对于开发目的，您也可以直接运行 CLI：

```bash
# 从源码运行
npm start

# 或运行构建的包
node bundle/gemini-plus.js
```

### 与原版的区别

此分支已修改为：
- 包名从 `@google/gemini-cli` 改为 `gemini-plus`
- 命令名从 `gemini` 改为 `gemini-plus`
- 更新构建配置以生成 `gemini-plus.js` 而不是 `gemini.js`
- 为不同平台添加了便捷的安装脚本

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
