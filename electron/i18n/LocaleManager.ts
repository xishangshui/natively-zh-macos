/**
 * 界面语言的主进程单一事实来源。
 *
 * 为什么放在主进程而不是渲染层 localStorage：Natively 同时存在启动器、设置、
 * 会议界面等多个 BrowserWindow，各自的 localStorage 互相独立。只靠渲染层持久化
 * 会出现「设置窗已切成中文、会议窗仍是英文」的割裂状态，且新开的窗口读不到
 * 最新值。主进程持有唯一值并向全部窗口广播，才能保证一致。
 *
 * 注意：`uiLocale` 与语音识别语言（内部键 'chinese'）、AI 回复语言（'Chinese'）
 * 是**三个互相独立**的设置。本模块只负责界面语言，绝不触碰另外两个。
 */

export type UiLocale = 'zh-CN' | 'en-US';

const UI_LOCALES: readonly UiLocale[] = ['zh-CN', 'en-US'];

/** 中文构建默认简体中文。非法值一律回退到这里，绝不让启动失败。 */
export const DEFAULT_UI_LOCALE: UiLocale = 'zh-CN';

/**
 * 持久化抽象。
 *
 * 之所以不直接依赖 SettingsManager，是因为后者的构造函数要求 app.whenReady()
 * 已完成；把依赖倒置出来后，LocaleManager 既可在测试中用内存实现驱动，
 * 也不会在启动早期意外提前构造 SettingsManager。
 */
export interface LocalePersistence {
    read(): unknown;
    write(locale: UiLocale): void;
}

/** 把任意输入收敛为合法 locale。非法值回退简体中文，不抛错。 */
export function normalizeUiLocale(value: unknown): UiLocale {
    return typeof value === 'string' && (UI_LOCALES as readonly string[]).includes(value)
        ? (value as UiLocale)
        : DEFAULT_UI_LOCALE;
}

export class LocaleManager {
    private locale: UiLocale;

    constructor(private readonly persistence: LocalePersistence) {
        this.locale = normalizeUiLocale(this.safeRead());
    }

    private safeRead(): unknown {
        try {
            return this.persistence.read();
        } catch {
            // 读取失败不能导致启动失败——回退默认语言即可
            return undefined;
        }
    }

    getLocale(): UiLocale {
        return this.locale;
    }

    /**
     * 设置界面语言，返回归一化后的实际值。
     *
     * 值未变化时直接返回，不触发磁盘写入——语言切换在设置界面可能被频繁触发，
     * 没必要反复写盘。
     *
     * 写入失败时**保持原值并向上抛错**：若此时就地更新内存值，界面会切换成功、
     * 重启后却回退，用户完全无从察觉。调用方据此回滚下拉框并提示重试。
     */
    setLocale(value: unknown): UiLocale {
        const next = normalizeUiLocale(value);
        if (next === this.locale) return this.locale;

        this.persistence.write(next);
        this.locale = next;
        return this.locale;
    }
}

let instance: LocaleManager | null = null;

/**
 * 惰性单例。
 *
 * 必须惰性创建：其 persistence 适配器会调用 SettingsManager.getInstance()，
 * 而后者在 app.whenReady() 之前构造会直接抛错。
 */
export function getLocaleManager(): LocaleManager {
    if (!instance) {
        // 延迟 require，避免模块加载期就拉起 SettingsManager
        const { SettingsManager } = require('../services/SettingsManager');
        instance = new LocaleManager({
            read: () => SettingsManager.getInstance().get('uiLocale'),
            write: (locale: UiLocale) => SettingsManager.getInstance().set('uiLocale', locale),
        });
    }
    return instance;
}

/** 仅供测试使用：重置单例。 */
export function resetLocaleManagerForTests(): void {
    instance = null;
}
