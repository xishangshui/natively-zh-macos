# 新会话接手指南

最后更新：2026-08-04
分支：`feat/zh-cn-localization`
上游基线：tag `v2.7.0` / commit `be7280bf17f2de027b2cfde25551e46d89ca9d10`

本文件是**新会话的唯一入口**。读完这一份加上 `CLAUDE.md` 与实施计划即可接手，
不需要重新摸索环境。

---

## 1. 必读顺序

1. `CLAUDE.md`（交接包根目录，工作约束，优先级最高）
2. `docs/superpowers/plans/2026-08-03-natively-zh-cn-implementation.md`（15 任务实施计划）
3. 本文件
4. `docs/zh-cn/baseline.md`（上游基线证据与已知问题）

计划文件在交接包里：
`C:\Users\zhang ming\Documents\Codex\2026-08-03\b\outputs\natively-zh-handoff\`

---

## 2. 环境：不照做就跑不起来

开发源码在 `D:\Natively-ZH-Source`，**不是** `D:\Natively`。
后者是用户的正式安装，只读，任何情况下都不得写入。

### 每条构建命令前必须设置

```powershell
Remove-Item env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
$env:CARGO_HOME='D:\Rust\cargo'; $env:RUSTUP_HOME='D:\Rust\rustup'
$env:PATH="D:\Node20;D:\Rust\cargo\bin;$env:PATH"
Set-Location -LiteralPath 'D:\Natively-ZH-Source'
```

| 项 | 位置 | 说明 |
|---|---|---|
| Node | `D:\Node20`（v20.20.2） | 全局 `D:\Node` 是 v26，**不可用**：better-sqlite3 要求 20.x–25.x |
| Rust | `D:\Rust`（1.97.1 MSVC） | 需 `CARGO_HOME`/`RUSTUP_HOME` 环境变量 |
| MSVC | `D:\BuildTools`（14.44 + Win SDK 22621） | node-gyp 通过 vswhere 自动发现 |

### 四个必然踩到的坑

**`ELECTRON_RUN_AS_NODE=1` 预设在终端环境里。** 它让 `electron.exe` 退化成普通
Node，`require('electron')` 拿不到 `app`，主进程在模块初始化期崩溃。
启动应用前必须 `Remove-Item env:ELECTRON_RUN_AS_NODE`。

**`npm run build` 的第一步是 `rimraf dist dist-electron`。** 它会删掉
`build:electron` 的产物。正确顺序是 **先 `npm run build`，再 `npm run build:electron`**。
`npm test` 内部已自带 `build:electron`，不受影响。

**端口 5180 被用户的另一个项目占用**（`D:\Outgoing\GamePMer` 的 Vite）。
`npm run app:dev` 硬编码该端口，会导致 Electron 加载**别的应用的页面**。
**不要去动用户的进程**，改用生产模式验证：

```powershell
npm run build; npm run build:electron
$env:NODE_ENV='production'
Start-Process -FilePath 'D:\Natively-ZH-Source\node_modules\electron\dist\electron.exe' `
  -ArgumentList '.','--remote-debugging-port=9411' `
  -WorkingDirectory 'D:\Natively-ZH-Source' -WindowStyle Hidden
```

**系统提交内存会耗尽，构建随机崩。** 本机 16 GB 物理内存 + 15 GB 页面文件
＝ 31 GB 提交上限，而开发机常驻 VS Code（约 5.3 GB）、Chrome、ChatGPT、Telegram，
可用提交量常只剩 1 GB 上下。esbuild 是 Go 程序，`build-electron.js` 用
`bundle: true` 同时处理 `electron/**` 全部入口，峰值需求超过余量，表现为：

```
[vite:esbuild-transpile] The service was stopped: write ENOMEM
runtime: VirtualAlloc of 31072256 bytes failed with errno=1455   # ERROR_COMMITMENT_LIMIT
exit=-1073741819                                                 # 0xC0000005 访问违例
```

**不要去动用户的进程。** 限制 esbuild 并行度即可：

```powershell
$env:GOMAXPROCS='1'     # build:electron 需要 1；npm run build 用 2 也能过
```

实测 `npm run build` 在 `=2` 下通过，`build:electron` 在 `=1` 下需重试一次。
失败是随机的，取决于当时其他应用占了多少——**重试前先改 `GOMAXPROCS`，不要盲目重跑**。
Task 15 的 `electron-builder` 需求更高，届时可能仍不够。

### PowerShell 不可用于文本读写

本项目已因此两次损坏文件：

- `Get-Content` 默认按 ANSI 读 UTF-8，中文变乱码，写回即损坏
- 原生命令参数解析会在 `"` 处截断字符串，导致 `git commit -m` 收到残缺信息

**规则：凡涉及含中文或特殊字符的文本，一律用 Node 脚本或 Edit/Write 工具。**
提交信息写入文件后用 `git commit -F <文件>`。

---

## 3. 当前进度

已完成 Task 1–7、7.5、8，以及 **Task 9 的第 1 批**。共 15 个提交，工作树 clean。

计划复选框：**42/75**（Task 8 已勾完；Task 9 的 5 个尚未勾，因为 Task 9 未完）。

### Task 9 只做完了一半——接手第一件事就是做完它

第 1 批（提交 `666a29e`）迁移了 11 个文件并**删光了 225 条
`reason="migrated in Task 9"` 暂放条目**，词典新增 371 个键。

第 2 批**尚未开始**，剩两个文件、约 220 处：

| 文件 | 待迁移处数 |
|---|---|
| `src/components/settings/NativelyApiSettings.tsx` | 119 |
| `src/components/settings/NativelyProSettings.tsx` | 101 |

这两个文件**目前不在 `enforcedFiles` 里**（`i18n-scope.json` 的 `_progress`
已写明原因），所以门禁是绿的。做完第 2 批后必须把它们加回 `enforcedFiles`，
再勾 Task 9 的 5 个复选框。

`NativelyProSettings.tsx` 里有退款政策、邮箱、Device ID 等文案，
注意 `natively.contact@gmail.com` 属于联系方式，不翻译（进 allowlist）。

### 迁移过程中沉淀的四个坑（Task 10–14 会重复遇到）

**1. 字面量兼作样式判别器。** `badge === 'Saved'` 既是显示文案又决定绿色徽标配色。
直接把调用点换成译文会连带破坏配色。做法是把内部令牌降为小写
（`'saved'`，非散文，扫描器不报），显示时再查词典。
**迁移前先 grep 这个字面量有没有被 `===` 比较过。**

**2. placeholder 写成参数默认值会固化语言。**
`({ placeholder = "Select device" })` 在模块求值期就定死了，
必须改成运行时 `placeholder ?? t(...)`。

**3. 内部枚举带连字符，词典键名不允许。** `very-fast` / `very-high` 拼进
`t(\`x.\${enum}\`)` 会查不到键，**静默回退成键名本身显示给用户**。
用显式映射表，不要字符串拼接。

**4. 批量替换 JSX 属性必须带花括号。** 把 `title="X"` 机械替换成
`title=t('k')` 是语法错误（本次踩过，11 处）。正确是 `title={t('k')}`。
对象字面量里的 `label: t('k')` 不受影响。
**批量替换后一定跑 `npx tsc --noEmit`**——它是唯一能抓到这类错的门禁。

顺带一条：`t('updates.checking')` 少了命名空间分隔符会去查
`common:updates.checking`（defaultNS 是 common），必须写 `t('updates:status.checking')`。
另外词典键名规范要求**至少一层点号**，顶层扁平键（如 `checking`）会被门禁拒绝。

### 提交历史

```
666a29e  feat: 本地化设置总览与供应商配置              Task 9（第 1 批）
7a3d071  feat: 本地化会议主界面                        Task 8（收尾）
2ae27c9  docs: 补充新会话接手指南并修正门禁范围
8fda467  feat: 本地化会议聊天、建议浮层与跟进邮件      Task 8（部分）
3d23693  test: 加固残留英文扫描器，改用样式判别        Task 7.5（计划外插入）
32db19f  feat: 本地化启动器、窗口壳与模型选择          Task 7
9f36552  feat: 分离界面、语音识别与 AI 回复三类语言    Task 6
75391b1  feat: 在首帧渲染前完成渲染层语言初始化        Task 5
afd8048  feat: 实现界面语言的多窗口同步                Task 4
48b3454  fix: 让 i18n 的 settings 词典不被 .gitignore 吞掉
7f447e2  test: 建立中英文词典与残留英文双门禁          Task 3
b31167d  build: 隔离 Natively ZH 发行标识并禁用自动更新 Task 2
660cc92  docs: 记录 zh-CN 构建基线证据                Task 1
98e0040  fix: 修复上游基线的类型检查与测试脚本
```

---

## 4. 每个任务的验证流程

**不得跳过任何一步。** 顺序固定：

```powershell
# 1. 先扩 scope 触发红灯，确认扫描器确实抓到目标文案
npm run check:i18n

# 2. 迁移文案后
npm run test:i18n          # 词典 7 项 + 覆盖 30 项
npm run check:i18n         # 门禁零残留
npm run build              # 渲染层（会清空 dist-electron）
npm run build:electron     # 必须在 build 之后
npm run typecheck:electron
npm test                   # 全量回归，见下
```

### 全量测试的判定标准（关键）

上游基线自带 **82 个失败**（88 条唯一记录），原因见 `baseline.md`：
私有 `premium` 子模块缺失、测试自身的 Windows 路径 bug、
OpenAI Realtime 协议源码与测试不一致。**不要试图修它们。**

判定标准不是"全绿"，而是**失败集合必须与基线逐条一致**：

```powershell
# 把 npm test 输出 Tee 到日志后运行比对
$c=Get-Content $log
$rows=@()
for($i=0;$i -lt $c.Count;$i++){
  if($c[$i] -match '^\s*not ok \d+ - (.+)$'){
    $name=$matches[1].Trim(); $file=''
    for($j=$i;$j -lt [Math]::Min($i+8,$c.Count);$j++){
      if($c[$j] -match "location: '(.+?):\d+:\d+'"){ $file=Split-Path ($matches[1] -replace '\\\\','\') -Leaf; break }
    }
    if($file){ $rows += "$file`t$name" }
  }
}
$now = $rows | Sort-Object -Unique
$base = Get-Content 'docs/zh-cn/baseline-test-failures.tsv'
Compare-Object $base $now | Where-Object { $_.SideIndicator -eq '=>' }   # 必须为空
```

---

## 5. 残留英文门禁：设计与历史

`scripts/check-i18n-coverage.mjs` 经过五轮修正，每一轮都源于真实漏报。
**改动它之前请读完本节**，否则很可能退回已经解决过的问题。

### 核心判别器：`looksLikeStyling`

勘测全部 57 个 `.tsx` 发现「含空格的英文」共 **5728 处**，其中
**2518 处是 Tailwind 类名**，其余大量是 CSS 值、SVG 路径、`console.log`。

- 按语法位置逐个开白名单 → 永远追不完
- 默认拒绝 → allowlist 膨胀到数千条

真正的判别标准**不是位置，是「文案 vs 样式/代码」**。有了
`looksLikeStyling` 后噪声降到 1604，才敢把扫描位置放宽。

### 已覆盖的位置（每一类都有回归用例）

1. JSX 文本节点
2. JSX 表达式子节点（含 `||` / `??` / 三元）
3. 文本属性与组件 prop（`label` / `desc` / `badge` / `subtitle` 等，见 `TEXT_ATTRIBUTES`）
4. 对象字面量的同名属性（菜单、标签页数据表）
5. `alert` / `confirm` / `toast` / `set*Error|Message|Status|Title|Label` 实参
6. `return` 语句
7. 数组元素
8. 带插值的模板字符串

### 两条精度规则

- 调用实参与对象属性额外要求 `looksLikeProse`（含空格或首字母大写），
  否则 `setStatus('downloading')` 这类**状态机枚举值**会被误判——翻译它们会直接破坏逻辑
- `looksLikeStyling` 命中的一律排除

### allowlist 规则

`scripts/i18n-allowlist.json` 当前 234 条：

- **17 条永久**：产品名（Natively AI、Gmail）、模型名（GPT 5.4、Sonnet 4.6…）、
  键盘按键名（Tab、Shift）
- **225 条暂放**：全部标 `reason: "migrated in Task 9"`，
  是 `SettingsOverlay.tsx` 的存量，**Task 9 必须全部删除**

**过期条目会导致门禁失败**——这是有意设计，防止名单膨胀成挡箭牌。
因此**不要给尚未纳入 scope 的文件提前加条目**（本会话犯过这个错）。

---

## 6. 剩余工作

### 立即要做：Task 9 第 2 批

见 §3 的表格：`NativelyApiSettings.tsx`（119 处）与
`NativelyProSettings.tsx`（101 处）。做完后把两个文件加回 `enforcedFiles`，
勾 Task 9 的 5 个复选框，再进 Task 10。

门禁范围现含 30 个文件，allowlist 51 条（全部是永久性的产品名、模型名、
供应商名、API 字段、示例命令、按键名、区域 ID、日志路径）——
**已无任何暂放条目**。

**迁移中踩到的一类坑，Task 10–12 会反复遇到：**
上游有若干测试拿**英文字面量**当「结构未被回退」的锚点
（如 `assert.match(src, /Repair Permissions/)`）。文案迁走后它们必然转红。
正确处理是**把锚点换成语义键、保留原结构断言、再补一条词典断言**
（该键在中英两侧都存在且非空），**不是**删断言。
本次两个实例见 `evidence/task-08/README.md` 末节。
顺带注意：同类 NEGATIVE 用例（断言某英文字面量**不**出现）迁移后会变成
空转通过——也要一并换锚点，否则守护能力静默消失。

### Task 9–15

按计划执行。几个要点：

- **Task 9** 第 1 批已完成（含 `SettingsOverlay.tsx` 3194 行），
  225 条暂放 allowlist 已删光；剩两个文件见上
- **Task 12** 改 Electron 主进程托盘/对话框/数据库种子，风险最高，
  务必比对基线失败集合
- **Task 13** 字体栈目前**不含任何中文字体**（运行时实测为 Tailwind 默认值），
  按设计规格 §10 加 `Microsoft YaHei UI` / `PingFang SC` / `Noto Sans CJK SC`
- **Task 14** 必须处理一个静态扫描**永远扫不到**的残留：
  `@radix-ui/react-toast` 的 `Viewport` 默认 `label` 是 `"Notifications ({hotkey})"`，
  五个窗口的 DOM 里都有 `aria-label="Notifications (F8)"`。
  来源在 node_modules，不在项目源码。修法是给 `src/App.tsx` 的
  `<ToastViewport />` 显式传 `label`。运行时 DOM 读取才发现，见
  `evidence/task-08/README.md`
- **Task 15** 打包前记得清 `ELECTRON_RUN_AS_NODE`；C 盘余量偏低，
  建议把 `TEMP`/`TMP` 指向 D 盘；提交内存不足时先设 `GOMAXPROCS`（见 §2）

---

## 7. 运行时验证方法

计划要求截图存证，但本项目改用 **CDP 读取真实 DOM**，理由记录在
`docs/zh-cn/evidence/task-07/README.md`：

1. 全屏截图会连带捕获用户的私人窗口（本会话首次尝试即拍到无关内容，已删除未入库）
2. Natively 窗口可能启用内容保护，截图未必拍得到

做法：以生产模式带 `--remote-debugging-port=9411` 启动，
用 `ws` 连 `Runtime.evaluate` 读取 DOM 文本。探针脚本必须放在项目目录内
（`ws` 是项目依赖），用完即删。

**运行时验证抓到过静态分析完全漏掉的问题**（`hotkeys` 数组的 label
在 DOM 里是英文而门禁全绿），每个迁移任务都值得做一次。

---

## 8. 绝对不能做的事

摘自 `CLAUDE.md`，违反即为交付失败：

- 不得写入、覆盖、卸载 `D:\Natively` 及原版用户数据
- 不得增加、强化、调试或验证隐藏窗口、进程伪装、规避屏幕共享检测、反监考能力。
  对相关既有逻辑**只允许翻译用户可见文字**。
  注意：`npm run build:native` 会重新生成 `native-module/index.d.ts` 与 `index.js`，
  自动删掉 macOS 专用的 `StealthKeyboardTap` / `applyStealthToWindow` 导出。
  这是 napi 按 Windows 产物重生成的结果，**每次构建后 `git checkout -- native-module/` 还原**，
  不要把它写进提交
- 不得通过删除断言、扩大忽略范围或跳过测试取得绿色结果
- API Key、真实会议音频、用户数据库不得进入 Git、测试夹具或日志
