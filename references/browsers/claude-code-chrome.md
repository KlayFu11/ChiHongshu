# Claude Code 官方 Chrome 扩展方案

`browser.mode: claude-code-chrome`。依据 [Claude Code 官方 Chrome 文档](https://code.claude.com/docs/en/chrome)，核对于 2026-10-26；未本机实测。

## 前提与需确定的信息

| 信息 | 核对要求 |
|---|---|
| 宿主 | Claude Code CLI 或 VS Code 的官方集成；不假定 Codex/OpenCode 能调用它。官方不支持 WSL 此集成。 |
| 扩展与账号 | 当前官方要求 Claude in Chrome 1.0.36+、直接 Anthropic 订阅；Claude Code 用 `/login`，扩展与其账号/组织一致。仅 API key、setup-token 或第三方模型供应商认证不满足此路径。 |
| 目标环境 | Chrome/profile（或官方支持的 Chromium 浏览器），扩展已安装启用，用户指定的小红书环境。 |
| 连接与权限 | CLI 启动 `claude --chrome`；会话内 `/chrome` 检查、重连、选择浏览器和站点权限。按实际界面状态核对，不靠命令成功推断。 |
| 小红书登录 | 在上述目标环境中检查。未登录先告知用户并等待手动登录，确认后再搜索。 |

## 操作与注意

使用官方集成在当前会话提供的工具/schema，按默认顺序读帖、展开评论、逐张截图并查看；官方文档支持将截图保存为文件，实际路径及能力仍须核对。不要编造跨宿主工具名或自行添加第二套 MCP 连接。

出现登录、验证码或 MFA 时交给用户。连接失败优先核对目标浏览器、账号/组织与 `/chrome` 状态；需要重启或安装由用户决定。扩展会管理本会话 tab group，清理仅限自己的页面，不通过 `/clear` 来做通用收尾，以免关闭用户还需查看的页。

这套官方扩展不是 Playwright Extension，也不是 Browser Use 产品；版本、订阅与组织策略仍以执行当时官方说明为准。
