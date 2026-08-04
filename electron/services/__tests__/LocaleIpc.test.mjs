/**
 * 界面语言 IPC 契约测试。
 *
 * 多窗口同步是本地化最容易出错的地方：Natively 有启动器、设置、会议界面等
 * 多个 BrowserWindow，只靠单窗口 localStorage 会出现「设置窗切成中文、
 * 会议窗还是英文」的割裂状态。这里锁定四件事：
 *
 *   1. get/set 两个通道都经 safeHandle 注册（与既有 IPC 约定一致）；
 *   2. setter 成功后向**所有**窗口广播 ui-locale-changed；
 *   3. preload 暴露的三个 API 齐全，且 listener 返回清理函数；
 *   4. 渲染层类型声明与 preload 完全一致——否则 TS 通过但运行时 undefined。
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const ipcSource = read('electron/ipcHandlers.ts');
const preloadSource = read('electron/preload.ts');
const rendererTypes = read('src/types/electron.d.ts');
const settingsSource = read('electron/services/SettingsManager.ts');

describe('主进程 IPC 注册', () => {
    test('get-ui-locale 与 set-ui-locale 都经 safeHandle 注册', () => {
        assert.match(ipcSource, /safeHandle\(\s*['"]get-ui-locale['"]/);
        assert.match(ipcSource, /safeHandle\(\s*['"]set-ui-locale['"]/);
    });

    test('setter 成功后广播 ui-locale-changed 到所有窗口', () => {
        assert.match(ipcSource, /appState\.broadcast\(\s*['"]ui-locale-changed['"]/);
    });

    test('广播发生在 set-ui-locale 处理函数内部', () => {
        const start = ipcSource.indexOf("safeHandle('set-ui-locale'");
        assert.ok(start > 0, '未找到 set-ui-locale 处理函数');
        // 取该 handler 到下一个 safeHandle 之间的片段
        const rest = ipcSource.slice(start + 10);
        const next = rest.indexOf('safeHandle(');
        const body = next === -1 ? rest : rest.slice(0, next);
        assert.match(
            body,
            /appState\.broadcast\(\s*['"]ui-locale-changed['"]/,
            'ui-locale-changed 必须由 set-ui-locale 触发，否则其他窗口不会同步',
        );
    });

    test('保存失败时返回 locale-save-failed 且不广播', () => {
        assert.match(ipcSource, /locale-save-failed/);
    });
});

describe('AppSettings 持久化字段', () => {
    test('uiLocale 是独立字段，与语音/回复语言分开', () => {
        assert.match(
            settingsSource,
            /uiLocale\?:\s*'zh-CN'\s*\|\s*'en-US'/,
            'uiLocale 必须是 AppSettings 上的独立字段',
        );
    });
});

describe('preload 暴露的 API', () => {
    test('三个 API 在接口声明中齐全', () => {
        assert.match(preloadSource, /getUiLocale:\s*\(\)\s*=>\s*Promise<'zh-CN'\s*\|\s*'en-US'>/);
        assert.match(preloadSource, /setUiLocale:\s*\(/);
        assert.match(preloadSource, /onUiLocaleChanged:\s*\(/);
    });

    test('setUiLocale 返回 success/locale/error 三元组', () => {
        const idx = preloadSource.indexOf('setUiLocale:');
        assert.ok(idx > 0);
        const slice = preloadSource.slice(idx, idx + 400);
        assert.match(slice, /success:\s*boolean/);
        assert.match(slice, /locale:\s*'zh-CN'\s*\|\s*'en-US'/);
        assert.match(slice, /error\?:\s*string/);
    });

    test('onUiLocaleChanged 返回清理函数并移除监听', () => {
        // 匹配到分号为止——声明含嵌套括号 (listener: (locale: ...) => void)，
        // 用 [^)]* 会在第一个内层右括号处截断。
        assert.match(
            preloadSource,
            /onUiLocaleChanged:[^;]*=>\s*\(\)\s*=>\s*void/,
            'listener 必须返回 () => void 清理函数',
        );
        const implIdx = preloadSource.lastIndexOf('onUiLocaleChanged:');
        const impl = preloadSource.slice(implIdx, implIdx + 500);
        assert.match(
            impl,
            /removeListener\(\s*['"]ui-locale-changed['"]/,
            '清理函数必须真正 removeListener，否则窗口重建后监听器泄漏',
        );
    });
});

describe('渲染层类型声明一致性', () => {
    test('electron.d.ts 与 preload 的三个 API 对齐', () => {
        assert.match(rendererTypes, /getUiLocale:\s*\(\)\s*=>\s*Promise<'zh-CN'\s*\|\s*'en-US'>/);
        assert.match(rendererTypes, /setUiLocale:\s*\(/);
        assert.match(rendererTypes, /onUiLocaleChanged:\s*\(/);
    });

    test('locale 联合类型在三处完全一致', () => {
        // 类型漂移会让 TS 编译通过但运行时行为不一致
        for (const [name, source] of [
            ['preload.ts', preloadSource],
            ['electron.d.ts', rendererTypes],
        ]) {
            assert.ok(
                source.includes("'zh-CN' | 'en-US'"),
                `${name} 必须使用 'zh-CN' | 'en-US' 联合类型`,
            );
        }
    });
});
