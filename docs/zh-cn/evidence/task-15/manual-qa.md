# Task 15 人工验收记录

日期：2026-08-05
构建：`Natively-ZH-Setup-2.7.0-zh.1.exe`
SHA-256：`6DE9EC4FB15B7E0542D9D8FBC0B92EDF33C717A4E0D76960B5D705D6B1E01221`

本文件记录**已完成**与**待人工执行**两部分。未执行的项目一律留空并标注原因，
不填「假定通过」。

---

## 已完成：自动化与运行时验证

### 门禁（全部通过）

| 项 | 结果 |
|---|---|
| `check:i18n` | 通过 —— 57 个文件在范围内，零残留、零过期条目、键引用全部命中 |
| `test:i18n` | 44 项通过 |
| `tsc --noEmit` | 通过 |
| `typecheck:electron` | 通过 |
| `build` / `build:electron` | 通过 |
| `build:native` | 通过，`index.win32-x64-msvc.node` 已验证 |
| `npm test` | 88 条唯一失败，与基线双向零差异 |

### 运行时 DOM 验证（CDP，非截图）

以生产模式带 `--remote-debugging-port=9411` 启动，遍历 5 个渲染窗口。
不用截图的理由见 `../task-07/README.md`：全屏截图会连带拍到开发机上的
私人窗口，且 Natively 窗口可能启用内容保护。

| 窗口 | 首帧语言 | Toast 视口 aria-label |
|---|---|---|
| launcher | 中文 | （无通知视口） |
| model-selector | 中文 | 通知（F8） |
| settings | 中文 | 通知（F8） |
| overlay | 中文 | 通知（F8） |
| cropper | —— | （无通知视口） |

Radix Toast 的英文 `aria-label` 修复前后对比见 `../task-14/README.md`。

### 中英实时切换（Task 8 已验证，overlay 窗口）

调用 `setUiLocale` 后同一窗口不重启、不刷新即完成切换，双向可逆。
详见 `../task-08/README.md`。

### 数据隔离（安装前基线）

| 路径 | 最后修改 | 判定 |
|---|---|---|
| `D:\Natively` | 2026/8/3 17:45:17 | 本次工作期间未变动 ✅ |
| `%APPDATA%\natively` | 2026/8/3 17:57:34 | 本次工作期间未变动 ✅ |
| `%APPDATA%\natively-zh` | 2026/8/5 09:49:04 | 由中文构建创建，证明隔离生效 ✅ |

### 自动更新策略（源码级验证）

`ZhDistributionPolicy.test.mjs` 断言并通过：

- `DISTRIBUTION.allowBackgroundAutoUpdate === false`
- `setupAutoUpdater()` 在该标志为 false 时把 `autoDownload` 与
  `autoInstallOnAppQuit` 设为 false 并立即返回
- `package.json` 无 `build.publish`

---

## 待人工执行

以下项目需要真机操作、交互式安装，或有效的云端 API 密钥，无法自动化。
请按 `../../release-checklist.md` 第 5-8 节逐项执行后回填本表。

### 安装（清单第 5 节）

- [ ] 运行 NSIS 安装程序，安装目录显式选择 `D:\Natively-ZH`
- [ ] 安装后再次核对 `D:\Natively` 的最后修改时间未变
- [ ] 确认 `%APPDATA%\natively` 未被创建或修改
- [ ] 开始菜单出现 `Natively ZH`，与官方 `Natively` 并存

### 界面验收矩阵（清单第 6 节）

在 **100% / 125% / 150%** 三档缩放下，逐页检查
「中文首帧 → 切英文 → 切回中文 → 多窗口同步 → 关闭重开后持久化」。

- [ ] 启动器
- [ ] 会议主界面与全部浮层
- [ ] 设置各页签
- [ ] AI 供应商与模型配置
- [ ] Natively API / Pro 订阅页
- [ ] 历史与会议详情
- [ ] 画像智能与文件上传
- [ ] 权限引导与首次启动
- [ ] 更新、试用、Pro 与错误弹窗
- [ ] 托盘菜单与原生通知
- [ ] 帮助、FAQ 与快捷键说明

重点看中文换行后按钮是否变形、侧栏是否被挤窄、长句是否截断。

### 中文语音与 AI 回复（清单第 7 节）

需要飞书或等价桌面会议软件 + **不含客户信息**的普通话测试材料 +
有效的云端 STT / LLM 密钥。

- [ ] `sttLanguage=chinese` 时系统音频产生可读中文转写
- [ ] 麦克风普通话产生**独立**的中文转写（两通道分开显示）
- [ ] 中英夹杂、数字、产品名与技术词可读
- [ ] `aiResponseLanguage=Chinese` 时 AI 建议为中文
- [ ] 单独切换 `uiLocale` **不**重启 STT、**不**改变上述两个设置
- [ ] 单独切换 STT 语言会安全重启流，不残留旧语言会话

> 云端密钥无效时记为**外部依赖未通过**，不得伪报成本地化失败或成功。

### 更新与回退（清单第 8 节）

- [ ] 应用运行超过 10 秒后退出：没有后台下载、没有退出时安装
- [ ] 「查看上游版本」只打开 GitHub releases 页面
- [ ] 按 `../../rollback.md` 走一遍：关闭中文构建 → 启动官方版 → 官方数据完好

---

## 已知限制

见 `build-manifest.txt` 的「已知限制」小节，共三条：

1. exe 嵌入元数据仍是 Electron 默认值（rcedit 需要符号链接权限，本机不具备）
2. 上游 `package.json` 有一处失效的 `react-query` 别名（已修，非本地化改动）
3. C 盘余量低，打包需把 TEMP 指向 D 盘
