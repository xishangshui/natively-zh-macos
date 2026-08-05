// 找出源码里 t()/Trans 引用了、但词典里不存在的键。
// 门禁只校验中英键集合一致，不校验「引用的键是否存在」——
// 缺键会静默回退成键名本身显示给用户，必须单独查。
import fs from 'node:fs';
import path from 'node:path';

import path2 from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path2.resolve(path2.dirname(fileURLToPath(import.meta.url)), '..');
// 无参数时扫描门禁范围内的全部文件
const scope = JSON.parse(fs.readFileSync(path2.join(ROOT,'scripts/i18n-scope.json'),'utf8'));
const files = process.argv.length > 2 ? process.argv.slice(2) : scope.enforcedFiles;

const catalogs = {};
for (const ns of ['common', 'launcher', 'meeting', 'settings', 'providers', 'history', 'onboarding', 'help', 'updates', 'errors']) {
  catalogs[ns] = JSON.parse(
    fs.readFileSync(path.join(ROOT, `src/i18n/resources/zh-CN/${ns}.json`), 'utf8'),
  );
}

const has = (ns, dotted) => {
  let node = catalogs[ns];
  for (const part of dotted.split('.')) {
    if (typeof node !== 'object' || node === null) return false;
    node = node[part];
  }
  return typeof node === 'string';
};

const missing = new Set();
for (const rel of files) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  // t('ns:a.b') 与 i18nKey="ns:a.b"
  for (const m of src.matchAll(/(?:t\(\s*['"`]|i18nKey=["'])([a-z]+):([A-Za-z0-9.]+)/g)) {
    const [, ns, key] = m;
    if (!catalogs[ns]) {
      missing.add(`!! 未知 namespace: ${ns}:${key}`);
      continue;
    }
    // 以点号结尾说明是模板字符串的静态前缀（t(`x.${enum}`)），
    // 具体键在运行时拼出，静态检查无从判断——跳过。
    if (key.endsWith('.')) continue;
    if (!has(ns, key)) missing.add(`${ns}:${key}`);
  }
}

if (missing.size > 0) process.exitCode = 1;
if (missing.size === 0) {
  console.log('OK 所有引用的键都存在');
} else {
  console.log(`缺失 ${missing.size} 个键：`);
  for (const k of [...missing].sort()) console.log(`  ${k}`);
}
