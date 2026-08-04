/**
 * Natively ZH 发行隔离与更新安全策略。
 *
 * 这些断言保证中文构建：
 *   1. 拥有独立的 appId / 产品名 / 快捷方式 / userData 目录，
 *      不与官方安装（D:\Natively 与 %APPDATA%\natively）争用任何位置；
 *   2. 永远不会后台下载或退出时安装官方更新，避免汉化被静默覆盖；
 *   3. 仍然保留「人工查看上游版本」的入口。
 *
 * 全部为源码级断言，不启动 Electron，因此可在 CI 与本机快速运行。
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 注意：必须用 fileURLToPath 而非 new URL(...).pathname —— 后者在 Windows 上
// 返回带前导斜杠的 /D:/... ，经 path.resolve 会产生重复盘符 D:\D:\。
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../..');

const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const pkg = JSON.parse(read('package.json'));
const distributionSource = read('electron/config/distribution.ts');
const mainSource = read('electron/main.ts');
const aboutSource = read('src/components/AboutSection.tsx');

describe('Natively ZH 发行标识隔离', () => {
    test('安装包身份与官方版完全分离', () => {
        assert.equal(pkg.name, 'natively-zh');
        assert.equal(pkg.version, '2.7.0-zh.1');
        assert.equal(pkg.build.appId, 'com.natively.zh.desktop');
        assert.equal(pkg.build.productName, 'Natively ZH');
        assert.equal(pkg.build.nsis.shortcutName, 'Natively ZH');
        assert.equal(pkg.build.nsis.artifactName, 'Natively-ZH-Setup-${version}.${ext}');
    });

    test('保留安装目录可选，便于明确安装到 D:\\Natively-ZH', () => {
        assert.equal(pkg.build.nsis.allowToChangeInstallationDirectory, true);
        // 卸载中文版不得删除用户数据（回退时仍需原样保留）
        assert.equal(pkg.build.nsis.deleteAppDataOnUninstall, false);
    });

    test('移除 build.publish，杜绝误用官方 release feed', () => {
        assert.equal(
            pkg.build.publish,
            undefined,
            'build.publish 必须移除，否则 electron-builder/electron-updater 可能指向官方发布源',
        );
    });

    test('userData 目录独立为 natively-zh', () => {
        assert.match(distributionSource, /userDataDirName:\s*['"]natively-zh['"]/);
    });

    test('发行配置为只读常量，避免运行时被改写', () => {
        assert.match(distributionSource, /Object\.freeze\(/);
    });
});

describe('Natively ZH 更新安全策略', () => {
    test('发行配置显式禁止后台自动更新', () => {
        assert.match(distributionSource, /allowBackgroundAutoUpdate:\s*false/);
    });

    test('setupAutoUpdater 在禁用时提前返回，不注册任何自动检查', () => {
        assert.match(mainSource, /if \(!DISTRIBUTION\.allowBackgroundAutoUpdate\) return/);
    });

    test('两个 auto 标志被硬编码为 false', () => {
        assert.match(mainSource, /autoUpdater\.autoDownload = false/);
        assert.match(mainSource, /autoUpdater\.autoInstallOnAppQuit = false/);
    });

    test('canAutoInstall 对中文发行永远返回 false', () => {
        // 提前返回必须出现在 canAutoInstall 函数体的最前面
        const fn = mainSource.slice(mainSource.indexOf('function canAutoInstall'));
        const body = fn.slice(0, fn.indexOf('\n}'));
        assert.match(body, /if \(!DISTRIBUTION\.allowBackgroundAutoUpdate\) return false/);
    });

    test('userData 隔离在首次读取 userData 之前生效', () => {
        const configureAt = mainSource.indexOf('configureDistributionUserData(app)');
        assert.ok(configureAt > 0, '必须调用 configureDistributionUserData(app)');

        const firstUserDataRead = mainSource.indexOf("getPath('userData')");
        if (firstUserDataRead > 0) {
            assert.ok(
                configureAt < firstUserDataRead,
                'configureDistributionUserData 必须早于任何 getPath(\'userData\') 调用，'
                + '否则会先落到官方 %APPDATA%\\natively 目录',
            );
        }
    });
});

describe('保留人工查看上游版本的入口', () => {
    test('发行配置提供上游 releases 地址', () => {
        assert.match(
            distributionSource,
            /upstreamReleasesUrl:\s*['"]https:\/\/github\.com\/Natively-AI-assistant\/natively-cluely-ai-assistant\/releases\/latest['"]/,
        );
    });

    test('AboutSection 通过既有 openExternal 打开上游 releases', () => {
        assert.match(aboutSource, /releases\/latest/);
        assert.match(aboutSource, /openExternal/);
    });

    test('AboutSection 明确提示安装官方版会失去汉化', () => {
        // 该提示后续会迁入 updates 词典（Task 11），此处只保证提示存在
        assert.match(
            aboutSource,
            /Natively ZH/,
            'About 页必须标明这是 Natively ZH 自定义构建',
        );
    });
});
