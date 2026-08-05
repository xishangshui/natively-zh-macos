/**
 * Locale 感知的展示格式化器。
 *
 * **只在展示边界调用。** 数据库写入、API payload 和导出文件名里的时间
 * 必须保持原有 ISO 格式——把 zh-CN 的「2026/3/9」写进数据库会破坏排序、
 * 破坏与原版数据的兼容，也让跨版本迁移无从下手。
 *
 * 设计取舍：
 * - 非法 locale 回退 `zh-CN`（设计规格 §11：locale 值非法不得导致启动失败）
 * - 非法时间值返回空串，而不是把 `Invalid Date` 这个英文内部值显示给用户
 * - 显式固定 `timeZone: undefined` 之外的选项，保证同一输入输出稳定
 */
import { DEFAULT_UI_LOCALE, UI_LOCALES, type UiLocale } from './types';

/** 把任意输入收敛成受支持的 UI locale；非法值回退默认值。 */
export function normalizeFormatterLocale(value: unknown): UiLocale {
  return typeof value === 'string' && (UI_LOCALES as readonly string[]).includes(value)
    ? (value as UiLocale)
    : DEFAULT_UI_LOCALE;
}

/**
 * 把 Date / ISO 字符串 / 时间戳统一成 Date；无法解析时返回 null。
 * 注意不改动入参——调用方可能把同一个字符串继续写进数据库。
 */
function toDate(value: Date | string | number): Date | null {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** 只有日期，用于列表与卡片。 */
export function formatDate(value: Date | string | number, locale: UiLocale): string {
  const date = toDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat(normalizeFormatterLocale(locale), {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).format(date);
}

/** 日期 + 时间，用于会议详情等需要精确时刻的位置。 */
export function formatDateTime(value: Date | string | number, locale: UiLocale): string {
  const date = toDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat(normalizeFormatterLocale(locale), {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/** 数字分组，用于 token 用量、计数等。 */
export function formatNumber(value: number, locale: UiLocale): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '';
  return new Intl.NumberFormat(normalizeFormatterLocale(locale)).format(value);
}
