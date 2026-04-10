# 贡献指南 / Contributing Guide

感谢你对 NewClaw 的关注！无论是报告 Bug、提出建议还是提交代码，我们都非常欢迎。
Thanks for your interest in NewClaw! Bug reports, feature ideas, and code contributions are all welcome.

## 快速开始 / Quick Start

```bash
git clone https://github.com/<your-username>/newclaw.git
cd newclaw
pnpm install
pnpm dev
```

运行测试（请确保所有 547 个测试通过后再提交 PR）：
Run tests (all 547 tests must pass before submitting a PR):

```bash
pnpm test
```

## 提交 PR / Submitting a Pull Request

1. 从 `main` 创建新分支 / Create a branch from `main`
   ```bash
   git checkout -b feat/your-feature
   ```
2. 编写代码并添加测试 / Write code and add tests
3. 确认通过 / Verify everything passes
   ```bash
   pnpm test && pnpm typecheck && pnpm lint
   ```
4. 提交并推送 / Commit and push
   ```bash
   git commit -m "feat: 简要描述你的变更"
   git push origin feat/your-feature
   ```
5. 在 GitHub 上创建 Pull Request，填写 PR 模板
   Open a Pull Request on GitHub and fill in the PR template.

## 分支命名 / Branch Naming

| 前缀 / Prefix | 用途 / Purpose          |
|---------------|------------------------|
| `feat/`       | 新功能 / New feature     |
| `fix/`        | Bug 修复 / Bug fix      |
| `docs/`       | 文档更新 / Documentation |
| `refactor/`   | 重构 / Refactoring      |

## Commit 规范 / Commit Convention

使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

```
feat: 添加 Trinity 节点健康检查
fix: 修复 WebSocket 重连逻辑
docs: 更新 API 参考文档
```

## 行为准则 / Code of Conduct

请遵守我们的 [行为准则](CODE_OF_CONDUCT.md)。保持尊重、友善、专业。
Please follow our [Code of Conduct](CODE_OF_CONDUCT.md). Be respectful, kind, and professional.

## 需要帮助？/ Need Help?

- 提交 [Issue](https://github.com/nicepkg/newclaw/issues) 或参与 [Discussions](https://github.com/nicepkg/newclaw/discussions)
- 查阅 [文档](docs/) 获取更多信息

我们期待你的贡献！/ We look forward to your contribution!
