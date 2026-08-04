// Regression test for UX3 fix (2026-05-28/29) in
// src/components/NativelyInterface.tsx.
//
// Pre-fix: the audio warning banner had a single "Open Settings" button
// that always called toggleSettingsWindow(), forcing the user to navigate
// from Natively's internal Settings into the macOS System Settings >
// Privacy & Security > {Microphone|Screen Recording} pane themselves.
//
// Post-fix: the banner is channel-aware:
//   - SystemAudioWarning carries an optional `channel: 'system' | 'mic'`.
//   - onSystemAudioPermissionDenied stamps channel:'system' for
//     consistency with the screen-recording-permission kind.
//   - onAudioCaptureFailed forwards payload.channel through.
//   - The button JSX picks the correct x-apple.systempreferences:... URL
//     based on (kind, channel) and falls back to toggleSettingsWindow
//     only when the channel is unknown or the platform isn't macOS.
//
// Regression guarded: a future contributor removes the `channel` field
// from the type, drops the payload.channel pass-through, or reverts the
// button back to a single "Open Settings" -> toggleSettingsWindow wire,
// silently losing the one-click direct-to-correct-pane UX.

// zh-CN 本地化说明：按钮文案已迁移到 i18n 词典，源码里不再有英文字面量。
// 本测试守护的是「通道感知的标签切换没有被回退」这一结构，因此锚点改为
// 两个互不相同的语义键，并额外断言中英词典都定义了它们——
// 断言强度不降反升：既保结构，也保用户可见文案不为空。

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../..');
const tsxPath = path.join(root, 'src/components/NativelyInterface.tsx');
const source = fs.readFileSync(tsxPath, 'utf8');

const readCatalog = (locale, ns) =>
  JSON.parse(fs.readFileSync(path.join(root, `src/i18n/resources/${locale}/${ns}.json`), 'utf8'));
const meetingZh = readCatalog('zh-CN', 'meeting');
const meetingEn = readCatalog('en-US', 'meeting');
const commonZh = readCatalog('zh-CN', 'common');
const commonEn = readCatalog('en-US', 'common');

// Locate the SystemAudioWarning type body. The type is a local alias
// inside the component body, so we scope to its `type ... = { ... };`.
const TYPE_RE =
  /type\s+SystemAudioWarning\s*=\s*\{([\s\S]*?)\}\s*;/;

// Locate the onSystemAudioPermissionDenied useEffect handler. Same
// idiomatic shape as MicChannelAuditBannerSurfaced.test.mjs:
//   const unsub = window.electronAPI?.onSystemAudioPermissionDenied?.((msg) => { ... });
//   return () => unsub?.();
const PERMISSION_HANDLER_RE =
  /onSystemAudioPermissionDenied\?\.\(\((?:[^)]*)\)\s*=>\s*\{[\s\S]*?\}\s*\)\s*;[\s\S]*?return\s*\(\)\s*=>\s*unsub\?\.\(\)\s*;/g;

const CAPTURE_HANDLER_RE =
  /onAudioCaptureFailed\?\.\(\((?:payload|[^)]*)\)\s*=>\s*\{[\s\S]*?\}\s*\)\s*;[\s\S]*?return\s*\(\)\s*=>\s*unsub\?\.\(\)\s*;/g;

describe('UX3: audio warning banner deep-links to the correct macOS System Settings pane', () => {
  it('SystemAudioWarning type includes an optional `channel: \'system\' | \'mic\'` field', () => {
    const m = source.match(TYPE_RE);
    assert.ok(m, 'could not locate `type SystemAudioWarning = { ... };` in NativelyInterface.tsx');
    const body = m[1];
    // Optional marker `?` is required so existing call sites that don't
    // pass channel still type-check, but the field itself must be there.
    assert.match(
      body,
      /channel\?\s*:\s*['"]system['"]\s*\|\s*['"]mic['"]|channel\?\s*:\s*['"]mic['"]\s*\|\s*['"]system['"]/,
      'BUG: SystemAudioWarning must declare `channel?: \'system\' | \'mic\'`. ' +
        'Without this field on the type, the banner cannot pick the right deep-link pane (UX3 regression).',
    );
  });

  it('onSystemAudioPermissionDenied stamps `channel: \'system\'` on setSystemAudioWarning', () => {
    const matches = source.match(PERMISSION_HANDLER_RE);
    assert.ok(
      matches && matches.length === 1,
      'expected exactly one onSystemAudioPermissionDenied subscription handler',
    );
    const body = matches[0];
    // The setSystemAudioWarning object literal must include channel:'system'.
    assert.match(
      body,
      /setSystemAudioWarning\s*\(\s*\{[\s\S]*?channel\s*:\s*['"]system['"][\s\S]*?\}\s*\)/,
      'BUG: onSystemAudioPermissionDenied must set `channel: \'system\'` on the warning. ' +
        'screen-recording-permission is implicitly system-channel; stamping it gives the ' +
        'button-resolution logic a single source of truth (UX3).',
    );
  });

  it('onAudioCaptureFailed forwards `payload.channel` to setSystemAudioWarning', () => {
    const matches = source.match(CAPTURE_HANDLER_RE);
    assert.ok(
      matches && matches.length === 1,
      'expected exactly one onAudioCaptureFailed subscription handler',
    );
    const body = matches[0];
    assert.match(
      body,
      /setSystemAudioWarning\s*\(\s*\{[\s\S]*?channel\s*:\s*payload\.channel[\s\S]*?\}\s*\)/,
      'BUG: onAudioCaptureFailed must pass `channel: payload.channel` into the warning. ' +
        'Dropping this collapses mic vs system distinction and breaks the deep-link UX (UX3).',
    );
  });

  it('banner JSX references the macOS Microphone deep-link URL literally', () => {
    assert.ok(
      source.includes(
        'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone',
      ),
      'BUG: the macOS Microphone deep-link URL is missing from NativelyInterface.tsx. ' +
        'Without it the mic-channel banner cannot one-click into the right pane (UX3).',
    );
  });

  it('banner JSX references the macOS Screen Recording deep-link URL literally', () => {
    assert.ok(
      source.includes(
        'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture',
      ),
      'BUG: the macOS Screen Recording deep-link URL is missing from NativelyInterface.tsx. ' +
        'Without it the system-channel banner cannot one-click into the right pane (UX3).',
    );
  });

  it('banner JSX renders distinct mic / screen labels via i18n keys', () => {
    // 本地化后标签来自词典，源码里锚定的是语义键。
    assert.ok(
      source.includes('meeting:permissions.openMicSettings'),
      'BUG: openMicSettings label key is missing — the channel-aware label switch was reverted (UX3).',
    );
    assert.ok(
      source.includes('meeting:permissions.openScreenSettings'),
      'BUG: openScreenSettings label key is missing — the channel-aware label switch was reverted (UX3).',
    );
    // 两个键必须在两种语言里都存在、非空、且彼此不同——
    // 否则通道感知的标签切换在运行时会退化成同一句话。
    for (const [locale, catalog] of [['zh-CN', meetingZh], ['en-US', meetingEn]]) {
      const mic = catalog.permissions?.openMicSettings;
      const screen = catalog.permissions?.openScreenSettings;
      assert.ok(mic, `BUG: ${locale} meeting.permissions.openMicSettings is missing/empty`);
      assert.ok(screen, `BUG: ${locale} meeting.permissions.openScreenSettings is missing/empty`);
      assert.notEqual(
        mic,
        screen,
        `BUG: ${locale} renders the same label for both channels — UX3 distinction lost`,
      );
    }
  });

  it('NEGATIVE: the generic openSettings label is not wired straight to toggleSettingsWindow without channel/deep-link gating', () => {
    // Find every occurrence of the generic "open settings" label key in the
    // source, then walk a window around each one looking for an adjacent
    // toggleSettingsWindow call. If we find one, require that there's also
    // an `if` / `?` (ternary) / `deepLinkUrl` token somewhere in the same
    // window — proving the wiring is gated.
    assert.ok(
      commonZh.actions?.openSettings && commonEn.actions?.openSettings,
      'BUG: common.actions.openSettings must exist in both catalogs for this guard to be meaningful',
    );
    const LITERAL_RE = /common:actions\.openSettings/g;
    const WINDOW = 400; // characters on each side
    let match;
    const offenders = [];
    while ((match = LITERAL_RE.exec(source)) !== null) {
      const start = Math.max(0, match.index - WINDOW);
      const end = Math.min(source.length, match.index + WINDOW);
      const slice = source.slice(start, end);
      if (!/toggleSettingsWindow/.test(slice)) continue;
      // toggleSettingsWindow is adjacent — require a guard token nearby.
      const hasGuard =
        /\bif\s*\(/.test(slice) ||
        /\?\s*[^:]+:/.test(slice) || // ternary
        /deepLinkUrl/.test(slice) ||
        /channel/.test(slice);
      if (!hasGuard) {
        offenders.push({ index: match.index, slice });
      }
    }
    assert.equal(
      offenders.length,
      0,
      'BUG: found an "Open Settings" literal wired directly to toggleSettingsWindow with no ' +
        'channel/deep-link guard nearby. UX3 requires the banner button to pick a deep-link URL ' +
        'first and only fall back to toggleSettingsWindow when the channel is unknown / non-macOS.\n' +
        `First offender at char ${offenders[0]?.index}: ${offenders[0]?.slice?.slice(0, 200)}...`,
    );
  });
});
