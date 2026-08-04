/**
 * 中英文词典完整性测试。
 *
 * 判定逻辑复用 scripts/check-i18n-catalogs.mjs，保证 CI 门禁与本测试
 * 永远同步；此处只负责把问题列表变成可读的断言失败。
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

import {
    BASE_LOCALE,
    TARGET_LOCALE,
    LOCALES,
    NAMESPACES,
    KEY_PATTERN,
    catalogPath,
    flatten,
    interpolationVars,
    verifyCatalogs,
} from '../../../scripts/check-i18n-catalogs.mjs';

describe('i18n 词典完整性', () => {
    test('十个 namespace 在两种语言下都存在', () => {
        const missing = [];
        for (const locale of LOCALES) {
            for (const namespace of NAMESPACES) {
                if (!fs.existsSync(catalogPath(locale, namespace))) {
                    missing.push(`${locale}/${namespace}.json`);
                }
            }
        }
        assert.deepEqual(missing, [], `缺少词典文件：\n${missing.join('\n')}`);
    });

    test('中英文键集合完全一致', () => {
        for (const namespace of NAMESPACES) {
            const basePath = catalogPath(BASE_LOCALE, namespace);
            const targetPath = catalogPath(TARGET_LOCALE, namespace);
            if (!fs.existsSync(basePath) || !fs.existsSync(targetPath)) continue;

            const base = [...flatten(JSON.parse(fs.readFileSync(basePath, 'utf8'))).keys()].sort();
            const target = [...flatten(JSON.parse(fs.readFileSync(targetPath, 'utf8'))).keys()].sort();

            assert.deepEqual(
                target,
                base,
                `${namespace}.json 的中英文键集合不一致`,
            );
        }
    });

    test('插值变量集合在两种语言下一致', () => {
        for (const namespace of NAMESPACES) {
            const basePath = catalogPath(BASE_LOCALE, namespace);
            const targetPath = catalogPath(TARGET_LOCALE, namespace);
            if (!fs.existsSync(basePath) || !fs.existsSync(targetPath)) continue;

            const base = flatten(JSON.parse(fs.readFileSync(basePath, 'utf8')));
            const target = flatten(JSON.parse(fs.readFileSync(targetPath, 'utf8')));

            for (const [key, value] of base) {
                if (!target.has(key)) continue;
                assert.deepEqual(
                    interpolationVars(target.get(key)),
                    interpolationVars(value),
                    `${namespace}.json 键 ${key} 的插值变量不一致`,
                );
            }
        }
    });

    test('键名使用语义键而非英文句子', () => {
        const bad = [];
        for (const locale of LOCALES) {
            for (const namespace of NAMESPACES) {
                const file = catalogPath(locale, namespace);
                if (!fs.existsSync(file)) continue;
                for (const key of flatten(JSON.parse(fs.readFileSync(file, 'utf8'))).keys()) {
                    if (!KEY_PATTERN.test(key)) bad.push(`${locale}/${namespace}.json → ${key}`);
                }
            }
        }
        assert.deepEqual(bad, [], `以下键名不符合语义键规范：\n${bad.join('\n')}`);
    });

    test('没有空值——缺失翻译必须回退英文而不是渲染空白', () => {
        const empty = [];
        for (const locale of LOCALES) {
            for (const namespace of NAMESPACES) {
                const file = catalogPath(locale, namespace);
                if (!fs.existsSync(file)) continue;
                for (const [key, value] of flatten(JSON.parse(fs.readFileSync(file, 'utf8')))) {
                    if (typeof value !== 'string' || value.trim() === '') {
                        empty.push(`${locale}/${namespace}.json → ${key}`);
                    }
                }
            }
        }
        assert.deepEqual(empty, [], `以下键的值为空：\n${empty.join('\n')}`);
    });

    test('没有词典文件被 .gitignore 忽略', () => {
        // 回归用例：.gitignore 有一条裸的 `settings.json` 规则（本意是编辑器配置），
        // 会连带忽略 src/i18n/resources/*/settings.json。这类问题在本机不可见——
        // 文件存在、测试全过——但他人克隆后词典缺失，静态导入直接构建失败。
        const ignored = [];
        for (const locale of LOCALES) {
            for (const namespace of NAMESPACES) {
                const file = catalogPath(locale, namespace);
                if (!fs.existsSync(file)) continue;
                try {
                    // check-ignore 命中时退出码 0，未命中时退出码 1（抛异常）
                    execFileSync('git', ['check-ignore', '-q', file], {
                        cwd: path.dirname(file),
                        stdio: 'ignore',
                    });
                    ignored.push(`${locale}/${namespace}.json`);
                } catch {
                    // 未被忽略，正常
                }
            }
        }
        assert.deepEqual(
            ignored,
            [],
            `以下词典被 .gitignore 忽略，不会进入仓库：\n${ignored.join('\n')}`,
        );
    });

    test('完整门禁无任何问题', () => {
        const problems = verifyCatalogs();
        assert.deepEqual(
            problems,
            [],
            `i18n 词典门禁报告 ${problems.length} 个问题：\n${problems.join('\n')}`,
        );
    });
});
