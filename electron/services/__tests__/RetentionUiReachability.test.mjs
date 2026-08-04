import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = rel => fs.readFileSync(path.join(repoRoot, rel), 'utf8');

test('meeting retention IPC exposes get/set and broadcasts updates', () => {
  const ipc = read('electron/ipcHandlers.ts');

  assert.match(ipc, /safeHandle\(['"]get-meeting-retention['"]/);
  assert.match(ipc, /SettingsManager\.getInstance\(\)\.get\('meetingRetention'\) \?\? 'forever'/);
  assert.match(ipc, /safeHandle\(['"]set-meeting-retention['"]/);
  assert.match(ipc, /SettingsManager\.getInstance\(\)\.set\('meetingRetention', retention\)/);
  assert.match(ipc, /webContents\.send\('meeting-retention-changed', retention\)/);
});

test('preload and renderer types expose meeting retention controls', () => {
  const preload = read('electron/preload.ts');
  const types = read('src/types/electron.d.ts');

  assert.match(preload, /getMeetingRetention: \(\) => ipcRenderer\.invoke\('get-meeting-retention'\)/);
  assert.match(preload, /setMeetingRetention:[\s\S]{0,120}ipcRenderer\.invoke\('set-meeting-retention', retention\)/);
  assert.match(preload, /ipcRenderer\.on\('meeting-retention-changed', subscription\)/);
  assert.match(types, /getMeetingRetention: \(\) => Promise<'forever' \| '7d' \| '30d' \| 'never'>/);
  assert.match(types, /setMeetingRetention: \(retention: 'forever' \| '7d' \| '30d' \| 'never'\) => Promise<\{ success: boolean; error\?: string \}>/);
});

test('SettingsOverlay renders a real do-not-save meetings control', () => {
  const source = read('src/components/SettingsOverlay.tsx');

  assert.match(source, /const \[meetingRetention, setMeetingRetention\]/);
  assert.match(source, /getMeetingRetention\?\.\(\)\.then\(setMeetingRetention\)/);
  assert.match(source, /setMeetingRetention\?\.\(nextRetention\)/);
  // zh-CN 本地化说明：开关标题与说明文案已迁到 settings 词典。
  // 锚点改为两个语义键，并断言中英词典都定义了它们且互不相同——
  // 这个开关决定会议是否落盘，说明文字退化成空白或与标题同句都会误导用户。
  assert.match(source, /settings:general\.doNotSave/);
  assert.match(source, /settings:general\.doNotSaveHint/);
  for (const locale of ['zh-CN', 'en-US']) {
    const catalog = JSON.parse(read(`src/i18n/resources/${locale}/settings.json`));
    const title = catalog.general?.doNotSave;
    const hint = catalog.general?.doNotSaveHint;
    assert.ok(title, `expected ${locale} settings.general.doNotSave to be defined and non-empty`);
    assert.ok(hint, `expected ${locale} settings.general.doNotSaveHint to be defined and non-empty`);
    assert.notEqual(title, hint, `BUG: ${locale} 标题与说明相同，用户看不到「丢弃转写」这层含义`);
  }
});

test('launcher startMeeting metadata carries doNotPersist when retention is never', () => {
  const source = read('src/App.tsx');

  assert.match(source, /getMeetingRetention\?\.\(\)/);
  assert.match(source, /doNotPersist: meetingRetention === 'never'/);
  assert.match(source, /startMeeting\(\{[\s\S]*audio: \{ inputDeviceId, outputDeviceId \},[\s\S]*doNotPersist/s);
});
