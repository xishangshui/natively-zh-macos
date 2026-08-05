// 从 i18n-allowlist.json 生成人工审查清单。
// 刻意从数据源生成而不是手写：手写的文档一定会和名单漂移。
import fs from 'node:fs';

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const allow = JSON.parse(fs.readFileSync(`${ROOT}/scripts/i18n-allowlist.json`, 'utf8'));
const scope = JSON.parse(fs.readFileSync(`${ROOT}/scripts/i18n-scope.json`, 'utf8'));

// 文件 → 该文件对应的 UI 页面（人工维护的映射；未列出的按路径推断）
const PAGE = {
  'src/App.tsx': '应用外壳（全局加载 / 错误 / 索引状态）',
  'src/components/SettingsOverlay.tsx': '设置总览（侧栏、通用、主题、语言、快捷键、音频、日历）',
  'src/components/SettingsPopup.tsx': '会议浮层的设置小菜单',
  'src/components/NativelyInterface.tsx': '会议进行中的主界面',
  'src/components/LocalWhisperModelPanel.tsx': '设置 → 音频 → 本地 Whisper 模型',
  'src/components/settings/AIProvidersSettings.tsx': '设置 → AI 供应商',
  'src/components/settings/NativelyApiSettings.tsx': '设置 → Natively API',
  'src/components/settings/NativelyProSettings.tsx': '设置 → Natively Pro',
  'src/components/settings/PhoneMirrorSettings.tsx': '设置 → 手机镜像',
  'src/components/settings/Sidebar.tsx': '高级设置侧栏',
  'src/components/ui/KeyBadge.tsx': '快捷键徽标（全局复用）',
  'src/components/ProfileIntelligenceSettings.tsx': '画像智能',
  'src/components/Cropper.tsx': '区域截图裁剪器',
  'src/components/AboutSection.tsx': '设置 → 关于',
  'src/components/StartupSequence.tsx': '首次启动欢迎页',
  'src/components/onboarding/PermissionsToaster.tsx': '权限提示浮层',
  'src/components/onboarding/PermissionsOnboardingFull.tsx': '完整权限引导',
  'src/components/UpdateModal.tsx': '更新弹窗',
  'src/components/UpdateBanner.tsx': '更新横幅',
  'src/components/trial/FreeTrialModal.tsx': '免费试用弹窗',
  'src/components/FollowUpEmailModal.tsx': '会后跟进邮件',
  'src/components/dynamic-actions/DynamicActionCard.tsx': '动态动作卡片',
};

const byFile = new Map();
for (const e of allow.allowed) {
  if (!byFile.has(e.file)) byFile.set(e.file, []);
  byFile.get(e.file).push(e);
}

const lines = [];
lines.push('# 允许保留英文的清单');
lines.push('');
lines.push('本文件由 `scripts/i18n-allowlist.json` 生成，请勿手工编辑——');
lines.push('手写的文档一定会和名单漂移。改动名单后重新生成即可。');
lines.push('');
lines.push(`条目总数：**${allow.allowed.length}**　门禁覆盖文件数：**${scope.enforcedFiles.length}**`);
lines.push('');
lines.push('## 判定标准');
lines.push('');
lines.push('依设计规格 §3.2，只有以下几类允许保留原文：');
lines.push('');
lines.push('- 产品名、供应商名、平台名（Natively、OpenAI、Groq、GitHub…）');
lines.push('- 模型 ID 与 API 字段名（`gpt-5.4`、`messages`、`choices[0].message.content`）');
lines.push('- 可复制执行的命令与代码示例（`ollama serve`、cURL 模板）');
lines.push('- 键盘按键名（Ctrl、Shift、ESC、Enter）');
lines.push('- 语言地区代码与云区域 ID（`en-US`、`eastus`）');
lines.push('- 真实联系方式、促销码、文件路径');
lines.push('- 技术栈名称（React、Rust、SQLite…）');
lines.push('');
lines.push('**不在此列的一律必须翻译。** 过期条目（名单里有、源码里已无）会导致门禁失败，');
lines.push('这是有意设计，防止名单膨胀成永远绿灯的挡箭牌。');
lines.push('');
lines.push('## 运行时的第三方原始内容');
lines.push('');
lines.push('以下内容不进名单，因为它们不是源码字面量，而是运行时产生的：');
lines.push('');
lines.push('- 供应商返回的原始错误详情——按设计规格 §11，界面显示「中文摘要 + 可展开的原始英文详情」，');
lines.push('  保留原文是为了让用户能把它复制给供应商排错');
lines.push('- 用户上传的文档内容与会议原始转写');
lines.push('- AI 模型生成的回答正文（语言由 aiResponseLanguage 设置决定）');
lines.push('');
lines.push('## 按文件列出');
lines.push('');

for (const file of [...byFile.keys()].sort()) {
  const entries = byFile.get(file);
  const page = PAGE[file] ?? '（未标注页面）';
  lines.push(`### \`${file}\``);
  lines.push('');
  lines.push(`所在界面：${page}`);
  lines.push('');
  lines.push('| 保留的原文 | 理由 |');
  lines.push('|---|---|');
  for (const e of entries.sort((a, b) => a.literal.localeCompare(b.literal))) {
    // 表格里的竖线与换行要转义，否则会破表
    const literal = e.literal.replace(/\|/g, '\\|').replace(/\n/g, ' ⏎ ');
    const reason = e.reason.replace(/\|/g, '\\|');
    const shown = literal.length > 70 ? `${literal.slice(0, 70)}…` : literal;
    lines.push(`| \`${shown}\` | ${reason} |`);
  }
  lines.push('');
}

fs.writeFileSync(`${ROOT}/docs/zh-cn/i18n-allowlist.md`, lines.join('\n'), 'utf8');
console.log(`生成 docs/zh-cn/i18n-allowlist.md：${allow.allowed.length} 条，${byFile.size} 个文件`);
