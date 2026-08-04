/**
 * 渲染层 i18n 初始化契约测试。
 *
 * 核心要防的是**首帧英文闪烁**：如果先 render 再异步取语言，用户会看到界面
 * 先以英文（或默认值）画一帧，再跳变成中文。必须先拿到 locale、初始化完成，
 * 才允许 React 挂载。
 *
 * 同时验证回退契约：中文缺键回退英文，绝不渲染空白；主进程 IPC 失败也要能
 * 完成初始化，不能白屏。
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInstance } from 'i18next';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const mainSource = read('src/main.tsx');
const i18nSource = read('src/i18n/index.ts');
const catalogSource = read('src/i18n/catalog.ts');

describe('首帧不闪烁：render 必须在初始化之后', () => {
    test('main.tsx 等待 initializeRendererI18n 完成后才 render', () => {
        assert.match(mainSource, /initializeRendererI18n/);

        const initIdx = mainSource.indexOf('initializeRendererI18n(');
        // 用 [\s\S]*? 而非 [^)]*：createRoot(document.getElementById("root")!)
        // 的实参本身含右括号，后者会在第一个 ) 处截断。
        const renderIdx = mainSource.search(/createRoot\([\s\S]*?\)\s*\.render\(/);

        assert.ok(initIdx > 0, '必须调用 initializeRendererI18n');
        assert.ok(renderIdx > 0, '必须存在 createRoot(...).render(...)');
        assert.ok(
            initIdx < renderIdx,
            'createRoot().render() 必须出现在 initializeRendererI18n 之后，'
            + '否则首帧会以默认语言画一次再跳变',
        );
    });

    test('render 被 await 串联，而非并行触发', () => {
        assert.match(
            mainSource,
            /await\s+initializeRendererI18n\(\)/,
            '必须 await 初始化——不 await 等于没有消除闪烁',
        );
    });
});

describe('i18next 实例配置', () => {
    test('默认中文、回退英文、默认 namespace 为 common', () => {
        // 字面量定义在 types.ts，index.ts 引用常量而非硬编码字符串。
        // 断言两边都成立，比匹配某个文件里的字面量更贴近真实契约。
        const typesSource = read('src/i18n/types.ts');
        assert.match(typesSource, /DEFAULT_UI_LOCALE:\s*UiLocale\s*=\s*['"]zh-CN['"]/);
        assert.match(typesSource, /FALLBACK_UI_LOCALE:\s*UiLocale\s*=\s*['"]en-US['"]/);

        assert.match(i18nSource, /lng:\s*locale/, 'lng 必须取自主进程解析出的 locale');
        assert.match(i18nSource, /fallbackLng:\s*FALLBACK_UI_LOCALE/);
        assert.match(i18nSource, /defaultNS:\s*['"]common['"]/);
        assert.match(
            i18nSource,
            /let\s+locale:\s*UiLocale\s*=\s*DEFAULT_UI_LOCALE/,
            'locale 的初值必须是 DEFAULT_UI_LOCALE，IPC 失败时才有安全兜底',
        );
    });

    test('缺键不渲染空字符串', () => {
        assert.match(
            i18nSource,
            /returnEmptyString:\s*false/,
            'returnEmptyString 必须为 false，否则空值会渲染成空白而非回退英文',
        );
    });

    test('关闭 HTML 转义——React 本身已防注入，重复转义会显示实体字符', () => {
        assert.match(i18nSource, /escapeValue:\s*false/);
    });

    test('开发环境报告缺失键，生产环境静默回退', () => {
        assert.match(i18nSource, /missingKeyHandler/);
    });
});

describe('语言切换与清理', () => {
    test('监听 ui-locale-changed 并调用 changeLanguage', () => {
        assert.match(i18nSource, /onUiLocaleChanged/);
        assert.match(i18nSource, /changeLanguage/);
    });

    test('IPC 失败时仍完成初始化，不白屏', () => {
        assert.match(
            i18nSource,
            /catch/,
            'getUiLocale 失败必须被捕获并以默认语言完成初始化',
        );
    });
});

describe('资源目录完整性', () => {
    test('catalog 静态引入全部二十个词典', () => {
        const imports = catalogSource.match(/from\s+'\.\/resources\/(en-US|zh-CN)\/\w+\.json'/g) ?? [];
        assert.equal(
            imports.length,
            20,
            `catalog.ts 必须静态引入 20 个词典（2 语言 × 10 namespace），实际 ${imports.length} 个`,
        );
    });
});

describe('回退行为（真实 i18next 实例）', () => {
    /** 用真实词典构造实例，验证契约而非猜测 i18next 行为。 */
    function makeInstance(resources) {
        const inst = createInstance();
        inst.init({
            lng: 'zh-CN',
            fallbackLng: 'en-US',
            defaultNS: 'common',
            returnEmptyString: false,
            interpolation: { escapeValue: false },
            resources,
        });
        return inst;
    }

    test('中文缺键时回退英文，不返回空白', () => {
        const inst = makeInstance({
            'zh-CN': { common: { actions: { close: '关闭' } } },
            'en-US': { common: { actions: { close: 'Close', save: 'Save' } } },
        });
        assert.equal(inst.t('actions.close'), '关闭');
        assert.equal(
            inst.t('actions.save'),
            'Save',
            '中文缺键必须回退英文——渲染空白会让按钮变成看不见的空按钮',
        );
    });

    test('插值在两种语言下都正确渲染', () => {
        const inst = makeInstance({
            'zh-CN': { history: { summary: { meetingCount: '{{count}} 场会议' } } },
            'en-US': { history: { summary: { meetingCount: '{{count}} meetings' } } },
        });
        assert.equal(inst.t('history:summary.meetingCount', { count: 3 }), '3 场会议');
        inst.changeLanguage('en-US');
        assert.equal(inst.t('history:summary.meetingCount', { count: 3 }), '3 meetings');
    });

    test('真实词典文件可被 i18next 正常消费', () => {
        const load = (locale, ns) =>
            JSON.parse(read(`src/i18n/resources/${locale}/${ns}.json`));

        const inst = makeInstance({
            'zh-CN': { common: load('zh-CN', 'common'), errors: load('zh-CN', 'errors') },
            'en-US': { common: load('en-US', 'common'), errors: load('en-US', 'errors') },
        });

        assert.equal(inst.t('actions.close'), '关闭');
        assert.match(
            inst.t('errors:provider.connectionFailed', { provider: 'OpenAI' }),
            /OpenAI/,
            '供应商名必须原样插入，不被翻译',
        );
    });
});
