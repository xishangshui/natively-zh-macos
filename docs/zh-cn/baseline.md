# Natively ZH 构建基线证据

本文件记录简体中文本地化工作开始前，上游 v2.7.0 在本机的**原始可复现状态**。
后续所有汉化改动都以本文件为对照基准。

采集日期：2026-08-04
采集人：Claude Code（执行 `docs/superpowers/plans/2026-08-03-natively-zh-cn-implementation.md` Task 1）

---

## 1. 上游基线

| 项 | 值 |
|---|---|
| 仓库 | `https://github.com/Natively-AI-assistant/natively-cluely-ai-assistant.git` |
| 标签 | `v2.7.0` |
| 提交 | `be7280bf17f2de027b2cfde25551e46d89ca9d10` |
| 实现分支 | `feat/zh-cn-localization` |
| 克隆方式 | `git clone --branch v2.7.0 --single-branch` |
| 源码目录 | `D:\Natively-ZH-Source` |
| 计划安装目录 | `D:\Natively-ZH` |

提交哈希与实施计划要求逐字符一致，未混入 `main` 或其他标签。

## 2. 子模块状态

仓库含**两个** gitlink，与实施计划描述不完全一致：

| 路径 | gitlink 提交 | `.gitmodules` 映射 | 状态 |
|---|---|---|---|
| `premium` | `e9b60e9589bd55ba37e65f70ea9d4dcf05bc7713` | 有，指向私有 `natively-premium.git` | 未初始化（无权限） |
| `natively-api` | `d4f0600c9bf6f406c27f6d5b62df621ddbc39421` | **无映射** | 未初始化 |

两个目录均为空。因 `natively-api` 缺少映射，`git submodule status` 直接返回
`fatal: no submodule mapping found in .gitmodules for path 'natively-api'`。
这是上游打包缺陷，非权限问题。

按计划要求，本项目验收**公共 v2.7.0 的开源降级路径**，不复制已安装程序中的闭源产物。

受影响项：
- `package.json` 的 `test:e2e:screen-understanding` 引用 `natively-api/tests/`，该脚本无法运行。
- `electron/tsconfig.json` 的 `include` 含 `../premium/electron/**/*.ts`；TypeScript 对匹配不到文件的 glob 静默忽略，**不影响类型检查**。
- 部分单元测试依赖 `dist-electron/premium/**`，见第 6 节。

## 3. 工具链版本

| 工具 | 版本 | 位置 |
|---|---|---|
| Node.js | v20.20.2（LTS Iron） | `D:\Node20`（并存安装） |
| npm | 10.8.2 | 随 Node 20 |
| rustc | 1.97.1 (8bab26f4f 2026-07-14) | `D:\Rust` |
| cargo | 1.97.1 (c980f4866 2026-06-30) | `D:\Rust` |
| Python | 3.12.10 | 用户级安装 |
| MSVC | Visual Studio 生成工具 2022 17.14.37516.0 / 工具集 14.44.35207 | `D:\BuildTools` |
| Windows SDK | 10.0.22621.0 | C 盘默认位置 |
| git | 2.55.0.windows.2 | `D:\Git` |

### 3.1 环境搭建偏差（均可回退）

三项偏离默认安装位置的决定，理由与回退方式：

- **Node 20 并存而非替换**：本机原有 `D:\Node`（Node v26.5.0）供其他项目使用，未改动。
  Node 20 解压到 `D:\Node20`，仅在本项目构建命令中前置 PATH。回退＝删除 `D:\Node20`。
- **Rust 装到 D 盘**：设用户级环境变量 `CARGO_HOME=D:\Rust\cargo`、`RUSTUP_HOME=D:\Rust\rustup`。
  依据设计规格 §12.1「构建环境放在 D 盘独立目录」。回退＝删除 `D:\Rust` 并清除这两个变量。
- **Build Tools 装到 `D:\BuildTools`**：安装前 C 盘仅剩 12.78 GB，故用
  `--installPath D:\BuildTools`。共享组件与 Windows SDK 仍落在 C 盘。回退＝标准卸载。

### 3.2 Node 版本是硬性要求

本机原有 Node v26.5.0 **无法完成基线构建**：

```
npm warn EBADENGINE   package: 'better-sqlite3@12.6.2',
npm warn EBADENGINE   required: { node: '20.x || 22.x || 23.x || 24.x || 25.x' },
npm warn EBADENGINE   current: { node: 'v26.5.0', npm: '11.17.0' }
```

随后 `prebuild-install` 找不到 Node 26 的预编译产物，回退 `node-gyp rebuild` 并失败。
`postinstall` 中的 `scripts/rebuild-native-electron.js` 对 `better-sqlite3` 与 `keytar`
传入 `--build-from-source`，明确绕开预编译二进制，因此 MSVC 工具链亦为硬性要求，无法回避。

## 4. 磁盘空间

| 时点 | C 盘可用 | D 盘可用 |
|---|---|---|
| 开工前 | 12.78 GB | 33.35 GB |
| 基线完成后 | 5.89 GB | 23.79 GB |

⚠️ C 盘余量已偏低。Task 15 使用 electron-builder 打包时应将 `TEMP`/`TMP` 指向 D 盘，
避免临时解包耗尽系统盘。

## 5. 基线命令退出码

### 5.1 未修改上游源码时（Node 20 + 完整工具链）

| 命令 | 退出码 | 说明 |
|---|---|---|
| `npm ci` | 0 | 见 §5.3 告警 |
| `npm run build` | 0 | 通过 |
| `npm run build:electron` | 0 | 通过 |
| `npm run typecheck:electron` | **2** | 上游自带失败，见 §5.2 |
| `npm test` | **1** | 上游自带失败，见 §6 |
| `npm run build:native` | 0 | 通过，产出 `index.win32-x64-msvc.node` |

**结论：上游 v2.7.0 在本机的原始基线不是全绿的。**
两个红灯均在未修改任何源码时复现，与简体中文本地化无关。

### 5.2 typecheck 失败详情与修复

```
electron/main.ts(2976,7): error TS7011: Function expression, which lacks return-type
                                       annotation, implicitly has an 'any' return type.
electron/main.ts(2977,7): error TS7011: ...
```

`electron/tsconfig.json` 设 `noImplicitAny: true`，而 `reconfigureSttProvider()` 中
两个 `() => undefined` 回调缺返回类型标注。

经用户批准后修复（提交 `fix: 修复上游基线的类型检查与测试脚本`）：

```ts
this._sttReconfigureChain = run.then(
  (): void => undefined,
  (): void => undefined,
);
```

修复后 `npm run typecheck:electron` 退出码 **0**。此修复不改变任何运行时行为。

排除的假设：`premium` 子模块缺失**不是**成因——TypeScript 对 `include` 中匹配不到文件的
glob 静默忽略。

### 5.3 `npm ci` 非致命告警（上游现状，未处理）

- **`ensure-sqlite-vec` 在 Windows 必然告警**：脚本硬编码 `--pack-destination /tmp`，
  Windows 上解析为 `D:\tmp`（不存在），导致 `sqlite-vec-darwin-arm64` 与 `-darwin-x64`
  抓取失败。二者均为 macOS 专用可选依赖，对 Windows x64 构建无影响。
- **依赖漏洞 50 个**（5 low / 9 moderate / 33 high / 3 critical）：上游锁文件原始状态。
  **未执行 `npm audit fix`**——那会改动锁文件、偏离固定基线，且超出本次汉化范围。
- **peer 依赖冲突**：`ink@5.2.1` 要求 `react@^18.3.1`，项目使用 `react@19.2.6`，npm 已覆盖。

### 5.4 `build:native` 会重写已跟踪文件

`npm run build:native` 通过 napi 按当前平台重新生成绑定，导致两个**已跟踪**文件被修改：

```
 M native-module/index.d.ts   (-102 行)
 M native-module/index.js     (-3 行)
```

被删除的是 macOS 专用导出：`StealthKeyboardTap`、`applyStealthToWindow`、
`isAccessibilityGranted`。原因是 Windows 编译产物中本就不含这些符号，属 napi 的自动结果。

处理方式：每次 `build:native` 后执行 `git checkout -- native-module/` 还原。
还原是安全的——`module.exports.X = nativeBinding.X` 在符号不存在时仅赋 `undefined`，不抛错，
这也正是上游在 Windows 上的原本状态。

> 依据 `CLAUDE.md`：本项目不增加、强化或调试隐藏窗口、进程伪装、规避检测能力。
> 上述文件不做任何人为改动，仅还原至上游提交状态。

## 6. 单元测试基线

### 6.1 测试脚本在 Windows 上无法运行（已修复）

上游 `test` 脚本用 POSIX 单引号包裹 glob：

```
node --test 'electron/services/__tests__/**/*.test.mjs' ...
```

npm 在 Windows 经 cmd.exe 执行，单引号不被剥离，node 收到带引号的字面路径：

```
Could not find 'D:\Natively-ZH-Source\'electron\services\__tests__\**\*.test.mjs''
```

**结果是一个测试都没有执行**，`npm test` 却以失败退出，掩盖了真实测试状态。

另有 `OpenAIRealtimeGAProtocol.test.mjs` 泄漏未清理的定时器与 stub 句柄，
测试跑完后进程不退出，导致套件永久挂起（实测停滞 8 分钟，CPU 近零）。

经用户批准后修复为跨平台写法：

```
node --test --test-force-exit --test-timeout=60000 electron/services/__tests__ ...
```

`--test-force-exit` 解决句柄泄漏导致的挂起；`--test-timeout=60000` 为兜底
（实测未触发任何超时，不会误伤）。传目录而非 glob，避免 shell 引号差异。

### 6.2 真实测试基线（修复脚本后）

| 指标 | 数量 |
|---|---|
| tests | 2243 |
| pass | 2079 |
| **fail** | **82** |
| cancelled | 2 |
| skipped | 80 |
| suites | 352 |

完整失败清单见 `docs/zh-cn/baseline-test-failures.tsv`（88 条唯一记录，含嵌套子测试）。

### 6.3 失败根因分类（全部为上游既有问题）

| 根因 | 约计 | 说明 |
|---|---|---|
| 私有 `premium` 子模块缺失 | 26 | 依赖 `dist-electron/premium/**`，无仓库权限，计划已预期 |
| 测试的 Windows 路径 bug | 19 | 见下 |
| OpenAI Realtime 协议源码/测试不一致 | 4–6 | 见下 |
| 其他杂项 | 余下 | `spawn UNKNOWN`、事件循环挂起断言等 |

**Windows 路径 bug**：`VisionProviderFallbackChain.test.mjs`、`ImageOptimizer.test.mjs` 等使用

```js
const __dirname = path.dirname(new URL(import.meta.url).pathname);
```

Windows 上 `new URL('file:///D:/...').pathname` 返回带前导斜杠的 `/D:/...`，
`path.resolve` 再按当前盘根解析，产生重复盘符：

```
Cannot find module 'D:\D:\Natively-ZH-Source\dist-electron\...\VisionProviderFallbackChain.js'
```

正确写法是 `fileURLToPath()`（同目录 `OpenAIRealtimeGAProtocol.test.mjs` 即如此）。
**这是测试代码缺陷，非产品缺陷**；相关模块在 `dist-electron` 中均已正常编译存在，
这些测试在 macOS/Linux 上可通过。

**OpenAI Realtime 协议不一致**：`electron/audio/OpenAIStreamingSTT.ts:446` 为

```ts
type: 'session.update',
```

而 `OpenAIRealtimeGAProtocol.test.mjs:85-93` 断言必须是 `transcription_session.update`
且不得出现 `session.update`，并要求存在 `input_audio_format: 'pcm16'`（源码中不存在）。
测试按 GA 协议编写，实现仍为 beta 写法。

**本项目不修复此项。** 该文件属实时语音识别线路协议，与本地化无关；且中文语音识别是
Task 15 的核心验收项，在不明确上游意图的情况下改动协议字符串存在破坏识别链路的风险。

### 6.4 后续任务的测试判定标准

由于上游基线本身存在 82 个失败，**不以"全绿"作为后续任务的通过条件**，改为：

1. 后续每次 `npm test` 的失败集合必须是 `baseline-test-failures.tsv` 的**子集**；
2. 不允许出现任何**新增**失败；
3. 本项目新增的测试（i18n 词典完整性、覆盖扫描、LocaleManager、IPC 等）必须**全部通过**。

## 7. 正式安装完整性

汉化工作开始前对 `D:\Natively` 的只读快照，用于 Task 15 证明原版未被改动：

| 项 | 值 |
|---|---|
| 快照时间 | 2026-08-04T00:03:14+08:00 |
| 文件数 | 507 |
| 总字节 | 2,265,499,838 |
| 最后写入 | 2026-06-18T03:13:50+08:00 |
| `Natively.exe` SHA-256 | `29E3E590D4452A7109B690EA664C1C9CB3900E54B5107C29213BD9C60007BB56` |
| `resources\app.asar` SHA-256 | `5A5449E14BD86BC14F8505E49D1880406340022390C2A38C36AE68335F0B5807` |

全程未对 `D:\Natively` 及原版用户数据目录执行任何写入。

## 8. 中文语音能力核验

设计规格 §2.2 所述能力已在源码中核实存在（`electron/config/languages.ts`）：

```ts
'chinese': { label: 'Chinese (Simplified)', code: 'chinese', bcp47: 'zh-CN', iso639: 'zh', group: 'Chinese' }
```

AI 回复语言列表含 `{ label: 'Chinese', code: 'Chinese' }`。
`SUPPORTED_LOCALES` 含 `'zh-CN'`。规格描述准确。

## 9. 基线阶段对源码的改动

仅两处，均经用户明确批准，与本地化完全隔离，独立成一个 `fix:` 提交：

| 文件 | 改动 | 目的 |
|---|---|---|
| `electron/main.ts:2976-2977` | 两个回调加 `: void` 返回类型标注 | 修复 TS7011，使 typecheck 转绿 |
| `package.json` `scripts.test` | glob 改目录 + 加 `--test-force-exit --test-timeout` | 使测试能在 Windows 上真正运行并终止 |

两处均不改变运行时行为。
