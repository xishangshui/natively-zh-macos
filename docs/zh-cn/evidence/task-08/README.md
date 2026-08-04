# Task 8 运行时验证证据

日期：2026-08-04
范围：`NativelyInterface.tsx`（会议进行中的主界面）迁移收尾，共 95 处文案。

## 验证方式

沿用 Task 7 的做法：**通过 Chrome DevTools Protocol 读取渲染层真实 DOM 文本**，
不用截图。理由见 `../task-07/README.md` §「验证方式」——截图会连带捕获开发机上的
其他窗口（含私人内容），且 Natively 窗口可能启用内容保护。

探针脚本放在项目目录内（`ws` 是本项目依赖），用完即删，未入库。

启动方式（生产模式，避开被占用的 5180 开发端口）：

```powershell
Remove-Item env:ELECTRON_RUN_AS_NODE
npm run build; npm run build:electron
$env:NODE_ENV='production'
Start-Process electron.exe -ArgumentList '.','--remote-debugging-port=9411' -WindowStyle Hidden
```

## 结果

原始输出：

| 文件 | 内容 |
|---|---|
| `runtime-dom-zh.txt` | zh-CN 首帧，五个渲染窗口的全部可见文本与 title/aria-label/alt |
| `runtime-overlay-en.txt` | 切到 en-US 后 overlay 窗口的按钮与 title |
| `runtime-overlay-zh-after-switch.txt` | 再切回 zh-CN 后的同一组文案 |

### overlay 窗口（Task 8 目标）零残留英文

zh-CN 首帧实际渲染：

```
语音识别未配置
转写功能尚未配置
尚未选择语音识别供应商。打开「设置 → 音频」选择一个。
打开设置
我该怎么回答？  追问澄清  要点回顾  后续问题  回答
询问屏幕内容或对话，或按 [Ctrl][Shift] 进行区域截图
@title: 打开音频设置选择一个供应商
@title: 忽略
```

`Gemini 3.1 Flash Lite` 是模型名，按设计规格 3.2 保持原文，已在允许名单中。

### 中英实时切换双向确认

同一个 overlay 窗口，调用 `setUiLocale` 后不重启、不刷新：

| zh-CN | en-US | 切回 zh-CN |
|---|---|---|
| 隐藏 | Hide | 隐藏 |
| 打开设置 | Open Settings | 打开设置 |
| 我该怎么回答？ | What to answer? | 我该怎么回答？ |
| 追问澄清 | Clarify | 追问澄清 |
| 要点回顾 | Recap | 要点回顾 |
| 后续问题 | Follow Up Question | 后续问题 |
| 回答 | Answer | 回答 |
| @title 打开音频设置选择一个供应商 | Open Audio settings to select a provider | 打开音频设置选择一个供应商 |
| @title 忽略 | Dismiss | 忽略 |

`Trans` 组件渲染的快捷键提示在两种语言下徽标位置都正确
（中文「…，或按 <键> 进行区域截图」，英文「…, or <keys> for selective screenshot」）。

## 运行时发现的问题（静态扫描无法发现）

### Radix Toast 视口的内置 aria-label —— 留给 Task 14

五个窗口全部含：

```
@aria-label: Notifications (F8)
```

来源不是项目源码，而是 `@radix-ui/react-toast` 的 `Viewport` 默认 `label` prop
（默认值 `"Notifications ({hotkey})"`）。因此 `check-i18n-coverage.mjs` 天然扫不到——
它只扫项目源码，不扫 node_modules。

修法是在 `src/App.tsx` 的 `<ToastViewport />` 上显式传 `label`。
**本任务不改**：`App.tsx` 属于 Task 5 已完成范围，这类第三方库默认值是
Task 14「清零用户可见残留英文」的典型对象，已登记在 `CONTINUE-HERE.md` §6。

## 因本次迁移而转红的上游测试（已修复，非跳过）

两个上游测试用**英文字面量**作为「结构未被回退」的锚点，文案迁走后必然转红：

| 测试 | 原锚点 | 新锚点 |
|---|---|---|
| `AudioWarningDeepLinksToSystemSettings.test.mjs` | `'Open Mic Settings'` / `'Open Screen Settings'` 字面量 | `meeting:permissions.openMicSettings` / `openScreenSettings` 两个语义键 |
| `TccRepairButtonAndIpc.test.mjs` | `Repair Permissions` 字面量 | `meeting:permissions.repair` 语义键 |

两处都**保留了原有的结构断言**（通道感知的标签切换、`{isMac &&` 包裹），
并**新增**了词典断言：两种语言都必须定义该键且非空，mic/screen 两个键的值必须互不相同。
断言强度不降反升——既守结构，也守用户可见文案不为空、不退化成同一句话。

同文件的 NEGATIVE 用例（`'Open Settings'` 直连 `toggleSettingsWindow` 无守卫）
本来会因为源码里已无该字面量而**空转通过**，一并把锚点改成 `common:actions.openSettings`，
恢复其守护能力。

## 验证命令与结果

| 命令 | 结果 |
|---|---|
| `npm run test:i18n` | 30/30 通过 |
| `npm run check:i18n` | 通过，20 个文件在门禁范围内，零残留 |
| `npm run build` | 通过（需 `GOMAXPROCS`，见下） |
| `npm run build:electron` | 通过 |
| `npm run typecheck:electron` | 通过 |
| `npm test` | fail 82 / 88 条唯一记录，**与基线逐条一致，双向零差异** |

## 环境障碍：系统提交内存耗尽

`npm run build` 与 `npm run build:electron` 多次以
`write ENOMEM` / `VirtualAlloc failed with errno=1455`（ERROR_COMMITMENT_LIMIT）
/ 进程 `0xC0000005` 失败。

本机 16 GB 物理内存 + 15 GB 页面文件 = 31 GB 提交上限，
而开发机同时运行 VS Code（5.3 GB）、Chrome、ChatGPT、Telegram 等，
可用提交量一度只剩 850 MB。esbuild 是 Go 程序，`bundle: true` 下同时处理
`electron/**` 全部入口，峰值内存需求超过余量。

**未去动用户的进程**（`CONTINUE-HERE.md` §2 明确禁止）。绕法是限制 esbuild 并行度：

```powershell
$env:GOMAXPROCS='1'   # 或 '2'
```

renderer 构建在 `GOMAXPROCS=2` 下通过，`build:electron` 需要 `=1` 且重试一次。
Task 15 的 `electron-builder` 打包内存需求更高，见 `CONTINUE-HERE.md` §2 的记录。
