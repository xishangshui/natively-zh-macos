import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import { resources } from './catalog';
import {
    DEFAULT_UI_LOCALE,
    FALLBACK_UI_LOCALE,
    I18N_NAMESPACES,
    isUiLocale,
    type UiLocale,
} from './types';

/**
 * 渲染层 i18n 单例。
 *
 * 初始化顺序是本模块的关键约束：
 *
 *   1. 先向主进程取 uiLocale
 *   2. 再用该值初始化 i18next
 *   3. 注册语言变更监听
 *   4. 最后才允许 React 挂载（由 main.tsx 负责）
 *
 * 顺序颠倒会导致首帧英文闪烁——界面先以默认语言画一帧，再跳变成中文。
 * 这在启动器和会议浮层上尤其明显，因为它们本来就是瞬间出现的小窗口。
 */

const isDev = import.meta.env?.DEV === true;

let changeListenerCleanup: (() => void) | null = null;

/**
 * 初始化渲染层 i18n。
 *
 * 任何一步失败都不能白屏：取不到 locale 就用默认中文，
 * 中文资源本身缺键则由 i18next 回退英文。
 */
export async function initializeRendererI18n(): Promise<UiLocale> {
    let locale: UiLocale = DEFAULT_UI_LOCALE;

    try {
        const fromMain = await window.electronAPI?.getUiLocale?.();
        if (isUiLocale(fromMain)) {
            locale = fromMain;
        } else if (fromMain !== undefined) {
            // 主进程返回了非法值——记录但不阻断启动
            console.warn('[i18n] Unexpected uiLocale from main process; falling back to default.');
        }
    } catch (error) {
        // IPC 失败（主进程未就绪、通道未注册等）不能导致白屏。
        // 只记录错误类型，不记录可能含用户数据的载荷。
        console.warn('[i18n] Could not read uiLocale from main process; using default.', error);
    }

    if (!i18next.isInitialized) {
        await i18next.use(initReactI18next).init({
            lng: locale,
            fallbackLng: FALLBACK_UI_LOCALE,
            defaultNS: 'common',
            ns: [...I18N_NAMESPACES],
            resources,
            // 缺失翻译必须回退英文，绝不渲染空白——空字符串会让按钮变成
            // 看不见的空按钮，用户完全无从判断哪里出了问题。
            returnEmptyString: false,
            returnNull: false,
            interpolation: {
                // React 自身已对插值做转义，这里再转一次会把中文标点和引号
                // 显示成 &quot; 之类的实体字符。
                escapeValue: false,
            },
            saveMissing: isDev,
            missingKeyHandler: isDev
                ? (_lngs, ns, key) => {
                    console.warn(`[i18n] Missing key: ${ns}:${key}`);
                }
                : undefined,
            react: {
                useSuspense: false,
            },
        });
    } else if (i18next.language !== locale) {
        await i18next.changeLanguage(locale);
    }

    registerLocaleChangeListener();
    return locale;
}

/**
 * 订阅主进程广播，保证本窗口跟随全局语言切换。
 *
 * 幂等：重复调用先清理旧监听，避免窗口重建后监听器叠加。
 */
function registerLocaleChangeListener(): void {
    changeListenerCleanup?.();
    changeListenerCleanup = window.electronAPI?.onUiLocaleChanged?.((next) => {
        if (!isUiLocale(next)) return;
        if (i18next.language === next) return;
        void i18next.changeLanguage(next);
    }) ?? null;
}

/** 仅供窗口卸载时使用。 */
export function disposeRendererI18n(): void {
    changeListenerCleanup?.();
    changeListenerCleanup = null;
}

/**
 * 当前生效的 UI locale，供**模块作用域**的格式化 helper 使用。
 *
 * 组件内部请优先用 `useTranslation()` 的 `i18n.language`——那条路径能在
 * 语言切换时触发重渲染。本函数是给拿不到 hook 的模块级函数（如日期分组
 * helper）兜底的，它只在被调用的那一刻读值，不订阅变更。
 */
export function getCurrentUiLocale(): UiLocale {
    return isUiLocale(i18next.language) ? i18next.language : DEFAULT_UI_LOCALE;
}

export { i18next };
export default i18next;
