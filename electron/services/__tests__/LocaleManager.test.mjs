/**
 * LocaleManager 行为测试。
 *
 * 用内存 persistence 驱动，不碰真实 settings.json，也不需要 Electron 运行时。
 * 加载编译产物，保证测的是应用实际运行的代码。
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const compiledPath = path.resolve(
    __dirname,
    '../../../dist-electron/electron/i18n/LocaleManager.js',
);

if (!fs.existsSync(compiledPath)) {
    throw new Error(
        `未找到编译产物：${compiledPath}\n`
        + `请先运行 npm run build:electron —— 本测试加载编译后的类，`
        + `以保证测的是应用实际运行的代码。`,
    );
}

const { LocaleManager, normalizeUiLocale } = await import(pathToFileURL(compiledPath).href);

/** 可控的内存 persistence，可模拟读取值与写入失败。 */
function makePersistence({ initial = undefined, failWrite = false } = {}) {
    const writes = [];
    let stored = initial;
    return {
        writes,
        read: () => stored,
        write: (locale) => {
            if (failWrite) throw new Error('simulated settings write failure');
            writes.push(locale);
            stored = locale;
        },
        get stored() {
            return stored;
        },
    };
}

describe('normalizeUiLocale', () => {
    test('合法值原样返回', () => {
        assert.equal(normalizeUiLocale('zh-CN'), 'zh-CN');
        assert.equal(normalizeUiLocale('en-US'), 'en-US');
    });

    test('非法值一律回退简体中文，不抛错', () => {
        for (const bad of [undefined, null, '', 'fr-FR', 'zh', 'ZH-CN', 42, {}, [], true]) {
            assert.equal(
                normalizeUiLocale(bad),
                'zh-CN',
                `非法输入 ${JSON.stringify(bad)} 必须回退 zh-CN，且不能导致启动失败`,
            );
        }
    });
});

describe('LocaleManager', () => {
    test('缺省值为简体中文', () => {
        const p = makePersistence();
        assert.equal(new LocaleManager(p).getLocale(), 'zh-CN');
    });

    test('已存的合法 en-US 被保留', () => {
        const p = makePersistence({ initial: 'en-US' });
        assert.equal(new LocaleManager(p).getLocale(), 'en-US');
    });

    test('已存的非法值回退简体中文', () => {
        const p = makePersistence({ initial: 'klingon' });
        assert.equal(new LocaleManager(p).getLocale(), 'zh-CN');
    });

    test('setLocale 返回归一化后的值并持久化', () => {
        const p = makePersistence();
        const m = new LocaleManager(p);
        assert.equal(m.setLocale('en-US'), 'en-US');
        assert.equal(m.getLocale(), 'en-US');
        assert.deepEqual(p.writes, ['en-US']);
    });

    test('setLocale 收到非法值时归一化为简体中文', () => {
        const p = makePersistence({ initial: 'en-US' });
        const m = new LocaleManager(p);
        assert.equal(m.setLocale('nonsense'), 'zh-CN');
        assert.equal(m.getLocale(), 'zh-CN');
    });

    test('相同值不重复写入', () => {
        const p = makePersistence({ initial: 'en-US' });
        const m = new LocaleManager(p);
        m.setLocale('en-US');
        m.setLocale('en-US');
        assert.deepEqual(p.writes, [], '值未变化时不应触发磁盘写入');
    });

    test('写入失败时保持原值并抛错', () => {
        const p = makePersistence({ initial: 'en-US', failWrite: true });
        const m = new LocaleManager(p);

        assert.throws(() => m.setLocale('zh-CN'), /failure/i);
        assert.equal(
            m.getLocale(),
            'en-US',
            '保存失败后必须保持原值——否则界面已切换但重启后回退，用户无从察觉',
        );
    });
});
