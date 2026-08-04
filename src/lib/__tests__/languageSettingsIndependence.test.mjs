/**
 * 三类语言设置的独立性。
 *
 * 设计规格反复强调的核心约束：
 *
 *   uiLocale            界面语言        'zh-CN' | 'en-US'
 *   sttLanguage         语音识别语言    内部键 'chinese'
 *   aiResponseLanguage  AI 回复语言     'Chinese'
 *
 * 三者互不隶属。把界面切成英文的用户完全可能仍在开中文会议；反过来，
 * 用中文界面的用户也可能需要英文 AI 回复。任何一处「顺手把另外两个也改了」
 * 的便利实现，都会让用户在毫无提示的情况下丢失设置。
 *
 * 这里用 AST 扫描函数体，而非全文正则——全文匹配无法区分
 * 「handleUiLocaleChange 里调用了 setRecognitionLanguage」和
 * 「文件中别处调用了 setRecognitionLanguage」。
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../..');
const rel = 'src/components/SettingsOverlay.tsx';
const source = fs.readFileSync(path.join(root, rel), 'utf8');

const sourceFile = ts.createSourceFile(rel, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

/** 找到指定名字的函数/箭头函数声明，返回其函数体源码。 */
function findFunctionBody(name) {
    let body = null;

    const visit = (node) => {
        if (body) return;

        // const name = (...) => { ... }  /  const name = async (...) => { ... }
        if (
            ts.isVariableDeclaration(node)
            && ts.isIdentifier(node.name)
            && node.name.text === name
            && node.initializer
            && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
        ) {
            body = node.initializer.body.getText(sourceFile);
            return;
        }

        // function name(...) { ... }
        if (ts.isFunctionDeclaration(node) && node.name?.text === name && node.body) {
            body = node.body.getText(sourceFile);
            return;
        }

        ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return body;
}

/** 收集函数体内被调用的函数名。 */
function calledNames(bodyText) {
    const wrapped = ts.createSourceFile('body.tsx', bodyText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const names = new Set();
    const visit = (node) => {
        if (ts.isCallExpression(node)) {
            if (ts.isIdentifier(node.expression)) names.add(node.expression.text);
            else if (ts.isPropertyAccessExpression(node.expression)) names.add(node.expression.name.text);
        }
        ts.forEachChild(node, visit);
    };
    visit(wrapped);
    return names;
}

describe('切换界面语言不触碰另外两个设置', () => {
    test('存在界面语言切换处理函数', () => {
        assert.ok(
            findFunctionBody('handleUiLocaleChange'),
            '必须存在独立的 handleUiLocaleChange —— 界面语言不能与其他语言共用一个 setter',
        );
    });

    test('handleUiLocaleChange 不调用语音识别或 AI 回复的 setter', () => {
        const body = findFunctionBody('handleUiLocaleChange');
        assert.ok(body, '未找到 handleUiLocaleChange');
        const called = calledNames(body);

        assert.ok(
            !called.has('setRecognitionLanguage'),
            '切换界面语言绝不能顺带改动语音识别语言',
        );
        assert.ok(
            !called.has('setAiResponseLanguage'),
            '切换界面语言绝不能顺带改动 AI 回复语言',
        );
        assert.ok(
            called.has('setUiLocale'),
            'handleUiLocaleChange 必须调用 setUiLocale',
        );
    });

    test('保存失败时回滚下拉框，不留下界面与实际不一致的状态', () => {
        const body = findFunctionBody('handleUiLocaleChange');
        assert.match(
            body,
            /success/,
            '必须检查 setUiLocale 的返回值——失败时要回滚选择并提示重试',
        );
    });
});

describe('一键切换中文语音与回答', () => {
    test('存在显式的一键处理函数', () => {
        assert.ok(
            findFunctionBody('handleSwitchToChineseSpeech'),
            '必须提供显式的一键按钮，而不是在切换界面语言时隐式代劳',
        );
    });

    test('只调用现有的两个语言 setter，不碰界面语言', () => {
        const body = findFunctionBody('handleSwitchToChineseSpeech');
        assert.ok(body, '未找到 handleSwitchToChineseSpeech');
        const called = calledNames(body);

        assert.ok(called.has('setRecognitionLanguage'), '必须设置语音识别语言');
        assert.ok(called.has('setAiResponseLanguage'), '必须设置 AI 回复语言');
        assert.ok(
            !called.has('setUiLocale'),
            '一键切换语音与回答不应反过来改动界面语言',
        );
    });

    test('使用内部键 chinese 与 Chinese，而非 bcp47 或展示名', () => {
        const body = findFunctionBody('handleSwitchToChineseSpeech');
        assert.match(body, /'chinese'/, "语音识别必须用内部键 'chinese'");
        assert.match(body, /'Chinese'/, "AI 回复必须用 code 'Chinese'");
        assert.doesNotMatch(body, /'zh-CN'/, 'bcp47 是内部映射值，不能直接当识别语言键');
    });
});

describe('三个控件各自独立', () => {
    test('界面语言使用 uiLocale 状态，与另两个 state 分离', () => {
        assert.match(source, /useState<'zh-CN'\s*\|\s*'en-US'>/, '界面语言必须有自己的 state');
        assert.match(source, /const \[recognitionLanguage/, '语音识别语言保留独立 state');
        assert.match(source, /const \[aiResponseLanguage/, 'AI 回复语言保留独立 state');
    });
});
