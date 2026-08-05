# 新会话接手指南

最后更新：2026-08-05
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

**Task 1–15 的代码与文档部分全部完成。** 工作树 clean。

计划复选框：**69/75**。未勾的 6 个都是**必须人工在真机上做**的验收，
不是代码遗漏：

| 未勾项 | 为什么不能自动化 |
|---|---|
| Task 13 Step 4（多缩放视觉验收） | 需真机目视检查三档缩放 |
| Task 15 Step 3（安装到 `D:\Natively-ZH`） | NSIS 是交互式安装 |
| Task 15 Step 4（界面验收矩阵） | 需真机目视 |
| Task 15 Step 5（中文语音与 AI 回复） | 需飞书 + 有效云端密钥 |
| Task 15 Step 6（更新与回退） | 需实际安装后验证 |
| Task 15 Step 7（提交证据并打标签） | 等上面几项回填后再打 |

待办清单在 `evidence/task-15/manual-qa.md`，逐项留空待回填。
执行顺序按 `release-checklist.md` 第 5–8 节。

### 交付物现状

| 项 | 状态 |
|---|---|
| 安装包 | `release\Natively-ZH-Setup-2.7.0-zh.1.exe`（619.5 MB，不入库） |
| SHA-256 | `6DE9EC4FB15B7E0542D9D8FBC0B92EDF33C717A4E0D76960B5D705D6B1E01221` |
| 门禁范围 | `src/` 下全部 57 个 `.tsx`，零残留、零过期条目 |
| 词典 | 中英各 10 个 namespace，约 1400 个键 |
| allowlist | 153 条，全部永久性，**无暂放条目** |
| 文档 | `release-checklist.md`、`rollback.md`、`i18n-allowlist.md`、四份 evidence |

### 三条已知限制（详见 `evidence/task-15/build-manifest.txt`）

1. **exe 嵌入元数据仍是 Electron 默认值。** rcedit 在 winCodeSign 包里，
   该包含 macOS 符号链接，Windows 上创建符号链接需管理员权限或开发者模式，
   本机都不满足。用 `--config.win.signAndEditExecutable=false` 绕过完成打包。
   影响仅限 exe 图标与版本资源，安装包身份与数据隔离都正常。
   **修复只需一次管理员权限的重跑。**
2. **上游 `package.json` 的 `react-query` 别名缺 `npm:` 前缀**，是死代码且
   阻塞打包，已删除（非本地化改动，已记录）。
3. **C 盘余量低**，打包必须把 `TEMP`/`TMP`/`ELECTRON_BUILDER_CACHE`
   指向 D 盘。

### 迁移过程中沉淀的坑（后续维护或合并上游时会再遇到）

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

**5. 局部变量遮蔽翻译函数。** HelpSettings 里有个
`const t = {颜色表}`，导致同作用域后续的 `t('...')` 拿到颜色对象，
`tsc` 报「表达式不可调用」。AIProvidersSettings 里也有 `.map(t => ...)`。
**注入 hook 前先 grep 该文件有没有别的 `t` 绑定。**

**6. 模块作用域的数据表用不了 hook。** `PLANS`、`MOCK_BUTTONS` 这类
`as const` 数组在模块求值期就固定了。做法是字段里存**词典键**
（`labelKey` / `descriptionKey`），渲染时再 `t()`。同时注意：如果某字段
既是显示文案又被当判别器（如 `plan.name === 'Pro'` 决定配色），
就必须保留原值，只在展示层翻译。

**7. 给多行类型注解的函数注入 hook 要认准函数体。**
`function X({ a }: {` 行尾的 `{` 是类型字面量的开始，不是函数体。
误插会产生几十个语法错误。正确锚点是类型注解闭合后的 `}) {`。

顺带两条：`t('updates.checking')` 少了命名空间分隔符会去查
`common:updates.checking`（defaultNS 是 common），必须写 `t('updates:status.checking')`。
词典键名规范要求**至少一层点号**，顶层扁平键（如 `checking`）会被门禁拒绝。

### 门禁现在是三道，不是两道

`npm run check:i18n` 依次跑：

1. `check-i18n-catalogs.mjs` —— 中英键集合、插值变量、键名规范、非空值
2. `check-i18n-coverage.mjs` —— 残留英文扫描 + allowlist 过期检查
3. `check-i18n-key-refs.mjs` —— **源码引用的键是否真的存在**

第 3 道是本次新增的。前两道都不管「t() 引用了一个不存在的键」，
而这种情况会**静默回退成键名本身显示给用户**，是最容易漏的一类问题。
以点号结尾的静态前缀（模板字符串拼出的动态键）会跳过，静态检查无从判断。

另外 `npm run test:i18n` 现在是 44 项（词典 7 + 覆盖 30 + locale 格式化 7）。

### 提交历史

```
f011fc9  build: 产出 Windows x64 安装包并记录构建证据   Task 15（Step 2）
0afbb93  test: 门禁覆盖渲染层全部界面文件并冻结允许名单 Task 14（收尾）
ad9ac58  feat: 本地化帮助与配置指南                    Task 11（第 2 批，收尾）
e06cee7  docs: 补充发布前检查清单与回退说明            Task 15（Step 1）
41202ad  fix: 修复 Radix Toast 视口的英文 aria-label   Task 14（部分）
e50700b  feat: 本地化 Electron 托盘与原生文案          Task 12
2efd008  fix: 加入中文字体栈并统一 locale 格式化        Task 13（Step 1–3）
7b6eaad  feat: 本地化首次启动、权限引导、试用与更新界面 Task 11（第 1 批）
8d59d0b  feat: 本地化会议详情、画像智能与截图裁剪器     Task 10
243ac8f  feat: 本地化 Natively API 与 Pro 订阅页       Task 9（第 2 批）
1980cea  docs: 记录 Task 9 第 1 批进度与四个迁移陷阱
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

`scripts/i18n-allowlist.json` 当前 **153 条，全部永久，无暂放条目**：
产品名与供应商名、模型 ID、API 字段、可执行命令、密钥前缀、
键盘按键名、语言地区代码、云区域 ID、真实联系方式、技术栈名。

人工审查清单由 `scripts/gen-i18n-allowlist-doc.mjs` 生成到
`docs/zh-cn/i18n-allowlist.md`——**刻意从数据源生成而不是手写**，
手写的文档一定会和名单漂移。改名单后重新跑一次即可。

**过期条目会导致门禁失败**——这是有意设计，防止名单膨胀成挡箭牌。
因此**不要给尚未纳入 scope 的文件提前加条目**。
反过来也要注意：把某处文案改成插值实参后，原先的 allowlist 条目会变成
过期（扫描器不再报告它），必须一并删掉——本项目在 SettingsOverlay 与
HelpSettings 上各遇到过一次。

---

## 6. 剩余工作：只剩人工验收

代码与文档已全部完成。剩下的全部是**必须在真机上做**的验收，
清单在 `evidence/task-15/manual-qa.md`，执行顺序按
`release-checklist.md` 第 5–8 节。

### 立即要做

1. **装一遍安装包。** `release\Natively-ZH-Setup-2.7.0-zh.1.exe`，
   安装时**显式选择** `D:\Natively-ZH`。装前装后各记一次 `D:\Natively`
   的最后修改时间，确认未变。
2. **三档缩放的界面矩阵**（100% / 125% / 150%）。重点看中文换行后
   按钮是否变形、侧栏是否被挤窄、长句是否截断。
3. **中文语音双通道 + AI 中文回复。** 需要飞书或等价软件、不含客户信息的
   普通话测试材料，以及有效的云端密钥。
   **密钥无效时记为「外部依赖未通过」，不要写成本地化失败或成功。**
4. **更新与回退。** 应用跑够 10 秒再退出，确认没有后台下载、没有退出时安装；
   然后按 `rollback.md` 走一遍。
5. 回填 `manual-qa.md`，提交，打标签 `natively-v2.7.0-zh.1`。

### 想让 exe 元数据也正确的话

当前 exe 的 `ProductName` 还是 `Electron`（原因见 §3 已知限制 1）。
修法是**用管理员权限的终端**重跑一次打包，不加
`--config.win.signAndEditExecutable=false`：

```powershell
$env:TEMP='D:\zh-build-temp'; $env:TMP='D:\zh-build-temp'
$env:ELECTRON_BUILDER_CACHE='D:\zh-build-temp\eb-cache'
npx electron-builder --win nsis --x64
```

或者先打开 Windows「开发者模式」，之后普通权限也能创建符号链接。

### 迁移方法论（合并上游新版本时会再用到）

上游有若干测试拿**英文字面量**当「结构未被回退」的锚点
（如 `assert.match(src, /Repair Permissions/)`）。文案迁走后它们必然转红。
正确处理是**把锚点换成语义键、保留原结构断言、再补一条词典断言**
（该键在中英两侧都存在且非空），**不是**删断言。
本项目一共遇到 5 个实例：`evidence/task-08/README.md` 末节 2 个，
Task 9 第 1 批的提交信息里 3 个。

顺带注意：同类 NEGATIVE 用例（断言某英文字面量**不**出现）迁移后会变成
空转通过——也要一并换锚点，否则守护能力静默消失。

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
