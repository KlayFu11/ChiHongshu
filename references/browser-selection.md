# 浏览方式选择、信息与登录检查

本协议覆盖七种方式。模式由用户在调用时指定，或由 Skill 在第一次浏览操作前询问；不是按工具可用性自动代选。续做沿用选择，实际换宿主、浏览器、profile 或空间时重新核对环境与登录，不把原会话检查结果移植过去。

## 七个新任务选项

| `browser.mode` | 显示名称 | 要确定的目标 |
|---|---|---|
| `web-access` | web-access | 指定浏览器用户数据目录所对应的现有连接 |
| `playwright-mcp` | Playwright MCP | MCP 实例及 extension/CDP/专用 profile 连接方式 |
| `ego-browser` | ego-browser | ego 空间、profile 与本任务页面 |
| `agent-browser` | Vercel agent-browser | CLI 会话及已确认的 CDP 浏览器 |
| `browser-harness` | Browser Use browser-harness | 已确认的本地 Chrome daemon，或另行批准的独立环境 |
| `codex-chrome` | Codex 官方 Chrome 扩展方案 | 官方桌面端连接的 Chrome/profile 与站点权限 |
| `claude-code-chrome` | Claude Code 官方 Chrome 扩展方案 | Claude Code 会话、Claude in Chrome 扩展及所选 Chrome/profile |

旧 `native-browser` 仅用于读取 v1 历史研究，不再提供为新任务选项；不自动猜成两个官方扩展中的任何一个。`agent-browser` 和 `browser-harness` 不是同一个工具；Codex 菜单中的 Browser use 也不是 Browser Use 公司产品。

## 信息采集方式

能从当前工具 schema、已安装版本说明或现有连接只读获取的信息先查，不要求用户填写技术问卷。用户只需决定使用哪种方式、目标浏览器/账号环境，以及是否接受独立环境。具体配置入口和可用命令在所选适配中查；浏览器版本变化时核对已安装版本，不盲照文档中的旧示例执行。

新研究模板使用 `schemaVersion: 2`，至少记录：

| 字段 | 内容 | 填写时机 |
|---|---|---|
| `browser.mode` | 上表机器标识 | 用户选择之后，连接之前 |
| `browser.host` | 实际 Agent 宿主，例如 Codex 桌面端、Claude Code CLI、OpenCode | 从环境核实；不能只写模型名 |
| `browser.toolVersion` | 已知工具/扩展版本；无法读取时注明未知 | 只读检查，不为填字段自动安装 |
| `browser.connection.kind` | `existing-session`、`dedicated-profile`、`remote-session` | 核实实际接入方式 |
| `browser.connection.target` | 可识别浏览器/profile/空间的非敏感说明 | 不记录 cookie、登录账号联系方式或带 token 的 endpoint |
| `browser.connection.independentEnvironmentApproved` | 用户是否明确接受专用/独立环境 | 后两类连接必须为 true；不能把选择工具等同于同意复制资料 |
| `browser.login.status` | `unknown/logged-in/logged-out/blocked` | 初始 unknown，检查后照实填写 |
| `browser.login.checkedAt`、`evidence` | 带偏移的时间和页面可观察依据 | 例如指定 profile 的小红书显示已登录入口；不读取 cookie 来证明 |
| `browser.login.userNotifiedAt` | 未登录时已告知用户的时间 | 确认 logged-out 后必须记录；不提前伪填 |
| `browser.checkedAt`、`capabilities` | 正文、图像、评论、文件保存能力的检查时间与结果 | 登录通过后的实际小样本，不是阅读工具说明即算通过 |

目标 endpoint、本机路径等仅在连接所必需的本地操作中使用，脱敏描述写入研究记录。不要把凭证写入 Skill、报告或模板。某工具使用内部 MCP 通信不意味着要把用户选择改成 Playwright MCP。

## 登录必须先于采集

1. 选择工具与目标环境；记录已有页面和任务页面归属。
2. 只打开/读取用于核对小红书登录状态的页面，不提前提交关键词或批量读帖。不能从另一个浏览器已登录、扩展服务已登录或搜索摘要可读推定此环境已登录。
3. 已退出、出现登录要求时先告诉用户：在哪个浏览器/profile/空间登录、当前卡在哪里。示例：“当前选定的 Chrome 工作 profile 尚未登录小红书。请在该窗口完成登录；我会复核后开始检索。”验证码/MFA同样交给用户；状态未知则说明无法确认并暂停采集。
4. 等待用户操作后实际复核。用户说“已登录”是复核的起点，不替代连接到正确环境的检查。确认后再做小样本与正式研究；允许继续不依赖浏览器的主题整理。
5. 中途登录失效或环境被切换，暂停采集并重新执行检查。旧证据可保留，状态为 blocked；不默默切换到无登录的独立浏览器或其他工具。

v2 校验拒绝未确认登录就执行研究或最终交付，并检查未登录通知与独立环境决定。v1 数据兼容校验会提示缺少登录记录；这不构成新采集的授权或登录证明，也不能通过降级 schema 绕过新规则。

## 安装、权限与收尾

本 Skill 的使用不自动授权安装浏览器工具、升级应用、修改全局浏览偏好、导出/复制 profile、上传 cookie、启用录屏或开通云浏览器。若前提缺失，给出所选工具的具体设置说明，由用户决定；当前任务只能推进不依赖这些操作的部分。

只关闭确定属于本任务的页面；不要用“关闭整个浏览器/所有会话”作为通用收尾。官方扩展托管的标签组按宿主提供的工具与用户需要处理，不把退出 Agent、清空会话或关闭标签组当作无副作用操作。
