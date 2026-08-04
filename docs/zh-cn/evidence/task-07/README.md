# Task 7 运行时验证证据

日期：2026-08-04

## 验证方式：读取真实 DOM，而非截图

计划 Step 3 要求人工双语检查并保存截图。实际执行时改为
**通过 Chrome DevTools Protocol 读取渲染层真实 DOM 文本**，原因有两条：

1. **隐私**：全屏截图会连带捕获开发机上的其他窗口。首次尝试截图时抓到的是
   本机另一个应用的界面，含项目名与对话标题等私人内容，已立即删除、未入库。
2. **可靠性**：Natively 的窗口可能启用内容保护（截屏排除），截图未必能拍到；
   而 DOM 读取只涉及本应用自身，且给出可 diff 的文本证据。

探针脚本用完即删，不留在仓库中。原始输出见 `runtime-dom-zh.txt`。

## 环境障碍与解决

启动过程中遇到两个与本地化无关、但会完全阻断验证的环境问题：

### 1. `ELECTRON_RUN_AS_NODE=1`

终端环境预设了该变量，它让 `electron.exe` 退化为普通 Node 运行，
`require('electron')` 拿不到 `app`，主进程在模块初始化期即崩溃：

```
TypeError: Cannot read properties of undefined (reading 'isPackaged')
    at electron/WindowHelper.ts
```

排除该变量后 `app.whenReady()` 正常。**Task 15 打包与安装验证时必须同样清除此变量。**

### 2. 开发端口 5180 被占用

`npm run app:dev` 固定使用 5180 端口，而开发机上另一个项目
（`D:\Outgoing\GamePMer\...` 的 Vite）已占用该端口。Electron 因此加载了
**另一个应用的页面**——首次 DOM 读取返回的全是无关内容。

未去动用户的进程，改为**生产模式验证**：`npm run build` 后以
`NODE_ENV=production` 启动，渲染层从 `dist/index.html` 加载，
不依赖开发服务器。这也更接近 Task 15 的最终形态。

## 验证结果

五个渲染窗口全部就绪：launcher / model-selector / settings / overlay / cropper。

### 中文渲染确认

| 窗口 | 结果 |
|---|---|
| model-selector | 2/2 文本为中文：`尚未连接任何模型。` `请检查设置。` |
| launcher | Task 7 范围内文案已全部中文（见下） |

已确认渲染为中文的 Task 7 文案：

```
隐藏
我该怎么回答？
结合项目需求和当前时间线，我梳理了下个冲刺的关键路径。
追问澄清
后续问题
要点回顾
随便问 —— Natively 了解你的简历和这家公司…
```

### 静态扫描漏报，由运行时读取发现

`NativelyInterfaceCard.tsx` 的 `hotkeys` 是模块级对象数组：

```ts
const hotkeys = [{ label: "Recap", icon: <svg …/> }, …];
```

这些 `label` 最终原样渲染给用户，但既不是 JSX 文本也不是属性，
静态扫描全绿而运行时 DOM 里是英文。已为扫描器增加对象字面量
`label / title / placeholder / description / heading / tooltip / ariaLabel`
属性的检查（同样要求「像散文」，避免把 `{ label: 'gpt-4o' }` 这类模型 ID 误判）。

该规则随即在 `SettingsOverlay.tsx` 又发现 31 处，均纳入 Task 9 暂放名单。

### 剩余英文（均不在 Task 7 范围）

启动器当前显示首次启动引导页——中文构建使用独立 userData
（`%APPDATA%\natively-zh`），因此是全新配置：

```
Welcome to Natively / The ultimate AI meeting assistant / Continue
By clicking Continue, you agree to our / Terms & Conditions / Privacy Policy
Permissions / Real-time meeting assistant, always ready to help
```

以上属 **Task 11**（`StartupSequence.tsx`、权限引导）范围。
`Natively AI` 为产品名，已按设计规格 3.2 进入允许名单。
`Hacker News` / `Product Hunt` / `reddit` / `AlternativeTo` 为媒体专有名词。

## 已知问题，留待 Task 13

`body` 的字体栈仍是 Tailwind 默认值：

```
-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, …
```

**不含任何中文字体**，当前中文靠系统回退渲染。
Task 13 将按设计规格 §10 加入 `Microsoft YaHei UI` / `PingFang SC` / `Noto Sans CJK SC`。
