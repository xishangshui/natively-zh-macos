# 回退到官方版 Natively

中文构建（Natively ZH）与官方版是**两套完全独立的安装**，
装在不同目录、用不同的用户数据目录。回退不需要删除任何原版数据。

| | 官方版 | 中文构建 |
|---|---|---|
| 安装目录 | `D:\Natively` | `D:\Natively-ZH` |
| 用户数据 | `%APPDATA%\natively` | `%APPDATA%\natively-zh` |
| 开始菜单 | Natively | Natively ZH |
| appId | 官方值 | `com.natively.zh.desktop` |

这套隔离在 Task 2（提交 `b31167d`）建立，由
`electron/config/distribution.ts` 的 `configureDistributionUserData()`
在主进程读取 userData **之前**调用来保证。

---

## 回退步骤

### 1. 关闭中文构建

右下角托盘图标 → 退出。确认任务管理器里没有残留的 `Natively ZH` 进程
（托盘应用关窗不等于退出）。

### 2. 直接启动官方版

开始菜单 → **Natively**，或直接运行 `D:\Natively\Natively.exe`。

官方版的配置、会议历史、API Key 都在 `%APPDATA%\natively`，
中文构建从未写入过该目录，所以一切照旧。**到这一步回退就完成了。**

下面两步是可选的清理，不做也不影响官方版使用。

### 3.（可选）备份中文构建的数据

如果之后还想用中文构建，或想留存这段时间产生的会议记录：

```powershell
Copy-Item -Recurse "$env:APPDATA\natively-zh" "$env:USERPROFILE\Desktop\natively-zh-backup"
```

中文构建的会议数据库、设置和凭据都在这个目录里。

### 4.（可选）卸载中文构建

控制面板 → 程序和功能 → **Natively ZH** → 卸载。
或运行 `D:\Natively-ZH\Uninstall Natively ZH.exe`。

卸载程序只删除 `D:\Natively-ZH`。它**不会**碰：

- `D:\Natively`（官方安装）
- `%APPDATA%\natively`（官方用户数据）
- `%APPDATA%\natively-zh`（中文构建的用户数据，需要手动删）

如果确认不再需要中文构建的数据：

```powershell
Remove-Item -Recurse -Force "$env:APPDATA\natively-zh"
```

---

## 不要这样做

**不要用删除官方数据库的方式「重置」。** 回退的全部含义就是「启动另一个
可执行文件」，官方数据自始至终没有被动过。

**不要在官方版正在运行时启动中文构建，反之亦然。** 两者用不同的 SQLite
文件，本身不会互相写坏；但全局快捷键和音频采集会互相抢占，行为难以预期。

**不要把官方安装包装到 `D:\Natively-ZH`。** 那会用官方版覆盖中文构建，
中文界面消失，而 `%APPDATA%\natively-zh` 里的数据会变成孤儿。

---

## 关于自动更新

中文构建**不会**自动下载或安装官方更新——这是 Task 2 刻意做的：

- `DISTRIBUTION.allowBackgroundAutoUpdate = false`
- `setupAutoUpdater()` 在该标志为 false 时把 `autoDownload` 与
  `autoInstallOnAppQuit` 都设为 false 并立即返回，不注册 10 秒自动检查
- `package.json` 移除了 `build.publish`，防止误用官方 release feed

「关于」页保留了「查看上游版本」按钮，它只打开 GitHub releases 页面，
不下载任何东西。页面上方明确写着：安装官方发行版会替换本构建并移除中文界面。

所以：**官方版不会悄悄回来**，回退必须由你主动执行。
