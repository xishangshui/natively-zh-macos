# Task 14 运行时验证证据

日期：2026-08-05

## Radix Toast 视口的 aria-label —— 静态扫描永远抓不到的残留

`@radix-ui/react-toast` 的 `Viewport` 默认 `label` 是 `"Notifications ({hotkey})"`。
它以 `aria-label` 出现在每个含 Toast 视口的窗口 DOM 里，但**这个字面量在
项目源码中并不存在**——它来自 `node_modules`。

`scripts/check-i18n-coverage.mjs` 只扫项目源码，所以门禁全绿的同时，
屏幕阅读器读到的仍是英文。这处残留是 Task 8 用 CDP 读运行时 DOM 时发现的
（见 `../task-08/README.md`），并按计划留到 Task 14 处理。

### 修法

在 `src/components/ui/toast.tsx` 的 `ToastViewport` 包装组件里给 `label`
一个来自词典的默认值，而不是在四个调用点各写一遍：

```tsx
label={label ?? t('common:a11y.notificationsViewport')}
```

`{hotkey}` 由 Radix 自己替换，词典里原样保留这个占位符。

### 修复前后对比（CDP 读取真实 DOM）

以生产模式带 `--remote-debugging-port=9411` 启动，遍历 5 个渲染窗口：

| 窗口 | 修复前 | 修复后 |
|---|---|---|
| launcher | （无通知视口） | （无通知视口） |
| model-selector | `Notifications (F8)` | `通知（F8）` |
| settings | `Notifications (F8)` | `通知（F8）` |
| overlay | `Notifications (F8)` | `通知（F8）` |
| cropper | （无通知视口） | （无通知视口） |

修复前的数据来自 `../task-08/runtime-dom-zh.txt`。

探针脚本放在项目目录内（`ws` 是本项目依赖），用完即删，未入库。

## 允许名单文档

`docs/zh-cn/i18n-allowlist.md` 由 `scripts/gen-i18n-allowlist-doc.mjs`
从 `scripts/i18n-allowlist.json` 生成，不手写——手写的文档一定会和名单漂移。
当前 105 条，覆盖 21 个文件。
