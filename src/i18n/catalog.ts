/**
 * 静态引入全部词典。
 *
 * 刻意使用静态 import 而非运行时按需加载：Electron 渲染层是本地文件，
 * 没有网络延迟需要优化；而按需加载会引入「资源尚未到达时先渲染一帧」的
 * 时间窗，正是我们要消除的首帧闪烁。全部打进包里，初始化即完整可用。
 */
import enCommon from './resources/en-US/common.json';
import enLauncher from './resources/en-US/launcher.json';
import enMeeting from './resources/en-US/meeting.json';
import enSettings from './resources/en-US/settings.json';
import enProviders from './resources/en-US/providers.json';
import enHistory from './resources/en-US/history.json';
import enOnboarding from './resources/en-US/onboarding.json';
import enHelp from './resources/en-US/help.json';
import enUpdates from './resources/en-US/updates.json';
import enErrors from './resources/en-US/errors.json';

import zhCommon from './resources/zh-CN/common.json';
import zhLauncher from './resources/zh-CN/launcher.json';
import zhMeeting from './resources/zh-CN/meeting.json';
import zhSettings from './resources/zh-CN/settings.json';
import zhProviders from './resources/zh-CN/providers.json';
import zhHistory from './resources/zh-CN/history.json';
import zhOnboarding from './resources/zh-CN/onboarding.json';
import zhHelp from './resources/zh-CN/help.json';
import zhUpdates from './resources/zh-CN/updates.json';
import zhErrors from './resources/zh-CN/errors.json';

export const resources = {
    'en-US': {
        common: enCommon,
        launcher: enLauncher,
        meeting: enMeeting,
        settings: enSettings,
        providers: enProviders,
        history: enHistory,
        onboarding: enOnboarding,
        help: enHelp,
        updates: enUpdates,
        errors: enErrors,
    },
    'zh-CN': {
        common: zhCommon,
        launcher: zhLauncher,
        meeting: zhMeeting,
        settings: zhSettings,
        providers: zhProviders,
        history: zhHistory,
        onboarding: zhOnboarding,
        help: zhHelp,
        updates: zhUpdates,
        errors: zhErrors,
    },
} as const;
