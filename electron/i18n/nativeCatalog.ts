/**
 * 主进程原生界面的双语词典。
 *
 * 刻意用 TypeScript 对象而不是 JSON + i18next：主进程没有渲染层，
 * 为几十条托盘/对话框文案引入完整 i18n 运行时不划算，也会拖慢启动。
 *
 * 约束（由 NativeI18n.test.mjs 强制）：
 *   - 中英键集合必须完全一致
 *   - 每个值非空——空字符串在托盘上就是一个点不动的空白菜单项
 *   - 插值变量集合两侧一致，否则一侧会渲染出裸的 {{var}}
 *   - 键名是语义键，不是英文句子
 *
 * 不翻译的内容遵循设计规格 3.2：产品名 Natively、快捷键字符串、模型 ID。
 */

export const NATIVE_CATALOG = {
  'zh-CN': {
    tray: {
      show: '显示 Natively',
      toggleWindow: '显示/隐藏窗口（{{accelerator}}）',
      takeScreenshot: '截图（{{accelerator}}）',
      quit: '退出',
    },
    window: {
      // 窗口菜单与快捷键说明
      minimize: '最小化',
      close: '关闭',
    },
    meeting: {
      // MeetingPersistence 在拿不到标题时的兜底名
      untitled: '未命名会议',
      defaultTitle: '{{date}} 的会议',
    },
    notification: {
      meetingSavedTitle: '会议已保存',
      meetingSavedBody: '「{{title}}」的转写与摘要已保存到本地。',
      permissionNeededTitle: '需要权限',
      permissionNeededBody: 'Natively 需要屏幕录制与麦克风权限才能采集会议。',
    },
    dialog: {
      confirmQuitTitle: '退出 Natively？',
      confirmQuitMessage: '当前有会议正在进行，退出会结束这场会议。',
      confirmQuitOk: '退出',
      confirmQuitCancel: '取消',
    },
    error: {
      audioCaptureTitle: '音频采集失败',
      audioCaptureBody: '无法启动音频采集。请检查系统音频与麦克风权限后重试。',
      screenPermissionTitle: '缺少屏幕录制权限',
      screenPermissionBody: '请在系统设置的「隐私与安全性」中允许 Natively 录制屏幕。',
    },
    update: {
      customBuildTitle: '这是社区中文构建',
      customBuildBody:
        '本构建不会自动下载或安装官方更新。安装官方发行版会替换本构建并移除中文界面。',
    },
  },

  'en-US': {
    tray: {
      show: 'Show Natively',
      toggleWindow: 'Toggle Window ({{accelerator}})',
      takeScreenshot: 'Take Screenshot ({{accelerator}})',
      quit: 'Quit',
    },
    window: {
      minimize: 'Minimize',
      close: 'Close',
    },
    meeting: {
      untitled: 'Untitled meeting',
      defaultTitle: 'Meeting on {{date}}',
    },
    notification: {
      meetingSavedTitle: 'Meeting saved',
      meetingSavedBody: 'The transcript and summary for "{{title}}" were saved locally.',
      permissionNeededTitle: 'Permission needed',
      permissionNeededBody:
        'Natively needs Screen Recording and Microphone access to capture meetings.',
    },
    dialog: {
      confirmQuitTitle: 'Quit Natively?',
      confirmQuitMessage: 'A meeting is in progress. Quitting will end it.',
      confirmQuitOk: 'Quit',
      confirmQuitCancel: 'Cancel',
    },
    error: {
      audioCaptureTitle: 'Audio capture failed',
      audioCaptureBody:
        'Could not start audio capture. Check your system audio and microphone permissions, then try again.',
      screenPermissionTitle: 'Screen Recording permission missing',
      screenPermissionBody:
        'Allow Natively to record the screen in System Settings → Privacy & Security.',
    },
    update: {
      customBuildTitle: 'This is a community Chinese build',
      customBuildBody:
        'This build never downloads or installs official updates automatically. Installing an official release will replace it and remove the Chinese interface.',
    },
  },
} as const;

export type NativeLocale = keyof typeof NATIVE_CATALOG;
