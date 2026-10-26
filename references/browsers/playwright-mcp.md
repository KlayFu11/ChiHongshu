# Playwright MCP 适配

仅使用当前连接暴露的 Playwright MCP 工具和 schema。发现导航、可访问性快照、交互、截图、标签页管理及文件保存的实际能力；不假定工具前缀、参数、持久化目录或扩展连接模式。

`browser.mode: playwright-mcp`。补充依据 [Microsoft 官方 README](https://github.com/microsoft/playwright-mcp/blob/main/README.md)，核对于 2026-10-26。

| 需确定的信息 | 前提与含义 |
|---|---|
| MCP 服务与版本 | 确认宿主可发现实际工具；官方 Node.js 前提和安装参数以当前版本为准，不能把 ChiHongshu 的 Node.js 要求当作 MCP 的要求。 |
| 接入方式 | 复用现有 Chrome/Edge 可选择官方 `--extension` 路径（另需 Playwright Extension），或用户已授权的 `--cdp-endpoint`。按已有配置核对，不擅自安装扩展/新增服务。 |
| 目标 profile | 现行扩展路径提供 `--profile-dir-name`，只在所装版本支持时使用；独立 profile 可用 `--user-data-dir`，这不等于自动复用日常 Chrome。专用/隔离环境先征得用户选择。 |
| 页面与文件 | 可操作页面的真实 ID、实际截图保存目录；凭工具 schema 保存图像，不只取可访问性树。 |
| 小红书登录 | 在该实例中检查；未登录先说明具体窗口/profile，等待用户手动登录并复核后再检索。 |

`--isolated` 和默认专用 profile 都不能假设有用户登录态；不为解决登录主动导入 `--storage-state` 或复制 cookie。持久 profile 不能随意被多实例同时打开。Playwright Extension 与本 Skill 中两个官方 Agent Chrome 扩展是不同方案。

先确认浏览器实例和小红书登录状态。新建的独立浏览器可能没有用户日常登录态，不能宣称已复用；需要登录时请用户完成。不得复制 profile 或读取 cookie 来替代正常连接。

快照用于定位元素和提取文本，不能替代图片视觉阅读。按快照中的实际元素或当前 DOM 定位图集、评论区域及展开按钮；截图后必须实际查看。滚动到评论区域后核对内容增量与去重，不把同一批节点重复计数。

记录初始页和自建页，结束时只关闭确属本任务的页。连接方式或登录态无法支持任务时暂停依赖部分，不能未经用户决定切换方式。

验证状态：本包创建阶段未进行该适配的实时小红书验证。
