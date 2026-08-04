/**
 * 残留英文覆盖门禁测试。
 *
 * 分两层：
 *   1. **门禁工具自身行为**——用内存 fixture 验证「硬编码英文会失败、
 *      t() 调用会通过、精确 allowlist 会通过、过期 allowlist 会失败」。
 *      这层保证门禁本身没坏，与项目迁移进度无关。
 *   2. **当前 scope 实际状态**——scripts/i18n-scope.json 里已纳入门禁的
 *      文件必须零残留。随着 Task 7-14 逐步扩大 scope，这层会持续收紧。
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
    isUserFacingEnglish,
    looksLikeProse,
    looksLikeStyling,
    globToRegExp,
    scanSource,
    runCoverage,
} from '../../../scripts/check-i18n-coverage.mjs';

/** 用内存 fixture 跑一次扫描，不碰真实文件系统。 */
function scanFixture(sources, allowlist = { allowed: [] }) {
    return runCoverage({
        scope: { files: Object.keys(sources) },
        allowlist,
        readFile: (rel) => sources[rel],
    });
}

describe('门禁工具：英文判定', () => {
    test('识别用户可见英文', () => {
        assert.equal(isUserFacingEnglish('Start Meeting'), true);
        assert.equal(isUserFacingEnglish('No meetings yet'), true);
    });

    test('放行中文、符号、数字和语义键', () => {
        assert.equal(isUserFacingEnglish('开始会议'), false);
        assert.equal(isUserFacingEnglish('—'), false);
        assert.equal(isUserFacingEnglish('123'), false);
        assert.equal(isUserFacingEnglish('  '), false);
        assert.equal(isUserFacingEnglish('common.actions.close'), false);
    });
});

describe('门禁工具：样式与代码识别', () => {
    // 这是整个门禁最关键的判别器。勘测 57 个 .tsx 发现「含空格的英文」共 5728 处，
    // 其中 2518 处是 Tailwind 类名。若不能可靠区分样式与文案，
    // 要么漏报（位置白名单永远追不完），要么误报到无法使用。
    test('识别 Tailwind 类名', () => {
        assert.equal(looksLikeStyling('flex items-center gap-4'), true);
        assert.equal(looksLikeStyling('text-[10px] font-medium px-1.5 rounded-full'), true);
        assert.equal(looksLikeStyling('bg-amber-100 text-amber-700 border border-amber-300'), true);
        assert.equal(looksLikeStyling('hover:bg-white/10 transition-colors duration-100'), true);
    });

    test('识别 CSS 值与颜色', () => {
        assert.equal(looksLikeStyling('rgba(0, 0, 0, 0.35)'), true);
        assert.equal(looksLikeStyling('#1C1C1E'), true);
        assert.equal(looksLikeStyling('linear-gradient(160deg, #5B8EF0 0%, #3B6FE8 50%)'), true);
        assert.equal(looksLikeStyling('0 4px 12px rgba(0,0,0,0.35)'), true);
        assert.equal(looksLikeStyling('cubic-bezier(0.16, 1, 0.3, 1)'), true);
    });

    test('识别 SVG 路径数据', () => {
        assert.equal(looksLikeStyling('M3 7.5L6 4.5L9 7.5'), true);
    });

    test('不把真实文案误判为样式', () => {
        assert.equal(looksLikeStyling('Start Meeting'), false);
        assert.equal(looksLikeStyling('No recent meetings.'), false);
        assert.equal(looksLikeStyling('Ultra-fast low latency transcription'), false);
        assert.equal(looksLikeStyling('Today at 3:14pm'), false);
        assert.equal(looksLikeStyling('Are you sure you want to delete this?'), false);
    });

    test('样式串不会进入扫描结果', () => {
        const { findings } = scanFixture({
            'fixture/Styled.tsx': [
                'export const A = ({ on }) => (',
                '  <div',
                '    className={on ? "bg-blue-500 text-white px-4" : "bg-gray-200 text-black px-4"}',
                '    style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.35)", padding: "8px 14px" }}',
                '  >',
                '    <svg><path d="M3 7.5L6 4.5L9 7.5" /></svg>',
                '  </div>',
                ');',
            ].join('\n'),
        });
        assert.deepEqual(findings, [], '样式与 SVG 几何数据不得触发门禁');
    });
});

describe('门禁工具：加固后新增的位置', () => {
    test('return 语句里的文案会被捕获', () => {
        // 回归用例：日期分组标签 `if (isToday) return 'Today';`
        const { findings } = scanFixture({
            'fixture/Ret.tsx': [
                'function label(d){',
                "  if (d.today) return 'Today';",
                "  if (d.yesterday) return 'Yesterday';",
                "  return 'flex items-center gap-2';",
                '}',
            ].join('\n'),
        });
        assert.deepEqual(
            findings.map((f) => f.literal).sort(),
            ['Today', 'Yesterday'],
            'className 返回值不应被捕获，日期标签应被捕获',
        );
    });

    test('数组元素里的文案会被捕获', () => {
        const { findings } = scanFixture({
            'fixture/Arr.tsx':
                "const BULLETS = ['Repo aware explanations', 'Faster iteration on features'];",
        });
        assert.equal(findings.length, 2);
        assert.equal(findings[0].kind, 'array-elem');
    });

    test('组件 prop 承载的描述会被捕获', () => {
        // 回归用例：<ModelOption desc="Custom cURL" /> 曾完全在扫描范围外
        const { findings } = scanFixture({
            'fixture/Prop.tsx':
                'export const A = () => <Item desc="Ultra-fast low latency transcription" badge="New release" />;',
        });
        assert.deepEqual(
            findings.map((f) => f.kind).sort(),
            ['attr:badge', 'attr:desc'],
        );
    });

    test('模板字符串里的文案段会被捕获', () => {
        const { findings } = scanFixture({
            'fixture/Tpl.tsx':
                'function f(p){ setStatusMessage(`Setting up AI memory... ${p}%`); }',
        });
        assert.equal(findings.length, 1);
        assert.match(findings[0].literal, /Setting up AI memory/);
    });

    test('className 模板字符串不被误报', () => {
        const { findings } = scanFixture({
            'fixture/TplCls.tsx':
                'export const A = ({on}) => <div className={`flex items-center ${on ? "bg-blue-500" : "bg-gray-200"} px-4 py-2`} />;',
        });
        assert.deepEqual(findings, []);
    });
});

describe('门禁工具：glob 解析', () => {
    test('* 只匹配单层，** 跨层', () => {
        assert.equal(globToRegExp('src/*.tsx').test('src/App.tsx'), true);
        assert.equal(globToRegExp('src/*.tsx').test('src/a/b.tsx'), false);
        assert.equal(globToRegExp('src/components/**/*.tsx').test('src/components/a/b/C.tsx'), true);
        assert.equal(globToRegExp('src/components/**/*.tsx').test('src/components/C.tsx'), true);
    });

    test('点号按字面匹配，不当通配符', () => {
        assert.equal(globToRegExp('src/App.tsx').test('src/AppXtsx'), false);
    });
});

describe('门禁工具：扫描行为', () => {
    test('硬编码 JSX 英文会被捕获', () => {
        const { findings } = scanFixture({
            'fixture/Bad.tsx': 'export const A = () => <div>Start Meeting</div>;',
        });
        assert.equal(findings.length, 1);
        assert.equal(findings[0].literal, 'Start Meeting');
        assert.equal(findings[0].kind, 'jsx-text');
    });

    test('t() 调用会通过', () => {
        const { findings } = scanFixture({
            'fixture/Good.tsx':
                "export const A = () => <div>{t('meeting.audio.system.start')}</div>;",
        });
        assert.deepEqual(findings, []);
    });

    test('placeholder / aria-label / title 属性会被捕获', () => {
        const { findings } = scanFixture({
            'fixture/Attr.tsx':
                'export const A = () => <input placeholder="Search meetings" aria-label="Search" />;',
        });
        assert.equal(findings.length, 2);
        assert.deepEqual(
            findings.map((f) => f.kind).sort(),
            ['attr:aria-label', 'attr:placeholder'],
        );
    });

    test('state setter 与 alert 的英文实参会被捕获', () => {
        const { findings } = scanFixture({
            'fixture/State.tsx':
                'function f(){ setUploadError("Upload failed"); alert("Are you sure?"); }',
        });
        assert.equal(findings.length, 2);
        assert.deepEqual(
            findings.map((f) => f.kind).sort(),
            ['call:alert', 'call:setUploadError'],
        );
    });

    test('状态机枚举值不被当成待翻译文案', () => {
        // 回归用例：setOllamaPullStatus('downloading') 是内部状态值，
        // 翻译它会破坏状态判断；同一 setter 家族里的散文消息仍须捕获。
        const { findings } = scanFixture({
            'fixture/Enum.tsx': [
                'function f(){',
                "  setOllamaPullStatus('downloading');",
                "  setOllamaPullStatus('idle');",
                "  setOllamaPullStatus('complete');",
                "  setOllamaPullMessage('Local AI memory ready');",
                '}',
            ].join('\n'),
        });
        assert.equal(findings.length, 1, '只有散文消息该被报出，枚举值不该');
        assert.equal(findings[0].literal, 'Local AI memory ready');
    });

    test('|| 与 ?? 兜底文案会被捕获', () => {
        // 回归用例：setOllamaPullMessage(data.status || 'Downloading...') 这类
        // 兜底串是用户在异常路径上真正看到的文字，只看顶层实参节点会整类漏掉。
        const { findings } = scanFixture({
            'fixture/Fallback.tsx': [
                'function f(data){',
                "  setPullMessage(data.status || 'Downloading now');",
                "  setPullLabel(data.label ?? 'Please wait');",
                "  setPullTitle(data.ok ? 'All done' : 'Something failed');",
                '}',
            ].join('\n'),
        });
        assert.deepEqual(
            findings.map((f) => f.literal).sort(),
            ['All done', 'Downloading now', 'Please wait', 'Something failed'],
        );
    });

    test('looksLikeProse 区分散文与枚举', () => {
        assert.equal(looksLikeProse('Local AI memory ready'), true);
        assert.equal(looksLikeProse('Connecting'), true);
        assert.equal(looksLikeProse('downloading'), false);
        assert.equal(looksLikeProse('idle'), false);
    });

    test('className、console、import 路径不被误报', () => {
        const { findings } = scanFixture({
            'fixture/Noise.tsx': [
                'import { thing } from "./some/module";',
                'export const A = () => {',
                '  console.log("loading meeting history");',
                '  return <div className="flex items-center gap-4">{thing}</div>;',
                '};',
            ].join('\n'),
        });
        assert.deepEqual(findings, [], '门禁不得对样式类名、日志和模块路径报警');
    });

    test('JSX 表达式子节点里的字符串会被捕获', () => {
        // 回归用例：{cond ? <span>…</span> : "Ask anything…"} 这种写法
        // 同样直接渲染给用户，但它既不是 JsxText 也不是属性。
        const { findings } = scanFixture({
            'fixture/Expr.tsx': [
                'export const A = ({ v }) => (',
                '  <div>',
                '    {v ? <span>x</span> : "Ask anything about this company"}',
                '  </div>',
                ');',
            ].join('\n'),
        });
        assert.equal(findings.length, 1);
        assert.equal(findings[0].literal, 'Ask anything about this company');
        assert.equal(findings[0].kind, 'jsx-expression');
    });

    test('属性值里的三元与兜底文案会被捕获', () => {
        // 回归用例：title={isMaximized ? 'Restore' : 'Maximize'}
        const { findings } = scanFixture({
            'fixture/AttrCond.tsx':
                "export const A = ({m}) => <button title={m ? 'Restore window' : 'Maximize window'} />;",
        });
        assert.deepEqual(
            findings.map((f) => f.literal).sort(),
            ['Maximize window', 'Restore window'],
        );
    });

    test('属性位置的表达式不被当作子节点重复报告', () => {
        const { findings } = scanFixture({
            'fixture/AttrExpr.tsx':
                'export const A = () => <input placeholder={"Search meetings"} />;',
        });
        assert.equal(findings.length, 1, '同一处文案不应被报告两次');
        assert.equal(findings[0].kind, 'attr:placeholder');
    });

    test('中文文案不再被报告', () => {
        const { findings } = scanFixture({
            'fixture/Zh.tsx': 'export const A = () => <div>开始会议</div>;',
        });
        assert.deepEqual(findings, []);
    });
});

describe('门禁工具：允许名单', () => {
    const sources = {
        'fixture/Brand.tsx': 'export const A = () => <div>Natively</div>;',
    };

    test('精确命中的 allowlist 条目会放行', () => {
        const { findings, staleAllowlist } = scanFixture(sources, {
            allowed: [
                { file: 'fixture/Brand.tsx', literal: 'Natively', reason: '产品名不翻译' },
            ],
        });
        assert.deepEqual(findings, []);
        assert.deepEqual(staleAllowlist, []);
    });

    test('过期 allowlist 条目会导致失败', () => {
        const { findings, staleAllowlist } = scanFixture(sources, {
            allowed: [
                { file: 'fixture/Brand.tsx', literal: 'Natively', reason: '产品名不翻译' },
                { file: 'fixture/Brand.tsx', literal: '已经删掉的文案', reason: '过期条目' },
            ],
        });
        assert.deepEqual(findings, []);
        assert.equal(staleAllowlist.length, 1, '实际不存在的 allowlist 条目必须被报出');
        assert.equal(staleAllowlist[0].literal, '已经删掉的文案');
    });

    test('allowlist 按文件精确匹配，不跨文件生效', () => {
        const { findings } = scanFixture(
            {
                'fixture/A.tsx': 'export const A = () => <div>Natively</div>;',
                'fixture/B.tsx': 'export const B = () => <div>Natively</div>;',
            },
            {
                allowed: [{ file: 'fixture/A.tsx', literal: 'Natively', reason: '产品名' }],
            },
        );
        assert.equal(findings.length, 1, 'B.tsx 的同名文案不应被 A.tsx 的条目放行');
        assert.equal(findings[0].file, 'fixture/B.tsx');
    });
});

describe('当前 scope 实际状态', () => {
    test('已纳入门禁的文件零残留用户可见英文', () => {
        const { findings, staleAllowlist, scannedFiles } = runCoverage();

        assert.deepEqual(
            findings,
            [],
            '以下位置仍有未处理的用户可见英文：\n'
            + findings.map((f) => `  ${f.file}:${f.line} [${f.kind}] ${JSON.stringify(f.literal)}`).join('\n'),
        );
        assert.deepEqual(
            staleAllowlist,
            [],
            '存在过期 allowlist 条目：\n'
            + staleAllowlist.map((e) => `  ${e.file} ${JSON.stringify(e.literal)}`).join('\n'),
        );
        assert.ok(Array.isArray(scannedFiles));
    });
});
