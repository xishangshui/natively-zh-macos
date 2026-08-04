/**
 * 中文构建的语音识别 / AI 回复默认值。
 *
 * 核心不变量：**缺省值只对从未设置过的配置生效**。
 * 如果缺省逻辑意外覆盖已有值，用户的语音识别语言会在装了中文版之后被
 * 悄悄改掉——而语音识别语言和界面语言是两个独立的概念，装中文界面
 * 不代表用户要用中文开会。
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../..');
const compiled = path.join(root, 'dist-electron/electron/config/distribution.js');

if (!fs.existsSync(compiled)) {
    throw new Error(`未找到编译产物：${compiled}\n请先运行 npm run build:electron`);
}

const { DISTRIBUTION, resolveStoredLanguage } = await import(pathToFileURL(compiled).href);

const credentialsSource = fs.readFileSync(
    path.join(root, 'electron/services/CredentialsManager.ts'),
    'utf8',
);
const languagesSource = fs.readFileSync(
    path.join(root, 'electron/config/languages.ts'),
    'utf8',
);

describe('中文构建的语言缺省值', () => {
    test('语音识别缺省为简体中文内部键', () => {
        assert.equal(DISTRIBUTION.defaultSttLanguage, 'chinese');
    });

    test('AI 回复缺省为 Chinese', () => {
        assert.equal(DISTRIBUTION.defaultAiResponseLanguage, 'Chinese');
    });

    test('缺省值必须是 languages.ts 中真实存在的条目', () => {
        // 写错一个字符会导致下拉框选不中、STT 启动时回退英文，
        // 而这类问题在界面上看不出来。
        assert.match(
            languagesSource,
            /'chinese':\s*\{[^}]*bcp47:\s*'zh-CN'[^}]*iso639:\s*'zh'/,
            "languages.ts 中必须存在 key 为 'chinese'、bcp47 为 zh-CN 的识别项",
        );
        assert.match(
            languagesSource,
            /\{\s*label:\s*'Chinese',\s*code:\s*'Chinese'\s*\}/,
            "AI_RESPONSE_LANGUAGES 中必须存在 code 为 'Chinese' 的条目",
        );
    });
});

describe('已有配置不被缺省值覆盖', () => {
    test('已存的非空值原样返回', () => {
        assert.equal(resolveStoredLanguage('english-us', 'chinese'), 'english-us');
        assert.equal(resolveStoredLanguage('japanese', 'chinese'), 'japanese');
        assert.equal(resolveStoredLanguage('auto', 'Chinese'), 'auto');
        assert.equal(resolveStoredLanguage('English', 'Chinese'), 'English');
    });

    test('未设置或空白时才回退缺省值', () => {
        for (const empty of [undefined, null, '', '   ']) {
            assert.equal(resolveStoredLanguage(empty, 'chinese'), 'chinese');
        }
    });
});

describe('CredentialsManager 接线', () => {
    test('两个 getter 使用发行配置的缺省值，而非硬编码英文', () => {
        assert.match(
            credentialsSource,
            /getSttLanguage\(\)[\s\S]{0,200}DISTRIBUTION\.defaultSttLanguage/,
            'getSttLanguage 必须回退到 DISTRIBUTION.defaultSttLanguage',
        );
        assert.match(
            credentialsSource,
            /getAiResponseLanguage\(\)[\s\S]{0,200}DISTRIBUTION\.defaultAiResponseLanguage/,
            'getAiResponseLanguage 必须回退到 DISTRIBUTION.defaultAiResponseLanguage',
        );
    });

    test('不再残留上游的硬编码英文缺省', () => {
        assert.doesNotMatch(
            credentialsSource,
            /sttLanguage\s*\|\|\s*'english-us'/,
            '硬编码的 english-us 缺省必须移除，否则中文构建仍以英文识别启动',
        );
    });
});
