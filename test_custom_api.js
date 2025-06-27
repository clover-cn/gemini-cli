#!/usr/bin/env node

/**
 * 测试自定义API配置是否正确工作
 */

console.log('🔍 检查自定义API配置...\n');

// 检查设置文件
import fs from 'fs';
import path from 'path';
import os from 'os';

const userSettingsPath = path.join(os.homedir(), '.gemini', 'settings.json');
const workspaceSettingsPath = path.join(process.cwd(), '.gemini', 'settings.json');

console.log('📁 检查配置文件位置:');
console.log(`用户设置: ${userSettingsPath}`);
console.log(`工作区设置: ${workspaceSettingsPath}\n`);

// 检查用户设置
if (fs.existsSync(userSettingsPath)) {
  try {
    const userSettings = JSON.parse(fs.readFileSync(userSettingsPath, 'utf-8'));
    console.log('✅ 用户设置文件内容:');
    console.log(JSON.stringify(userSettings, null, 2));
    
    if (userSettings.customAPI) {
      console.log('\n🎯 发现自定义API配置:');
      console.log(`- 端点: ${userSettings.customAPI.endpoint}`);
      console.log(`- API密钥: ${userSettings.customAPI.apiKey ? '[已设置]' : '[未设置]'}`);
      console.log(`- 模型: ${userSettings.customAPI.model || '[未设置]'}`);
    } else {
      console.log('\n❌ 未找到自定义API配置');
    }
  } catch (error) {
    console.log('❌ 读取用户设置文件失败:', error.message);
  }
} else {
  console.log('📝 用户设置文件不存在');
}

console.log('\n' + '='.repeat(50));

// 检查工作区设置
if (fs.existsSync(workspaceSettingsPath)) {
  try {
    const workspaceSettings = JSON.parse(fs.readFileSync(workspaceSettingsPath, 'utf-8'));
    console.log('✅ 工作区设置文件内容:');
    console.log(JSON.stringify(workspaceSettings, null, 2));
    
    if (workspaceSettings.customAPI) {
      console.log('\n🎯 发现工作区自定义API配置:');
      console.log(`- 端点: ${workspaceSettings.customAPI.endpoint}`);
      console.log(`- API密钥: ${workspaceSettings.customAPI.apiKey ? '[已设置]' : '[未设置]'}`);
      console.log(`- 模型: ${workspaceSettings.customAPI.model || '[未设置]'}`);
    } else {
      console.log('\n❌ 工作区未找到自定义API配置');
    }
  } catch (error) {
    console.log('❌ 读取工作区设置文件失败:', error.message);
  }
} else {
  console.log('📝 工作区设置文件不存在');
}

console.log('\n💡 使用说明:');
console.log('1. 启动Gemini CLI: npm start');
console.log('2. 设置自定义API: /api set https://api.siliconflow.cn/v1/chat/completions sk-your-key deepseek-ai/DeepSeek-V3');
console.log('3. 查看配置: /api show');
console.log('4. 测试对话: 你好');
console.log('5. 重置配置: /api reset');
