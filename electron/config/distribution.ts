import path from 'path'

/**
 * Natively ZH 社区中文构建的发行标识与更新策略。
 *
 * 这是一个**单一事实来源**：安装包身份（package.json build 段）、运行时
 * userData 目录和自动更新开关都以此为准，避免三处各写一份而漂移。
 *
 * 设计约束（见 docs/superpowers/specs 第 12 节）：
 *
 *   - 中文构建必须能与官方版**并存**。官方版安装在 D:\Natively、用户数据在
 *     %APPDATA%\natively；中文构建安装在 D:\Natively-ZH、用户数据在
 *     %APPDATA%\natively-zh。两者不得共用同一个 SQLite 数据库。
 *
 *   - 中文构建**不得**被官方自动更新静默覆盖。官方更新包会替换整个
 *     app.asar，汉化资源随之丢失，且用户不会收到任何提示。因此后台自动
 *     下载与退出时自动安装一律关闭，只保留人工查看上游版本的入口。
 *
 *   - 不伪装成官方签名发行版：appId、产品名和版本号都带有明确的 zh 标识。
 */
export const DISTRIBUTION = Object.freeze({
    /** 内部标识，用于日志与诊断，不面向用户展示。 */
    id: 'natively-zh-community',

    /** 展示用产品名，与 package.json build.productName 保持一致。 */
    productName: 'Natively ZH',

    /**
     * userData 子目录名。相对 Electron 的 appData 根目录，
     * 在 Windows 上最终为 %APPDATA%\natively-zh。
     *
     * 绝不可改回 'natively'——那会与官方安装共用数据库，
     * 两个版本并发写入同一 SQLite 文件可能损坏会议历史。
     */
    userDataDirName: 'natively-zh',

    /**
     * 是否允许 electron-updater 后台下载并在退出时安装。
     *
     * 对中文构建**永远为 false**。设为 true 会让官方发布的英文版本
     * 静默覆盖本构建。
     */
    allowBackgroundAutoUpdate: false,

    /** 人工查看上游版本的地址；只用于 shell.openExternal，不作为更新源。 */
    upstreamReleasesUrl:
        'https://github.com/Natively-AI-assistant/natively-cluely-ai-assistant/releases/latest',
})

/**
 * 把 userData 重定向到中文构建的独立目录。
 *
 * **必须在任何代码读取 userData 之前调用**（即 main.ts 顶层、构造
 * SettingsManager / DatabaseManager 之前）。Electron 会缓存首次解析出的
 * 路径，晚调用会导致一部分模块已经指向官方的 %APPDATA%\natively。
 */
export function configureDistributionUserData(electronApp: Electron.App): void {
    const isolated = path.join(
        electronApp.getPath('appData'),
        DISTRIBUTION.userDataDirName,
    )
    electronApp.setPath('userData', isolated)
}
