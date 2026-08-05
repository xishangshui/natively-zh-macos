# 允许保留英文的清单

本文件由 `scripts/i18n-allowlist.json` 生成，请勿手工编辑——
手写的文档一定会和名单漂移。改动名单后重新生成即可。

条目总数：**153**　门禁覆盖文件数：**48**

## 判定标准

依设计规格 §3.2，只有以下几类允许保留原文：

- 产品名、供应商名、平台名（Natively、OpenAI、Groq、GitHub…）
- 模型 ID 与 API 字段名（`gpt-5.4`、`messages`、`choices[0].message.content`）
- 可复制执行的命令与代码示例（`ollama serve`、cURL 模板）
- 键盘按键名（Ctrl、Shift、ESC、Enter）
- 语言地区代码与云区域 ID（`en-US`、`eastus`）
- 真实联系方式、促销码、文件路径
- 技术栈名称（React、Rust、SQLite…）

**不在此列的一律必须翻译。** 过期条目（名单里有、源码里已无）会导致门禁失败，
这是有意设计，防止名单膨胀成永远绿灯的挡箭牌。

## 运行时的第三方原始内容

以下内容不进名单，因为它们不是源码字面量，而是运行时产生的：

- 供应商返回的原始错误详情——按设计规格 §11，界面显示「中文摘要 + 可展开的原始英文详情」，
  保留原文是为了让用户能把它复制给供应商排错
- 用户上传的文档内容与会议原始转写
- AI 模型生成的回答正文（语言由 aiResponseLanguage 设置决定）

## 按文件列出

### `src/components/AboutSection.tsx`

所在界面：设置 → 关于

| 保留的原文 | 理由 |
|---|---|
| `Deepgram` | 技术栈名称，按设计规格 3.2 不翻译 |
| `Electron` | 技术栈名称，按设计规格 3.2 不翻译 |
| `ElevenLabs` | 技术栈名称，按设计规格 3.2 不翻译 |
| `Evin John` | 作者姓名，不翻译 |
| `Gemini` | 技术栈名称，按设计规格 3.2 不翻译 |
| `GitHub` | 平台名，按设计规格 3.2 不翻译 |
| `Google Cloud` | 技术栈名称，按设计规格 3.2 不翻译 |
| `Groq` | 技术栈名称，按设计规格 3.2 不翻译 |
| `Instagram` | 平台名，按设计规格 3.2 不翻译 |
| `LinkedIn` | 平台名，按设计规格 3.2 不翻译 |
| `Natively` | 产品名，按设计规格 3.2 不翻译 |
| `Natively ZH` | 本中文构建的发行标识，不翻译 |
| `OpenAI` | 技术栈名称，按设计规格 3.2 不翻译 |
| `React` | 技术栈名称，按设计规格 3.2 不翻译 |
| `Rust` | 技术栈名称，按设计规格 3.2 不翻译 |
| `Sharp` | 技术栈名称，按设计规格 3.2 不翻译 |
| `SQLite` | 技术栈名称，按设计规格 3.2 不翻译 |
| `Tailwind CSS` | 技术栈名称，按设计规格 3.2 不翻译 |
| `Twitter` | 平台名，按设计规格 3.2 不翻译 |
| `TypeScript` | 技术栈名称，按设计规格 3.2 不翻译 |
| `Vite` | 技术栈名称，按设计规格 3.2 不翻译 |

### `src/components/Cropper.tsx`

所在界面：区域截图裁剪器

| 保留的原文 | 理由 |
|---|---|
| `ESC` | 键盘按键名，按设计规格 3.2 不翻译 |

### `src/components/FollowUpEmailModal.tsx`

所在界面：会后跟进邮件

| 保留的原文 | 理由 |
|---|---|
| `Gmail` | 产品名，按设计规格 3.2 不翻译 |

### `src/components/LocalWhisperModelPanel.tsx`

所在界面：设置 → 音频 → 本地 Whisper 模型

| 保留的原文 | 理由 |
|---|---|
| `Apple Silicon` | Apple 芯片平台名，按设计规格 3.2 不翻译 |

### `src/components/NativelyInterface.tsx`

所在界面：会议进行中的主界面

| 保留的原文 | 理由 |
|---|---|
| `## STT Diagnostic Report` | 复制到剪贴板的诊断报告标题，供上游维护者排错，整份报告保持英文 |
| `Gemini 3.1 Flash Lite` | 模型名，按设计规格 3.2 不翻译 |
| `Gemini 3.1 Pro` | 模型名，按设计规格 3.2 不翻译 |
| `Gemini 3.5 Flash` | 模型名，按设计规格 3.2 不翻译 |
| `GPT 5.4` | 模型名，按设计规格 3.2 不翻译 |
| `Groq Llama 3.3` | 模型名，按设计规格 3.2 不翻译 |
| `Shift` | 键盘按键名，按设计规格 3.2 不翻译 |
| `Sonnet 4.6` | 模型名，按设计规格 3.2 不翻译 |

### `src/components/NativelyInterfaceCard.tsx`

所在界面：（未标注页面）

| 保留的原文 | 理由 |
|---|---|
| `Natively AI` | 产品名，按设计规格 3.2 不翻译 |

### `src/components/ProfileIntelligenceSettings.tsx`

所在界面：画像智能

| 保留的原文 | 理由 |
|---|---|
| `Pro` | 产品档位名，按设计规格 3.2 不翻译（Pro 功能徽标） |
| `tvly-` | Tavily API Key 的固定前缀，用户需据此核对自己的密钥 |

### `src/components/SettingsOverlay.tsx`

所在界面：设置总览（侧栏、通用、主题、语言、快捷键、音频、日历）

| 保留的原文 | 理由 |
|---|---|
| `~/Documents/natively_debug.log` | 真实日志文件路径，用户要照此定位文件 |
| `Azure Speech` | 语音识别供应商与产品名，按设计规格 3.2 不翻译 |
| `Deepgram Nova-3` | 语音识别供应商与产品名，按设计规格 3.2 不翻译 |
| `e.g. eastus` | Azure 区域 ID 示例，必须照原样填写 |
| `e.g. eastus, westeurope, westus2` | Azure 区域 ID 列表，必须照原样填写 |
| `ElevenLabs Scribe` | 语音识别供应商与产品名，按设计规格 3.2 不翻译 |
| `English` | 界面语言选项以该语言自身的名称显示，与「简体中文」同理，不译 |
| `Gemini 3 Flash` | 模型名，按设计规格 3.2 不翻译 |
| `Google Cloud` | 语音识别供应商与产品名，按设计规格 3.2 不翻译 |
| `Groq Whisper` | 语音识别供应商与产品名，按设计规格 3.2 不翻译 |
| `IBM Watson` | 语音识别供应商与产品名，按设计规格 3.2 不翻译 |
| `Local Whisper` | 语音识别供应商与产品名，按设计规格 3.2 不翻译 |
| `Natively` | 产品名，按设计规格 3.2 不翻译 |
| `Natively API` | 产品名，按设计规格 3.2 不翻译 |
| `Natively Pro` | 产品名，按设计规格 3.2 不翻译 |
| `OpenAI Whisper` | 语音识别供应商与产品名，按设计规格 3.2 不翻译 |
| `Soniox` | 语音识别供应商与产品名，按设计规格 3.2 不翻译 |

### `src/components/StartupSequence.tsx`

所在界面：首次启动欢迎页

| 保留的原文 | 理由 |
|---|---|
| `AlternativeTo` | 媒体平台名，按设计规格 3.2 不翻译 |
| `Hacker News` | 媒体平台名，按设计规格 3.2 不翻译 |
| `Product Hunt` | 媒体平台名，按设计规格 3.2 不翻译 |
| `reddit` | 媒体平台名，按设计规格 3.2 不翻译 |

### `src/components/UpdateBanner.tsx`

所在界面：更新横幅

| 保留的原文 | 理由 |
|---|---|
| `UI Test` | 开发期 UI 自测用的假更新说明，不出现在正式发行版 |

### `src/components/UpdateModal.tsx`

所在界面：更新弹窗

| 保留的原文 | 理由 |
|---|---|
| `Latest` | 版本号无法解析时的兜底展示值，与 GitHub releases 的 latest 标签对应 |
| `xattr -cr /Applications/Natively.app` | 可复制执行的终端命令，翻译即失效 |

### `src/components/dynamic-actions/DynamicActionCard.tsx`

所在界面：动态动作卡片

| 保留的原文 | 理由 |
|---|---|
| `Tab` | 键盘按键名，按设计规格 3.2 不翻译 |

### `src/components/onboarding/PermissionsOnboardingFull.tsx`

所在界面：完整权限引导

| 保留的原文 | 理由 |
|---|---|
| `1Password` | 系统设置面板示意图里的第三方应用名，按设计规格 3.2 不翻译 |
| `Google Chrome` | 系统设置面板示意图里的第三方应用名，按设计规格 3.2 不翻译 |
| `Natively` | 产品名，按设计规格 3.2 不翻译 |
| `Slack` | 系统设置面板示意图里的第三方应用名，按设计规格 3.2 不翻译 |
| `zoom` | 系统设置面板示意图里的第三方应用名，按设计规格 3.2 不翻译 |

### `src/components/onboarding/PermissionsToaster.tsx`

所在界面：权限提示浮层

| 保留的原文 | 理由 |
|---|---|
| `Natively` | 产品名，按设计规格 3.2 不翻译 |

### `src/components/settings/AIProvidersSettings.tsx`

所在界面：设置 → AI 供应商

| 保留的原文 | 理由 |
|---|---|
| `"model": "llama3", "prompt": "` | Ollama 示例请求体的 API 字段，按设计规格 3.2 不翻译 |
| `{{IMAGE_BASE64}}` | cURL 模板变量名，必须与实现一致 |
| `{{TEXT}}` | cURL 模板变量名，必须与实现一致 |
| `codex` | 可执行文件名占位示例，用户需照原样填写命令名 |
| `curl http://localhost:11434/api/generate -d '` | Ollama 示例命令，可复制执行，翻译即失效 |
| `curl https://api.openai.com/v1/chat/completions ... "content": "{{TEXT…` | cURL 命令占位示例，用户要照此格式填写，翻译即失效 |
| `curl https://api.openai.com/v1/chat/completions \ ⏎   -H "Content-Type…` | OpenAI 兼容示例命令，可复制执行，含 API 字段与示例 prompt，整段保持原文 |
| `default` | Codex 服务层级的 API 取值，翻译会导致填错 |
| `e.g. choices[0].message.content` | JSON 路径示例，是 API 响应的真实字段路径 |
| `gpt-5.3-codex-spark` | 模型 ID，按设计规格 3.2 不翻译 |
| `gpt-5.5` | 模型 ID，按设计规格 3.2 不翻译 |
| `messages` | OpenAI 请求体字段名，按设计规格 3.2 不翻译 |

### `src/components/settings/HelpSettings.tsx`

所在界面：（未标注页面）

| 保留的原文 | 理由 |
|---|---|
| `"Authorization: Bearer YOUR_KEY"` | HTTP 请求头示例，必须照原样填写 |
| `&lt;user_context&gt;` | 注入到 prompt 的 XML 标签名，必须与实现一致 |
| `+Shift+Arrows` | 键盘快捷键组合，按设计规格 3.2 不翻译 |
| `AI` | 通用技术缩写，中文界面同样使用 |
| `AIzaSy...` | API Key 前缀示例，用户需据此核对自己的密钥 |
| `Anthropic` | 供应商 / 产品名，按设计规格 3.2 不翻译 |
| `Azure Speech` | 供应商 / 产品名，按设计规格 3.2 不翻译 |
| `choices[0].message.content` | JSON 响应路径，必须与 API 结构一致 |
| `claude-3-5-sonnet` | 模型 ID，按设计规格 3.2 不翻译 |
| `claude-4.6-sonnet` | 模型 ID，按设计规格 3.2 不翻译 |
| `Cmd` | 键盘按键名，按设计规格 3.2 不翻译 |
| `Cmd+K` | 键盘快捷键，按设计规格 3.2 不翻译 |
| `CoreAudio (Legacy)` | Apple 框架名，按设计规格 3.2 不翻译 |
| `Ctrl` | 键盘按键名，按设计规格 3.2 不翻译 |
| `Ctrl+K` | 键盘快捷键，按设计规格 3.2 不翻译 |
| `curl` | 可复制执行的命令，翻译即失效 |
| `Deepgram Nova-3` | 供应商 / 产品名，按设计规格 3.2 不翻译 |
| `eastus` | Azure 区域 ID，必须照原样填写 |
| `en-GB` | BCP 47 语言地区代码，必须照原样选择 |
| `en-IN` | BCP 47 语言地区代码，必须照原样选择 |
| `en-US` | BCP 47 语言地区代码，必须照原样选择 |
| `Enter` | 键盘按键名，按设计规格 3.2 不翻译 |
| `Gemini 3.1 Flash` | 模型 ID，按设计规格 3.2 不翻译 |
| `gemini-3.1-pro` | 模型 ID，按设计规格 3.2 不翻译 |
| `Google Cloud` | 供应商 / 产品名，按设计规格 3.2 不翻译 |
| `Google Gemini` | 供应商 / 产品名，按设计规格 3.2 不翻译 |
| `gpt-5.4` | 模型 ID，按设计规格 3.2 不翻译 |
| `gpt-5.4-mini` | 模型 ID，按设计规格 3.2 不翻译 |
| `Groq` | 供应商 / 产品名，按设计规格 3.2 不翻译 |
| `Groq Whisper` | 供应商 / 产品名，按设计规格 3.2 不翻译 |
| `gsk_` | API Key 前缀示例，用户需据此核对自己的密钥 |
| `gsk_...` | API Key 前缀示例，用户需据此核对自己的密钥 |
| `gsk_a8B2c...` | API Key 前缀示例，用户需据此核对自己的密钥 |
| `IBM Watson` | 供应商 / 产品名，按设计规格 3.2 不翻译 |
| `llama-3.3-70b-versatile` | 模型 ID，按设计规格 3.2 不翻译 |
| `llama3:8b` | 模型 ID，按设计规格 3.2 不翻译 |
| `Natively` | 供应商 / 产品名，按设计规格 3.2 不翻译 |
| `Natively API` | 供应商 / 产品名，按设计规格 3.2 不翻译 |
| `ollama run llama3:8b` | 可复制执行的命令，翻译即失效 |
| `ollama run phi3` | 可复制执行的命令，翻译即失效 |
| `OpenAI` | 供应商 / 产品名，按设计规格 3.2 不翻译 |
| `ScreenCaptureKit (SCK)` | Apple 框架名，按设计规格 3.2 不翻译 |
| `sk-` | API Key 前缀示例，用户需据此核对自己的密钥 |
| `sk-ant-...` | API Key 前缀示例，用户需据此核对自己的密钥 |
| `sk-proj-...` | API Key 前缀示例，用户需据此核对自己的密钥 |
| `Soniox` | 供应商 / 产品名，按设计规格 3.2 不翻译 |
| `Stripe Payment Intents` | 供应商 / 产品名，按设计规格 3.2 不翻译 |
| `westeurope` | Azure 区域 ID，必须照原样填写 |

### `src/components/settings/NativelyApiSettings.tsx`

所在界面：设置 → Natively API

| 保留的原文 | 理由 |
|---|---|
| `AI` | 通用技术缩写，中文界面同样使用 |
| `INSIDER20` | 促销码，必须照原样输入才能生效 |
| `Natively API` | 产品名，按设计规格 3.2 不翻译 |
| `natively_api_...` | API Key 的格式示例，用户需据此识别自己的密钥 |
| `natively.contact@gmail.com` | 真实联系邮箱，按设计规格 3.2 不翻译 |
| `STT` | 语音识别的通用技术缩写，配额徽标空间狭小 |

### `src/components/settings/NativelyProSettings.tsx`

所在界面：设置 → Natively Pro

| 保留的原文 | 理由 |
|---|---|
| `AI` | 示意插画中央节点的缩写，中文界面同样使用 AI |
| `INSIDER20` | 促销码，必须照原样输入才能生效 |
| `natively.contact@gmail.com` | 真实联系邮箱，按设计规格 3.2 不翻译 |
| `Python` | 技术名词，按设计规格 3.2 不翻译；出现在示意插画的技能/要求列表里 |
| `React Native` | 技术名词，按设计规格 3.2 不翻译；出现在示意插画的技能/要求列表里 |
| `System Design` | 技术名词，按设计规格 3.2 不翻译；出现在示意插画的技能/要求列表里 |
| `TypeScript` | 技术名词，按设计规格 3.2 不翻译；出现在示意插画的技能/要求列表里 |

### `src/components/settings/Sidebar.tsx`

所在界面：高级设置侧栏

| 保留的原文 | 理由 |
|---|---|
| `Natively API` | 产品名，按设计规格 3.2 不翻译 |

### `src/components/trial/FreeTrialModal.tsx`

所在界面：免费试用弹窗

| 保留的原文 | 理由 |
|---|---|
| `Max` | 计划档位名，不翻译 |
| `Natively Pro` | 产品名，按设计规格 3.2 不翻译 |
| `Standard` | 计划档位名，不翻译 |
| `Ultra` | 计划档位名，不翻译 |

### `src/components/ui/KeyBadge.tsx`

所在界面：快捷键徽标（全局复用）

| 保留的原文 | 理由 |
|---|---|
| `Alt` | 键盘按键名，按设计规格 3.2 不翻译 |
| `Ctrl` | 键盘按键名，按设计规格 3.2 不翻译 |
| `Shift` | 键盘按键名，按设计规格 3.2 不翻译 |

### `src/components/ui/ModelSelector.tsx`

所在界面：（未标注页面）

| 保留的原文 | 理由 |
|---|---|
| `Gemini 3.1 Flash Lite` | 模型名，按设计规格 3.2 不翻译 |
| `Gemini 3.1 Pro` | 模型名，按设计规格 3.2 不翻译 |
| `Gemini 3.5 Flash` | 模型名，按设计规格 3.2 不翻译 |
| `GPT 5.4` | 模型名，按设计规格 3.2 不翻译 |
| `Groq Llama 3.3` | 模型名，按设计规格 3.2 不翻译 |
| `Sonnet 4.6` | 模型名，按设计规格 3.2 不翻译 |
