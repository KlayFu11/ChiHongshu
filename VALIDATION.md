# 验证记录

创建与验证日期：2026-10-26。

## 验证范围

- 本地运行时：Node.js v24.19.0，Windows；声明的最低运行时 Node.js 22 尚未单独运行测试。
- v0.1.0 离线用例：54 项通过，覆盖日期、去重、预算、图像记录、引用、阶段稿/受阻状态、索引更新与命令行退出码。全部使用模拟材料。
- v0.2.0 增加七种明确模式、v1 兼容、v2 登录先决条件、未登录通知和独立环境选择测试；最终结果见下方更新记录。
- 包检查：元信息、资源链接、JSON 与 JavaScript 语法；文件数随适配说明增加。
- skill-creator 官方检查：`quick_validate.py` 返回 `Skill is valid!`。运行于 Python 3.12.13 + PyYAML 6.0.3；它们仅用于创建验证，不是本包辅助脚本的运行依赖。
- 独立使用检查：另一 Agent 按 Skill 处理两篇离线模拟笔记，成功生成阶段报告、来源索引与结构化记录。保留编辑日期的当年解释，排除一条旧评论，将三张未取得图片记为 unavailable，并保持 blocked 状态。阶段检查通过且 `readyForDelivery: false`；最终检查按预期拒绝受阻、未完成采样及缺失浏览能力的交付。

## 可复现命令

```bash
npm test
npm run check
```

在安装了 skill-creator 及其验证依赖的环境中，还可运行其 `scripts/quick_validate.py`，参数为本 Skill 目录。不要硬编码作者本机路径。独立模拟使用产物不随发布包携带，避免与真实调研混淆；常规模拟回归用例保留在 `tests/`。

## 实时浏览与跨宿主

| 方式/宿主 | 状态 |
|---|---|
| web-access + 小红书 | 本次未现场验证 |
| Playwright MCP + 小红书 | 本次未现场验证 |
| ego-browser + 小红书 | 本次未现场验证 |
| Vercel agent-browser + 小红书 | 官方资料适配，未安装/本机验证 |
| Browser Use browser-harness + 小红书 | 官方资料适配，未安装/本机验证 |
| Codex 官方 Chrome 扩展 + 小红书 | 官方资料适配，未本机连接验证 |
| Claude Code 官方 Chrome 扩展 + 小红书 | 官方资料适配，未本机连接验证 |
| Codex / Claude Code / OpenCode 完整真实研究 | 本次未逐宿主验证 |

适配说明不等于已实现并实测的自动爬虫。程序一致性检查不证明真实核读、作者可信或推导充分。真实使用时记录所选工具的连接和小样本能力检查，不能将历史项目或其他网站的成功转述为本包已通过验证。

## v0.2.0 适配更新，2026-10-26

核读 Vercel agent-browser、Browser Use browser-harness、Microsoft Playwright MCP 的官方仓库说明，以及 OpenAI Browser extension/Browser 和 Claude Code Chrome 官方文档。各适配页就近提供来源链接与核对日期；不复制其他产品的 API 名称作为通用工具接口。

新模板采用 schemaVersion 2，保留 mode 选择、宿主、环境类型/目标、独立环境决定、实际登录检查与未登录通知。v1/native-browser 历史记录仍可审阅，校验会提示它不能证明当前登录状态。本轮只验证本地脚本与文档，未执行新增工具安装、连接或小红书访问。

更新后的实际结果：74 项离线测试通过（原有 54 项与新增 20 项）；29 文件包检查通过；skill-creator 官方 quick_validate.py 通过。新增用例覆盖七项选择、默认不代选、旧数据兼容、未登录通知、登录前不得研究以及独立环境须经用户决定。
