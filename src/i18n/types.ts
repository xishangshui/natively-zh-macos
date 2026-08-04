/**
 * 界面语言的类型与常量。
 *
 * 注意：`uiLocale` 与语音识别语言、AI 回复语言是**三个互相独立**的设置，
 * 不得合并。切换界面语言绝不能静默改动另外两个：
 *
 *   - uiLocale           界面语言        'zh-CN' | 'en-US'
 *   - sttLanguage        语音识别语言    内部键 'chinese'（见 electron/config/languages.ts）
 *   - aiResponseLanguage AI 回复语言     'Chinese'
 *
 * 这里的联合类型必须与 electron/i18n/LocaleManager.ts 保持一致。
 */

export const UI_LOCALES = ['zh-CN', 'en-US'] as const;
export type UiLocale = (typeof UI_LOCALES)[number];

/** 中文构建默认简体中文。 */
export const DEFAULT_UI_LOCALE: UiLocale = 'zh-CN';

/** 缺失翻译时回退英文——绝不渲染空白。 */
export const FALLBACK_UI_LOCALE: UiLocale = 'en-US';

/** 按业务域拆分的命名空间。新增时必须同步 scripts/check-i18n-catalogs.mjs。 */
export const I18N_NAMESPACES = [
    'common',
    'launcher',
    'meeting',
    'settings',
    'providers',
    'history',
    'onboarding',
    'help',
    'updates',
    'errors',
] as const;

export type I18nNamespace = (typeof I18N_NAMESPACES)[number];

/** 运行时校验：把任意输入收敛为合法 locale，非法值回退默认中文。 */
export function isUiLocale(value: unknown): value is UiLocale {
    return typeof value === 'string' && (UI_LOCALES as readonly string[]).includes(value);
}
