// Task 13：locale 格式化器的行为测试。
//
// 关键约束：格式化只发生在**展示边界**。数据库写入、API payload 和文件名里的
// 时间必须保持原有 ISO 格式——否则 zh-CN 的「2026/3/9」被写进数据库会破坏
// 排序与跨版本兼容。最后一个用例就守这条。
//
// 用固定 UTC 时间戳并显式指定 timeZone，避免测试机时区影响结果。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  formatDate,
  formatDateTime,
  formatNumber,
  normalizeFormatterLocale,
} from '../../i18n/formatters';

// 月份与日期都是单数位，能暴露「是否按 locale 补零 / 调整顺序」的差异。
const SAMPLE = '2026-03-09T14:05:00.000Z';

describe('locale 格式化器', () => {
  it('日期在两种 locale 下输出不同且稳定', () => {
    const zh = formatDate(SAMPLE, 'zh-CN');
    const en = formatDate(SAMPLE, 'en-US');

    assert.notEqual(zh, en, 'BUG: 中英日期格式相同，说明没有按 locale 走 Intl');
    assert.equal(formatDate(SAMPLE, 'zh-CN'), zh, 'BUG: 同一输入两次结果不一致');
    assert.equal(formatDate(SAMPLE, 'en-US'), en);
    // zh-CN 用「年/月/日」序，年份在最前
    assert.match(zh, /^2026/, `BUG: zh-CN 日期应以年份开头，实际 ${zh}`);
  });

  it('日期时间在两种 locale 下输出不同且稳定', () => {
    const zh = formatDateTime(SAMPLE, 'zh-CN');
    const en = formatDateTime(SAMPLE, 'en-US');

    assert.notEqual(zh, en);
    assert.equal(formatDateTime(SAMPLE, 'zh-CN'), zh);
    assert.match(zh, /2026/);
    assert.match(en, /2026/);
  });

  it('数字按 locale 分组且稳定', () => {
    const zh = formatNumber(1234567.89, 'zh-CN');
    const en = formatNumber(1234567.89, 'en-US');

    // 中英都用逗号分组，所以断言的是「有分组」而非「互不相同」
    assert.match(zh, /1,234,567/, `BUG: zh-CN 数字未分组，实际 ${zh}`);
    assert.match(en, /1,234,567/, `BUG: en-US 数字未分组，实际 ${en}`);
    assert.equal(formatNumber(1234567.89, 'zh-CN'), zh);
  });

  it('非法 locale 回退到 zh-CN，不抛错', () => {
    assert.equal(normalizeFormatterLocale('de-DE'), 'zh-CN');
    assert.equal(normalizeFormatterLocale(''), 'zh-CN');
    assert.equal(normalizeFormatterLocale(undefined), 'zh-CN');
    assert.equal(normalizeFormatterLocale(null), 'zh-CN');
    assert.equal(normalizeFormatterLocale(42), 'zh-CN');
    assert.equal(normalizeFormatterLocale('en-US'), 'en-US');
    assert.equal(normalizeFormatterLocale('zh-CN'), 'zh-CN');

    // 非法 locale 走 formatDate 等价于 zh-CN，且不抛异常
    assert.equal(
      formatDate(SAMPLE, 'de-DE' as never),
      formatDate(SAMPLE, 'zh-CN'),
    );
  });

  it('接受 Date / ISO 字符串 / 时间戳三种输入，结果一致', () => {
    const asDate = formatDate(new Date(SAMPLE), 'zh-CN');
    const asString = formatDate(SAMPLE, 'zh-CN');
    const asNumber = formatDate(new Date(SAMPLE).getTime(), 'zh-CN');
    assert.equal(asDate, asString);
    assert.equal(asString, asNumber);
  });

  it('非法时间值返回空串，不把 Invalid Date 露给用户', () => {
    assert.equal(formatDate('not-a-date', 'zh-CN'), '');
    assert.equal(formatDateTime('not-a-date', 'zh-CN'), '');
    assert.equal(formatNumber(Number.NaN, 'zh-CN'), '');
  });

  it('格式化器不改动传入值——数据库存储格式必须原样保留', () => {
    const original = SAMPLE;
    const copy = String(original);
    formatDate(original, 'zh-CN');
    formatDateTime(original, 'en-US');
    assert.equal(original, copy, 'BUG: 格式化器改动了入参，数据库写入格式会被污染');
  });
});
