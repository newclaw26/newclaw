# NewClaw V7.0 Demo 部署策略

> 核心挑战: Electron 应用无法在浏览器运行。三种方案阶梯式推进。

## 方案对比

| 维度 | A: Landing+视频 | B: Web Demo | C: 安装包 |
|------|-----------------|-------------|-----------|
| 上线时间 | 1 小时 | 2-3 天 | 1 天 |
| 用户信任成本 | 零 | 低 | 高 |
| 交互性 | 仅观看 | 完整交互 | 完整体验 |
| 转化率预估 | 低 | 高 | 中 |

**路线:** A(今天) -> B(本周) -> C(正式发布)

---

## A: Landing Page + 视频 Demo

已有 `docs/landing/index.html`，加演示 GIF 后推 GitHub Pages。

**录制转 GIF:**
```bash
# macOS 录屏 Cmd+Shift+5，录创世向导(30s)+群聊(20s)
brew install ffmpeg
ffmpeg -i genesis-wizard.mov -vf "fps=12,scale=800:-1" -loop 0 docs/landing/demo-wizard.gif
ffmpeg -i team-chat.mov    -vf "fps=12,scale=800:-1" -loop 0 docs/landing/demo-chat.gif
```

**嵌入 Landing Page** -- 在 hero 下方加:
```html
<section id="demo"><div class="container">
  <h2>30 秒看懂 NewClaw</h2>
  <img src="demo-wizard.gif" alt="Genesis Wizard" loading="lazy">
  <img src="demo-chat.gif" alt="Team Chat" loading="lazy">
</div></section>
```

**部署:**
```bash
npx gh-pages -d docs/landing   # 一条命令上线
```

自动化: `.github/workflows/pages.yml` -- 监听 `docs/landing/**` 变更，用 `actions/deploy-pages@v4` 部署。

---

## B: Web 版精简 Demo

提取 UI 为纯 Web 应用，StubProvider 模拟后端。

**Vite 配置** (`demo/vite.config.ts`):
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
export default defineConfig({
  plugins: [react()],
  resolve: { alias: {
    '@': path.resolve(__dirname, '../src/renderer'),
    '@shared': path.resolve(__dirname, '../src/shared'),
  }},
  define: { 'window.electron': 'undefined' },  // 屏蔽 Electron API
})
```

**StubProvider** (`demo/src/stub-provider.ts`):
```typescript
export const StubProvider = {
  getAgents: () => Promise.resolve([
    { id: 'ceo', name: 'CEO Agent', status: 'active' },
    { id: 'dev', name: 'Dev Agent', status: 'active' },
  ]),
  getMessages: () => Promise.resolve([
    { from: 'ceo', text: '启动项目评审流程', ts: Date.now() - 60000 },
  ]),
  sendMessage: (msg: string) => Promise.resolve({ ok: true }),
}
```

**部署:**
```bash
cd demo && pnpm install && pnpm build
vercel --prod            # Vercel
# 或: netlify deploy --prod --dir=dist
```

自动化: `.github/workflows/demo.yml` -- 监听 `demo/**` 和 `src/renderer/**`，构建后用 `vercel-action` 部署。

---

## C: Electron 安装包

项目已有 `electron-builder` 配置，直接打包。

**构建 + 发布:**
```bash
CSC_IDENTITY_AUTO_DISCOVERY=false pnpm run package:mac:local   # 跳过签名
# 产物: release/NewClaw-7.0.0.dmg

gh release create v7.0.0-beta release/NewClaw-7.0.0.dmg \
  --title "NewClaw V7.0 Beta" --notes "首个公开测试版" --prerelease
```

自动化: `.github/workflows/release.yml` -- 监听 `v*` tag，`macos-latest` 上运行 `pnpm run package:mac`，用 `action-gh-release` 发布 DMG。

---

## 执行计划

| 时间 | 动作 | 产出 |
|------|------|------|
| 今天 | 录屏 + 方案 A | GitHub Pages 上线 |
| 本周 | 方案 B: StubProvider | Vercel 在线 Demo |
| 发布前 | 方案 C: 签名打包 | GitHub Release DMG |

Landing Page 为永久入口，导航链到 Web Demo 和下载页。三方案互补不互斥。
