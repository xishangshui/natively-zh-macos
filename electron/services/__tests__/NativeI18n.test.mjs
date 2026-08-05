// Task 12：主进程原生界面的本地化。
//
// 主进程不能引入 React / i18next——它没有渲染层，也不该为了几十条托盘和
// 对话框文案背上一个完整 i18n 运行时。所以这里是一个极小的翻译器：
// 静态对象 + 参数替换 + 回退，别无其他。
//
// 本测试守三件事：
//   1. 中英键集合与插值变量完全一致（和渲染层词典同一标准）
//   2. nativeT 的回退行为：非法 locale 回退中文，缺键回退英文
//   3. 托盘模板里不再有静态英文用户文案——这条防的是「加了词典但没接上」

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const { NATIVE_CATALOG } = await import(
  new URL('../../../dist-electron/electron/i18n/nativeCatalog.js', import.meta.url).href
);
const { nativeT, normalizeNativeLocale } = await import(
  new URL('../../../dist-electron/electron/i18n/nativeI18n.js', import.meta.url).href
);

/** 把嵌套对象展开成点号键，便于逐键比对。 */
const flatten = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );

const valueAt = (obj, dotted) =>
  dotted.split('.').reduce((acc, part) => (acc == null ? acc : acc[part]), obj);

/** 提取 {{var}} 形式的插值变量名集合。 */
const varsOf = (text) =>
  new Set([...String(text).matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]));

describe('主进程原生词典', () => {
  it('中英键集合完全一致', () => {
    const zh = flatten(NATIVE_CATALOG['zh-CN']).sort();
    const en = flatten(NATIVE_CATALOG['en-US']).sort();
    assert.deepEqual(
      zh,
      en,
      'BUG: 中英键集合不一致——缺失的一侧会在运行时回退成另一种语言',
    );
    assert.ok(zh.length > 0, 'BUG: 词典为空');
  });

  it('每个键在两种语言下都非空', () => {
    for (const locale of ['zh-CN', 'en-US']) {
      for (const key of flatten(NATIVE_CATALOG[locale])) {
        const value = valueAt(NATIVE_CATALOG[locale], key);
        assert.ok(
          typeof value === 'string' && value.trim().length > 0,
          `BUG: ${locale} 的 ${key} 为空——托盘菜单会出现空白项`,
        );
      }
    }
  });

  it('插值变量集合在两种语言下一致', () => {
    for (const key of flatten(NATIVE_CATALOG['zh-CN'])) {
      const zhVars = varsOf(valueAt(NATIVE_CATALOG['zh-CN'], key));
      const enVars = varsOf(valueAt(NATIVE_CATALOG['en-US'], key));
      assert.deepEqual(
        [...zhVars].sort(),
        [...enVars].sort(),
        `BUG: ${key} 的插值变量中英不一致——一侧会渲染出裸的 {{var}}`,
      );
    }
  });

  it('键名使用语义键而非英文句子', () => {
    const KEY_RE = /^[a-z][A-Za-z0-9]*(\.[a-z][A-Za-z0-9]*)+$/;
    for (const key of flatten(NATIVE_CATALOG['zh-CN'])) {
      assert.match(key, KEY_RE, `BUG: ${key} 不是合法语义键`);
    }
  });
});

describe('nativeT 回退行为', () => {
  it('正常取值', () => {
    assert.equal(nativeT('tray.show', {}, 'zh-CN'), NATIVE_CATALOG['zh-CN'].tray.show);
    assert.equal(nativeT('tray.show', {}, 'en-US'), NATIVE_CATALOG['en-US'].tray.show);
  });

  it('非法 locale 回退中文', () => {
    assert.equal(normalizeNativeLocale('de-DE'), 'zh-CN');
    assert.equal(normalizeNativeLocale(undefined), 'zh-CN');
    assert.equal(normalizeNativeLocale(null), 'zh-CN');
    assert.equal(normalizeNativeLocale(''), 'zh-CN');
    assert.equal(normalizeNativeLocale(123), 'zh-CN');
    assert.equal(normalizeNativeLocale('en-US'), 'en-US');
    assert.equal(nativeT('tray.show', {}, 'de-DE'), NATIVE_CATALOG['zh-CN'].tray.show);
  });

  it('缺键回退英文，再缺则返回键名本身而不是空白', () => {
    // 造一个只在英文侧存在的键是不现实的（上面的用例强制两侧一致），
    // 所以这里验证的是「完全不存在的键」的行为：返回键名，便于定位，
    // 绝不返回空串——空白菜单项用户无从判断。
    assert.equal(nativeT('nope.notAKey', {}, 'zh-CN'), 'nope.notAKey');
  });

  it('参数替换生效，未提供的变量保持原样以便暴露问题', () => {
    const withVar = nativeT('tray.toggleWindow', { accelerator: 'Ctrl+B' }, 'zh-CN');
    assert.ok(withVar.includes('Ctrl+B'), `BUG: 插值未生效，实际 ${withVar}`);
    assert.ok(!withVar.includes('{{'), `BUG: 残留未替换的占位符，实际 ${withVar}`);
  });
});

describe('主进程接线', () => {
  it('托盘模板不再含静态英文用户文案', () => {
    const main = read('electron/main.ts');
    // 锚定托盘菜单构建处：label 必须走 nativeT，不能是英文字面量。
    const trayBlock = main.slice(
      main.indexOf('const contextMenu = Menu.buildFromTemplate'),
      main.indexOf('this.tray.setContextMenu(contextMenu)'),
    );
    assert.ok(trayBlock.length > 0, '找不到托盘菜单构建块——锚点已失效，请更新测试');

    for (const stale of ['Show Natively', 'Take Screenshot', 'Toggle Window', "label: 'Quit'"]) {
      assert.ok(
        !trayBlock.includes(stale),
        `BUG: 托盘菜单仍有英文字面量 ${JSON.stringify(stale)}`,
      );
    }
    assert.match(trayBlock, /nativeT\(/, 'BUG: 托盘菜单没有调用 nativeT');
  });

  it('locale 变更后会重建托盘菜单', () => {
    const main = read('electron/main.ts');
    // 广播 ui-locale-changed 之后必须刷新托盘，否则托盘会停在旧语言。
    assert.match(
      main,
      /updateTrayMenu\(\)/,
      'BUG: 找不到 updateTrayMenu() —— 语言切换后托盘不会更新',
    );
  });
});
