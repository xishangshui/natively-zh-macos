/**
 * 主进程的极简翻译器：查表 + 参数替换 + 回退。没有别的。
 *
 * 回退链刻意是三级，且最后一级返回键名而不是空串：
 *   1. 请求的 locale
 *   2. en-US（设计规格 §5.3：缺失翻译回退英文）
 *   3. 键名本身——托盘上出现 `tray.show` 至少能定位问题，
 *      空白菜单项则让人完全无从判断
 */
import { NATIVE_CATALOG, type NativeLocale } from './nativeCatalog';

const DEFAULT_NATIVE_LOCALE: NativeLocale = 'zh-CN';
const FALLBACK_NATIVE_LOCALE: NativeLocale = 'en-US';

/** 把任意输入收敛成受支持的 locale；非法值回退中文，绝不抛错。 */
export function normalizeNativeLocale(value: unknown): NativeLocale {
  return value === 'zh-CN' || value === 'en-US' ? value : DEFAULT_NATIVE_LOCALE;
}

function lookup(locale: NativeLocale, key: string): string | undefined {
  const parts = key.split('.');
  let node: unknown = NATIVE_CATALOG[locale];
  for (const part of parts) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : undefined;
}

/**
 * 取一条原生文案。
 *
 * @param key    点号语义键，例如 `tray.show`
 * @param vars   插值变量；未提供的占位符**保留原样**，好让问题在界面上暴露，
 *               而不是悄悄变成空白
 * @param locale 目标 locale，非法值回退中文
 */
export function nativeT(
  key: string,
  vars: Record<string, string | number> = {},
  locale: unknown = DEFAULT_NATIVE_LOCALE,
): string {
  const target = normalizeNativeLocale(locale);
  const template = lookup(target, key) ?? lookup(FALLBACK_NATIVE_LOCALE, key) ?? key;

  return template.replace(/\{\{(\w+)\}\}/g, (whole, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : whole,
  );
}
