# Natively ZH 发布前检查清单

每次出包都从头走一遍。勾选前必须有实际输出，不能凭印象。

---

## 0. 环境（不照做会失败）

```powershell
Remove-Item env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
$env:CARGO_HOME='D:\Rust\cargo'; $env:RUSTUP_HOME='D:\Rust\rustup'
$env:PATH="D:\Node20;D:\Rust\cargo\bin;$env:PATH"
Set-Location -LiteralPath 'D:\Natively-ZH-Source'
```

- [ ] Node 版本为 20.x（`node --version`）——全局 `D:\Node` 是 v26，
      better-sqlite3 不支持
- [ ] `ELECTRON_RUN_AS_NODE` 已清除
- [ ] C 盘与 D 盘各留 15 GB 以上
- [ ] 可用提交内存 > 4 GB；不足时设 `$env:GOMAXPROCS='1'`，
      **不要去关用户的进程**

## 1. 源码状态

- [ ] `git status --short` 为空
- [ ] 记录 commit：`git rev-parse HEAD`
- [ ] 分支为 `feat/zh-cn-localization`
- [ ] 上游基线仍是 tag `v2.7.0` / `be7280bf17f2de027b2cfde25551e46d89ca9d10`
- [ ] `native-module/` 未被 `build:native` 改动
      （napi 会按 Windows 产物重生成，删掉 macOS 专用导出；
      构建后 `git checkout -- native-module/` 还原，不要提交）

## 2. 工具链版本（记入 build-manifest.txt）

- [ ] `node --version`
- [ ] `npm --version`
- [ ] `rustc --version`
- [ ] `cargo --version`
- [ ] `python --version`
- [ ] `where.exe cl`

## 3. 门禁

```powershell
npm ci
npm run check:i18n
npm run test:i18n
npm run build            # 注意：会 rimraf dist 与 dist-electron
npm run build:electron   # 必须在 build 之后
npm run typecheck:electron
npm test
npm run build:native
```

- [ ] `check:i18n` 通过：零残留、零过期 allowlist
- [ ] `test:i18n` 全通过（词典完整性 + 覆盖扫描 + 格式化）
- [ ] `npx tsc --noEmit` 通过（渲染层类型检查）
- [ ] `typecheck:electron` 通过
- [ ] `npm test` 的失败集合与 `baseline-test-failures.tsv`
      **双向零差异**——判定标准不是全绿，见 CONTINUE-HERE §4
- [ ] `build:native` 成功且 Rust 原生模块可加载

## 4. 打包

```powershell
npx electron-builder --win nsis --x64
```

- [ ] `release\Natively-ZH-Setup-2.7.0-zh.1.exe` 存在
- [ ] 记录文件大小与 `Get-FileHash -Algorithm SHA256`
- [ ] 安装包身份正确：appId `com.natively.zh.desktop`、
      产品名 `Natively ZH`、快捷键名 `Natively ZH`
- [ ] `package.json` 无 `build.publish`（防止误用官方 release feed）

## 5. 安装

- [ ] NSIS 安装时**显式选择** `D:\Natively-ZH`
- [ ] 安装前后 `D:\Natively` 的最后修改时间未变
- [ ] 中文构建 userData 落在 `%APPDATA%\natively-zh`
- [ ] `%APPDATA%\natively`（官方数据）未被创建或修改
- [ ] 开始菜单出现 `Natively ZH`，与官方 `Natively` 并存

## 6. 界面验收矩阵

在 **100% / 125% / 150%** 三档缩放下，各页面都要检查
「中文首帧 → 切英文 → 切回中文 → 多窗口同步 → 关闭重开后持久化」：

- [ ] 启动器
- [ ] 会议主界面与全部浮层
- [ ] 设置各页签（通用、外观、音频、语言、快捷键、隐私、关于）
- [ ] AI 供应商与模型配置
- [ ] Natively API / Pro 订阅页
- [ ] 历史与会议详情
- [ ] 画像智能与文件上传
- [ ] 权限引导与首次启动
- [ ] 更新、试用、Pro 与错误弹窗
- [ ] 托盘菜单与原生通知
- [ ] 帮助、FAQ 与快捷键说明

重点看：截断、重叠、滚动、焦点顺序、键盘导航，以及中文换行后按钮是否变形。

## 7. 中文语音与 AI 回复验收

用**不含客户信息**的普通话测试材料，在飞书或等价桌面会议软件里：

- [ ] `sttLanguage=chinese` 时系统音频产生可读中文转写
- [ ] 麦克风普通话产生**独立**的中文转写（两个通道分开显示）
- [ ] 中英夹杂、数字、产品名与技术词可读
- [ ] `aiResponseLanguage=Chinese` 时 AI 建议为中文
- [ ] 单独切换 `uiLocale` **不**重启 STT，**不**改变上述两个设置
- [ ] 单独切换 STT 语言会安全重启流，不残留旧语言会话

云端密钥无效时记为**外部依赖未通过**，不得伪报成本地化失败或成功。

## 8. 更新与回退

- [ ] 应用运行超过 10 秒后退出：**没有**后台下载官方包，
      **没有**退出时安装
- [ ] 「查看上游版本」只打开 GitHub releases 页面，不下载
- [ ] 按 `rollback.md` 走一遍：关闭中文构建 → 启动官方版 → 官方数据完好

## 9. 交付物

- [ ] `evidence/task-15/build-manifest.txt`（commit、工具版本、大小、SHA-256）
- [ ] `evidence/task-15/manual-qa.md`（第 6、7 节的实际结果）
- [ ] `i18n-allowlist.md` 已重新生成并与名单一致
- [ ] `rollback.md`
- [ ] 已知限制清单

## 10. 打标签

```powershell
git add docs/zh-cn
git commit -m "docs: 记录 Natively ZH 发布验证"
git tag -a natively-v2.7.0-zh.1 -m "Natively v2.7.0 zh-CN build 1"
git status --short   # 必须为空
```
