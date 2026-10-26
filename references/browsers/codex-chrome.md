# Codex 官方 Chrome 扩展方案

`browser.mode: codex-chrome`。官方资料核对：2026-10-26；未做本机连接测试。依据 OpenAI 的 [Browser extension](https://learn.chatgpt.com/docs/chrome-extension) 与 [Browser](https://learn.chatgpt.com/docs/browser)。现行文档使用 ChatGPT browser extension 名称，支持在桌面端的 Codex chat 中选择浏览器；这是用户所指的官方 Chrome 方案，不是第三方同名扩展。

## 前提与需确定的信息

| 信息 | 核对方式 |
|---|---|
| 宿主 | 官方桌面端中具有该浏览器连接入口的 Codex chat；不能承诺 Codex CLI、IDE 或 OpenCode 都能调用同一个扩展。环境未暴露能力时说明不可用。 |
| 桌面端与插件 | 按官方当前入口 `Settings > Computer Use` 选择 Chrome，完成所需 plugin/扩展设置；已连接时显示 `Manage`。界面可能随版本变化，以实际界面为准。 |
| 浏览器/profile | 使用安装并启用了官方扩展的 Chrome profile；实际连接必须是用户指定的已登录环境。其他 Chromium 浏览器需在当前官方列表与本机 UI 中确认。 |
| 本次选择 | 调用时用 `@Chrome` 或实际浏览器菜单项，检查聊天得到的真实工具及页面标识。只给一个网站链接不等于明确选中了 Chrome。 |
| 站点权限 | 按宿主提示给予本次小红书站点访问；受组织策略或拒绝访问限制时说明，不擅自开全站权限。 |
| 小红书登录 | 扩展或桌面端登录成功不代表小红书登录成功。先在选定 profile 的小红书页面核对，未登录立即告知并等待用户。 |

## 使用与边界

在确认用户选择后，按当前宿主暴露的浏览器工具操作任务页面；没有可移植的“Codex Chrome 通用 CLI”可硬编码。工具参数、截图/保存接口按当前 schema 获取，不自行猜测或绕过官方工具改走 CDP。

登录确认后逐帖读取正文、逐图查看并保存必要证据，按预算展开评论。若只有页面文本或无法保存图片，应明确缺失能力，不声明完整核读。收尾只处理本任务页面，不用切换/关闭应用作为清理手段。

官方内置 `@Browser` 使用独立 profile，不能当作 `@Chrome` 登录态复用。扩展无法连接时，检查是否选对 profile、站点是否被阻止，以及桌面端连接状态；不自动退回内置浏览器。需要更新、重新安装或重启时说明影响，让用户决定，不在文档适配阶段执行。
