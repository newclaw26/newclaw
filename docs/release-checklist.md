# NewClaw V7.0 发布就绪检查清单

**检查日期**: 2026-04-10 | **版本**: package.json 当前为 `1.1.0` | **检查人**: PM Agent

---

## 1. 代码质量

| 状态 | 检查项 | 证据 |
|------|--------|------|
| ✅ | TypeScript 零错误 | `tsc --noEmit` 输出 3 行（仅 npm warn），无类型错误 |
| ❌ | 所有测试通过 | 930 个测试中 **34 个失败**（5 个测试文件失败），896 通过。失败原因: zustand `storage.setItem` mock 缺失 |
| ❌ | 无 console.error/warn | src/ 下 **24 个文件共 67 处** `console.error/warn` 调用。重灾区: `stores/providers.ts`(11), `stores/chat.ts`(7) |
| ❌ | 无阻塞性 TODO/FIXME | **7 处 TODO**。关键阻塞: `economy.ts` HMAC 完整性校验(C-04)跳过; `identity.ts` 4 处真实加密替换未完成 |
| ❌ | ESLint 无 error | **13 errors / 17 warnings**。主要: `react-hooks/exhaustive-deps` 和 `preserve-manual-memoization` |

## 2. 功能完整性

| 状态 | 检查项 | 证据 |
|------|--------|------|
| ✅ | 创世向导 5 步全通 | `GenesisWizard.tsx` 实现完整 5 步: 欢迎/身份生成/经济奖励/Trinity 流水线/完成 |
| ✅ | 视图数据展示 | 14 个页面目录，超过 9 个视图: Overview/Chat/Agents/Channels/Models/Sessions/Trinity/Usage/Skills/Cron/Setup 等 |
| ✅ | 团队群聊 Markdown 渲染 | `ChatBubble.tsx` + `ChatMessage.tsx` 使用 react-markdown，`sanitizeLLMOutput` 已处理 |
| ✅ | 知识市场购买流程 | `market.ts` + `FuseMatrix.tsx` + `stores/v6.ts` 含购买逻辑 |
| ✅ | 权限矩阵 L0-L4 | `FuseMatrix.tsx` 展示 L0-L4，含 `getLevelColor` 颜色映射，L4 标记为禁止 |
| ✅ | 节点晋升进度可视化 | `PromotionPipeline.tsx` 含 progressbar + 4 项指标卡片(合规/对账/稳定性/就绪度) |

## 3. 安全

| 状态 | 检查项 | 证据 |
|------|--------|------|
| ❌ | 安全审计 8/8 修复 | `SECURITY.md` 为通用模板，未包含 V7 审计记录。economy.ts C-04 HMAC 明确标注跳过 |
| ✅ | 无 API 密钥硬编码 | 仅发现 `OLLAMA_PLACEHOLDER_API_KEY = 'ollama-local'`（占位符，非真实密钥） |
| ⚠️ | localStorage 完整性校验 | `governance-persistence.ts` 有 `computeChecksum` 校验。但 `economy.ts` 和 `chat.ts` 的 localStorage 操作**无校验** |
| ✅ | LLM 输出 sanitize | `trinity-orchestrator.ts` 的 `sanitizeLLMOutput()` 对所有 LLM 返回内容执行清洗，`ChatBubble.tsx` 二次过滤 |

## 4. 用户体验

| 状态 | 检查项 | 证据 |
|------|--------|------|
| ✅ | 新用户 5 分钟创世 | 向导仅 5 步，身份自动生成，奖励自动发放 |
| ✅ | 全中文文本 | `i18n/locales/zh/` 下含 chat/settings/skills/setup/cron/channels 等完整中文包 |
| ✅ | 连接状态指示器 | `StatusBadge.tsx` + 11 个文件含连接状态逻辑，gateway/channel 均有状态显示 |
| ✅ | 空状态友好提示 | 30 个文件含 EmptyState/"暂无" 相关处理 |

## 5. 文档

| 状态 | 检查项 | 证据 |
|------|--------|------|
| ⚠️ | README 已更新 | `README.md` 为 V6 内容(中文版完整)。`README-v7-draft.md` 存在但标题仍为 "V6 Trinity" |
| ✅ | API 文档覆盖 | `api-reference.md` 覆盖 14 模块 / 80+ 导出函数 |
| ❌ | 变更日志 | 未找到 `CHANGELOG.md` 文件 |

## 6. 发布物

| 状态 | 检查项 | 证据 |
|------|--------|------|
| ❌ | package.json 版本号 | 当前 `1.1.0`，需更新为 `7.0.0` |
| ⚠️ | Git 变更已准备 | 非 git 仓库状态，需初始化或关联远程仓库 |
| ✅ | Landing page | `docs/landing/index.html` 存在 |

---

## 发布判定

**结果: ❌ 未通过 -- 存在 6 项阻塞问题**

### 必须修复 (P0)

1. **34 个测试失败** -- 修复 zustand mock 配置
2. **ESLint 13 errors** -- 修复 react-hooks 依赖数组
3. **HMAC 校验缺失 (C-04)** -- economy.ts localStorage 无防篡改
4. **版本号 1.1.0** -- 更新为 7.0.0
5. **缺少 CHANGELOG.md** -- 编写 V7 变更日志
6. **README 未更新至 V7** -- draft 仍标注 V6

### 建议修复 (P1)

- 67 处 console.error/warn 清理（保留 ErrorBoundary 等必要的，移除调试用途的）
- identity.ts 4 处模拟加密替换为 Web Crypto API
- economy.ts / chat.ts 的 localStorage 增加完整性校验
