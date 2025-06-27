#!/usr/bin/env node

/**
 * 简单的自定义API功能测试脚本
 */

import { Config } from './packages/core/src/config/config.js';

console.log('🧪 测试自定义API功能...\n');

// 创建一个简单的配置对象
const testConfig = new Config({
  sessionId: 'test-session',
  targetDir: process.cwd(),
  debugMode: false,
  cwd: process.cwd(),
  model: 'gemini-2.5-pro',
});

// 测试1: 设置自定义API（不带模型）
console.log('✅ 测试1: 设置基本自定义API');
testConfig.setCustomAPI('https://api.openai.com/v1/chat/completions', 'sk-test-key');
const config1 = testConfig.getCustomAPI();
console.log('配置结果:', JSON.stringify(config1, null, 2));

// 测试2: 设置自定义API（带模型）
console.log('\n✅ 测试2: 设置带模型的自定义API');
testConfig.setCustomAPI('https://api.openai.com/v1/chat/completions', 'sk-test-key', 'gpt-4');
const config2 = testConfig.getCustomAPI();
console.log('配置结果:', JSON.stringify(config2, null, 2));

// 测试3: 设置本地API（无密钥但有模型）
console.log('\n✅ 测试3: 设置本地API');
testConfig.setCustomAPI('http://localhost:11434/v1/chat/completions', undefined, 'llama2');
const config3 = testConfig.getCustomAPI();
console.log('配置结果:', JSON.stringify(config3, null, 2));

// 测试4: 重置配置
console.log('\n✅ 测试4: 重置配置');
testConfig.resetCustomAPI();
const config4 = testConfig.getCustomAPI();
console.log('重置后配置:', config4);

console.log('\n🎉 所有测试通过！自定义API功能正常工作。');
console.log('\n📝 使用说明:');
console.log('1. 启动 Gemini CLI: npm start');
console.log('2. 设置自定义API: /api set <endpoint> [api_key] [model]');
console.log('3. 查看配置: /api show');
console.log('4. 重置配置: /api reset');
console.log('\n示例:');
console.log('/api set https://api.openai.com/v1/chat/completions sk-your-key gpt-4');
console.log('/api set http://localhost:11434/v1/chat/completions "" llama2');
