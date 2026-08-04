/**
 * 双语词典完整性门禁。
 *
 * 中文与英文的键集合必须**完全一致**——缺键会让界面回退到英文却不报错，
 * 是本地化项目里最容易悄悄劣化的地方。插值变量集合同样必须一致，否则
 * `t('x', { count })` 在一种语言下渲染正常、另一种语言下丢失数字。
 *
 * 既可作为 CLI 运行（npm run check:i18n），也被
 * src/lib/__tests__/i18nCatalogParity.test.mjs 导入，保证门禁与测试
 * 使用同一套判定逻辑，不会各写一份而漂移。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '..');
export const RESOURCES_DIR = path.join(ROOT, 'src/i18n/resources');

/** 基准语言。英文资源是从现有界面文案提取出的正式基线，不是从中文反推。 */
export const BASE_LOCALE = 'en-US';
export const TARGET_LOCALE = 'zh-CN';
export const LOCALES = [BASE_LOCALE, TARGET_LOCALE];

/** 按业务域拆分，避免单个翻译文件过大导致合并冲突。 */
export const NAMESPACES = [
    'common',
    'launcher',
    'meeting',
    'settings',
    'providers',
    'history',
    'onboarding',
    'help',
    'updates',
    'errors',
];

/**
 * 语义键规范：至少两段，每段以小写字母开头的 camelCase。
 * 禁止用英文句子当键——那样中文改动会牵连键名。
 */
export const KEY_PATTERN = /^[a-z][A-Za-z0-9]*(\.[a-z][A-Za-z0-9]*)+$/;

/** i18next 插值语法 {{name}}，可带格式化后缀 {{name, format}}。 */
const INTERPOLATION_PATTERN = /\{\{\s*([A-Za-z0-9_]+)\s*(?:,[^}]*)?\}\}/g;

export function catalogPath(locale, namespace) {
    return path.join(RESOURCES_DIR, locale, `${namespace}.json`);
}

/** 把嵌套对象展开成点号键 → 字符串值。 */
export function flatten(value, prefix = '', out = new Map()) {
    for (const [key, child] of Object.entries(value)) {
        const full = prefix ? `${prefix}.${key}` : key;
        if (child !== null && typeof child === 'object' && !Array.isArray(child)) {
            flatten(child, full, out);
        } else {
            out.set(full, child);
        }
    }
    return out;
}

export function interpolationVars(text) {
    if (typeof text !== 'string') return [];
    const found = new Set();
    for (const match of text.matchAll(INTERPOLATION_PATTERN)) {
        found.add(match[1]);
    }
    return [...found].sort();
}

/**
 * 校验全部词典，返回问题描述数组。空数组表示通过。
 * 不抛异常——调用方决定是变成测试断言还是 CLI 退出码。
 */
export function verifyCatalogs() {
    const problems = [];
    /** @type {Record<string, Map<string, string>>} */
    const flattened = {};

    for (const locale of LOCALES) {
        for (const namespace of NAMESPACES) {
            const file = catalogPath(locale, namespace);
            const rel = path.relative(ROOT, file).replace(/\\/g, '/');

            if (!fs.existsSync(file)) {
                problems.push(`缺少词典文件：${rel}`);
                continue;
            }

            let parsed;
            try {
                parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
            } catch (err) {
                problems.push(`${rel} 不是合法 JSON：${err.message}`);
                continue;
            }

            if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
                problems.push(`${rel} 顶层必须是对象`);
                continue;
            }

            const map = flatten(parsed);
            if (map.size === 0) {
                problems.push(`${rel} 为空对象；不允许用空文件规避完整性检查`);
            }

            for (const [key, value] of map) {
                if (!KEY_PATTERN.test(key)) {
                    problems.push(`${rel} 键名不符合语义键规范：${key}`);
                }
                if (typeof value !== 'string') {
                    problems.push(`${rel} 键 ${key} 的值必须是字符串，实际为 ${typeof value}`);
                } else if (value.trim() === '') {
                    problems.push(`${rel} 键 ${key} 的值为空；缺失翻译必须回退英文而不是渲染空白`);
                }
            }

            flattened[`${locale}/${namespace}`] = map;
        }
    }

    // 键集合与插值变量对齐
    for (const namespace of NAMESPACES) {
        const base = flattened[`${BASE_LOCALE}/${namespace}`];
        const target = flattened[`${TARGET_LOCALE}/${namespace}`];
        if (!base || !target) continue;

        for (const key of base.keys()) {
            if (!target.has(key)) {
                problems.push(`${TARGET_LOCALE}/${namespace}.json 缺少键：${key}`);
            }
        }
        for (const key of target.keys()) {
            if (!base.has(key)) {
                problems.push(`${BASE_LOCALE}/${namespace}.json 缺少键：${key}（多出的中文键）`);
            }
        }

        for (const [key, baseValue] of base) {
            if (!target.has(key)) continue;
            const baseVars = interpolationVars(baseValue);
            const targetVars = interpolationVars(target.get(key));
            if (baseVars.join(',') !== targetVars.join(',')) {
                problems.push(
                    `${namespace}.json 键 ${key} 插值变量不一致：`
                    + `${BASE_LOCALE}=[${baseVars}] ${TARGET_LOCALE}=[${targetVars}]`,
                );
            }
        }
    }

    return problems;
}

// CLI 入口。用 pathToFileURL 而非手拼 file:// 字符串——Windows 盘符与反斜杠
// 手拼极易出错（上游测试就踩过 D:\D:\ 的坑）。
const isDirectRun =
    process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
    const problems = verifyCatalogs();
    if (problems.length > 0) {
        console.error(`i18n 词典校验失败，共 ${problems.length} 个问题：\n`);
        for (const p of problems) console.error(`  - ${p}`);
        process.exit(1);
    }
    console.log(`i18n 词典校验通过：${LOCALES.length} 种语言 × ${NAMESPACES.length} 个 namespace。`);
}
