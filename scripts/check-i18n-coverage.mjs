/**
 * 用户可见英文残留扫描门禁。
 *
 * 用 TypeScript AST 而非正则扫描，因为正则无法区分「JSX 里给用户看的文字」
 * 和「注释、日志、内部事件名、prompt」。误报会逼人放宽规则，最终门禁失效。
 *
 * 扫描四类位置：
 *   1. JSX 文本节点
 *   2. 静态文本属性：placeholder / title / aria-label / alt
 *   3. alert / confirm / toast 的字面量实参
 *   4. set*Error / set*Message / set*Status / set*Title / set*Label 的字面量实参
 *
 * **不扫描**：className、日志、console、内部 prompt、事件名、import 路径。
 * 这些即使是英文也不该翻译。
 *
 * 允许名单必须逐字面量精确匹配 { file, literal, reason }，
 * 且过期条目（allowlist 里有、实际已不存在）同样导致失败——
 * 否则名单会随迁移不断膨胀成一张永远绿灯的挡箭牌。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '..');
export const SCOPE_FILE = path.join(ROOT, 'scripts/i18n-scope.json');
export const ALLOWLIST_FILE = path.join(ROOT, 'scripts/i18n-allowlist.json');

/** 需要翻译的文本属性。className/href/src 等不在此列。 */
const TEXT_ATTRIBUTES = new Set(['placeholder', 'title', 'aria-label', 'alt', 'aria-description']);

/** 直接面向用户的调用。 */
const USER_FACING_CALLS = new Set(['alert', 'confirm', 'toast']);

/** setXxxError / setXxxMessage / ... 这类把文案写进 state 的 setter。 */
const STATE_SETTER_PATTERN = /^set[A-Za-z0-9]*(Error|Message|Status|Title|Label)$/;

/**
 * 判断一段文字是否是「给用户看的英文」。
 *
 * 保守策略：必须含至少一个 2 字母以上的单词；含中日韩字符的直接放行
 * （已翻译或本就是中文）；纯符号、纯数字、单字母不算。
 */
export function isUserFacingEnglish(raw) {
    if (typeof raw !== 'string') return false;
    const text = raw.trim();
    if (text.length < 2) return false;

    // 已含中文/日文/韩文 → 视为已翻译或本就非英文
    if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]/.test(text)) return false;

    // 必须含一个 2 字母以上的英文单词
    if (!/[A-Za-z]{2,}/.test(text)) return false;

    // i18next 语义键本身（含点号、无空格）不算残留文案
    if (/^[a-z][A-Za-z0-9]*(\.[a-z][A-Za-z0-9]*)+$/.test(text)) return false;

    return true;
}

/**
 * 判断调用实参是否像**散文文案**而非状态机枚举值。
 *
 * `set*Status` 这类 setter 既承载用户可见文字（"Local AI memory ready"），
 * 也承载内部枚举（'downloading' / 'idle' / 'complete'）。翻译后者会直接
 * 破坏状态判断，因此必须区分。
 *
 * 判据：散文含空格，或以大写字母开头（英文句子的普遍特征）；
 * 而 JS 里的状态枚举惯例是全小写单词。
 * 仅用于调用实参——JSX 文本和 aria 属性不适用（它们本就是给用户看的）。
 */
export function looksLikeProse(text) {
    const t = text.trim();
    return /\s/.test(t) || /^[A-Z]/.test(t);
}

/**
 * 把简单 glob 转成正则，支持 `**` 跨层、`*` 单层。
 * 逐字符解析，不用占位符替换——那种写法在含特殊字符的模式下极易出错。
 */
export function globToRegExp(pattern) {
    const src = pattern.split('\\').join('/');
    const SPECIAL = '.+^${}()|[]';
    let out = '';
    let i = 0;

    while (i < src.length) {
        const ch = src[i];
        if (ch === '*') {
            if (src[i + 1] === '*') {
                if (src[i + 2] === '/') {
                    out += '(?:[^/]*/)*';
                    i += 3;
                } else {
                    out += '.*';
                    i += 2;
                }
            } else {
                out += '[^/]*';
                i += 1;
            }
        } else {
            if (SPECIAL.includes(ch)) out += '\\';
            out += ch;
            i += 1;
        }
    }

    return new RegExp('^' + out + '$');
}

export function loadJson(file, fallback) {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/** 依据 scope 配置解析出实际要扫描的文件（相对 ROOT 的 posix 路径）。 */
export function resolveScopedFiles(scope) {
    const includePatterns = (scope.enforcedFiles ?? []).map(globToRegExp);
    const excludePatterns = (scope.excluded ?? []).map((e) =>
        globToRegExp(typeof e === 'string' ? e : e.pattern),
    );
    if (includePatterns.length === 0) return [];

    const results = [];
    const walk = (dir) => {
        if (!fs.existsSync(dir)) return;
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const abs = path.join(dir, entry.name);
            const rel = path.relative(ROOT, abs).split('\\').join('/');
            if (entry.isDirectory()) {
                if (entry.name === 'node_modules' || entry.name === '.git') continue;
                walk(abs);
            } else if (/\.(tsx|ts|mts)$/.test(entry.name)) {
                if (!includePatterns.some((re) => re.test(rel))) continue;
                if (excludePatterns.some((re) => re.test(rel))) continue;
                results.push(rel);
            }
        }
    };
    walk(path.join(ROOT, 'src'));
    walk(path.join(ROOT, 'electron'));

    return results.sort();
}

/** 扫描单个文件的源码文本，返回命中列表。 */
export function scanSource(relPath, sourceText) {
    const sourceFile = ts.createSourceFile(
        relPath,
        sourceText,
        ts.ScriptTarget.Latest,
        /* setParentNodes */ true,
        relPath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );

    const findings = [];
    const record = (node, literal, kind) => {
        if (!isUserFacingEnglish(literal)) return;
        // 调用实参额外要求像散文，避免把状态机枚举值当成待翻译文案
        if (kind.startsWith('call:') && !looksLikeProse(literal)) return;
        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        findings.push({ file: relPath, line: line + 1, literal: literal.trim(), kind });
    };

    const stringFromExpression = (node) => {
        if (!node) return null;
        if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
        return null;
    };

    const visit = (node) => {
        // 1. JSX 文本
        if (ts.isJsxText(node)) {
            record(node, node.text, 'jsx-text');
        }

        // 2. 文本属性
        if (ts.isJsxAttribute(node) && node.name) {
            const attrName = ts.isIdentifier(node.name)
                ? node.name.text
                : node.name.getText(sourceFile);
            if (TEXT_ATTRIBUTES.has(attrName) && node.initializer) {
                let literal = null;
                if (ts.isStringLiteral(node.initializer)) {
                    literal = node.initializer.text;
                } else if (ts.isJsxExpression(node.initializer)) {
                    literal = stringFromExpression(node.initializer.expression);
                }
                if (literal !== null) record(node, literal, 'attr:' + attrName);
            }
        }

        // 3/4. 面向用户的调用实参
        if (ts.isCallExpression(node)) {
            let calleeName = null;
            if (ts.isIdentifier(node.expression)) {
                calleeName = node.expression.text;
            } else if (ts.isPropertyAccessExpression(node.expression)) {
                calleeName = node.expression.name.text;
            }

            const isUserFacing =
                calleeName
                && (USER_FACING_CALLS.has(calleeName) || STATE_SETTER_PATTERN.test(calleeName));

            if (isUserFacing) {
                for (const arg of node.arguments) {
                    const literal = stringFromExpression(arg);
                    if (literal !== null) record(arg, literal, 'call:' + calleeName);
                }
            }
        }

        ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return findings;
}

/**
 * 执行完整扫描。
 * 返回 { findings, staleAllowlist, scannedFiles }；前两者都为空才算通过。
 *
 * 参数可注入，便于测试用临时 fixture 验证门禁工具本身的行为。
 */
export function runCoverage({ scope, allowlist, readFile } = {}) {
    const resolvedScope = scope ?? loadJson(SCOPE_FILE, { enforcedFiles: [], excluded: [] });
    const resolvedAllowlist = allowlist ?? loadJson(ALLOWLIST_FILE, { allowed: [] });
    const entries = resolvedAllowlist.allowed ?? [];

    const files = resolvedScope.files ?? resolveScopedFiles(resolvedScope);
    const read = readFile ?? ((rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8'));

    const allFindings = [];
    for (const rel of files) {
        allFindings.push(...scanSource(rel, read(rel)));
    }

    // 命中 allowlist 的从结果里剔除，并标记该条目被用到过
    const used = new Set();
    const findings = allFindings.filter((finding) => {
        const idx = entries.findIndex(
            (e) => e.file === finding.file && e.literal === finding.literal,
        );
        if (idx === -1) return true;
        used.add(idx);
        return false;
    });

    const staleAllowlist = entries.filter((_, idx) => !used.has(idx));

    return { findings, staleAllowlist, scannedFiles: files };
}

// CLI 入口
const isDirectRun =
    process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
    const { findings, staleAllowlist, scannedFiles } = runCoverage();
    let failed = false;

    if (findings.length > 0) {
        failed = true;
        console.error('发现 ' + findings.length + ' 处未处理的用户可见英文：\n');
        for (const f of findings) {
            console.error('  ' + f.file + ':' + f.line + '  [' + f.kind + ']  ' + JSON.stringify(f.literal));
        }
        console.error('\n每一处只能二选一：迁移为语义键，或写入 scripts/i18n-allowlist.json 并说明理由。');
    }

    if (staleAllowlist.length > 0) {
        failed = true;
        console.error('\n发现 ' + staleAllowlist.length + ' 条过期 allowlist（实际已不存在）：\n');
        for (const e of staleAllowlist) {
            console.error('  ' + e.file + '  ' + JSON.stringify(e.literal));
        }
        console.error('\n过期条目必须删除，否则名单会膨胀成永远绿灯的挡箭牌。');
    }

    if (failed) process.exit(1);
    console.log('i18n 覆盖扫描通过：' + scannedFiles.length + ' 个文件在门禁范围内，无残留用户可见英文。');
}
