# Vercel agent-browser 适配

`browser.mode: agent-browser`。官方资料核对：2026-10-26；未安装或本机实测。依据 [官方 README](https://github.com/vercel-labs/agent-browser/blob/main/README.md)，尤其 [CDP](https://github.com/vercel-labs/agent-browser/blob/main/README.md#cdp-mode)、[profile](https://github.com/vercel-labs/agent-browser/blob/main/README.md#chrome-profile-reuse) 与 [标签页](https://github.com/vercel-labs/agent-browser/blob/main/README.md#tabs)。执行时以所装版本帮助为准。

## 前提与需确定的信息

| 信息 | 如何确定 |
|---|---|
| CLI 版本/安装方式 | 已安装则读取版本和帮助。官方提供 npm、Homebrew、Cargo 安装；不在研究开始时自动升级。 |
| Chrome 环境 | 优先用户指定、正在运行且已授权 CDP 的 Chrome。现行 README 描述 Chrome 144+ 的 `chrome://inspect/#remote-debugging` 入口；先核对版本，由用户启用并处理 Allow 对话框。 |
| 接入方式 | 已核对的 `--cdp <port 或 WebSocket URL>`，或用户接受自动发现时使用 `--auto-connect`。自动发现也可能探测常见端口，必须核对最终连接属于目标浏览器，不能只凭“连上了”。 |
| 会话与任务标签 | 本次 CLI `--session` 名称、初始 tab 列表、本任务新建 tab ID/label。CLI session 名不是 Chrome profile。 |
| 小红书登录 | 在该 CDP 浏览器的目标页面复核，按 [登录协议](../browser-selection.md) 未登录先告知并等待。 |

官方默认可启动独立 Chrome for Testing；这不继承用户日常登录态。若无法连接指定现有环境，先说明独立环境及登录要求，由用户决定。`--profile <Chrome 名称>` 的现行实现会复制 profile 到临时目录，**不作为本 Skill 的默认复用方法**；不自动使用 `state save`、`--state`、`--restore` 或 auth vault 导出/迁移登录数据。`--profile <路径>` 的专用持久环境同样需用户接受。

## 连接与采集示意

以下为用户选定并授权现有 CDP 连接后的命令形态，不在适配更新时执行。占位值须替换为已核对信息；每条命令使用同一 session：

```text
agent-browser --session <任务会话> --cdp <已核对端口> tab list --json
agent-browser --session <任务会话> tab new --label chihongshu about:blank
agent-browser --session <任务会话> tab chihongshu
agent-browser --session <任务会话> open https://www.xiaohongshu.com
agent-browser --session <任务会话> snapshot
```

首页此时只用于登录检查。确认登录后，使用当前 snapshot 返回的 refs 定位搜索框、笔记和评论；页面发生变化后重新获取 refs。需要文本时使用当前页面 `read`（不带 URL）或当前版本的 DOM/文本命令。`read <URL>` 走 HTTP 获取，不等同于读取已登录页面，不能替代小红书原帖访问。

图片使用 `screenshot <研究目录内路径>` 后实际查看；snapshot 不是逐图视觉阅读。滚动图集、评论并检查实际增量和去重。日志限必要正文，不打印连接 token 或整个浏览器状态。

## 注意与收尾

当前版本 tab ID 形如 `t1`，或使用实际返回的 target ID/用户 label；不是可猜测的视觉序号。重启 daemon 后重新确认标识。共享浏览器时串行操作，必要时按当前帮助使用 `--pin-tab`，避免任务 tab 消失后落到用户其他页面。

结束时通过 `tab close <本任务ID或label>` 清理自建页。不要调用 `close --all`，也不要为断开自己的任务去关闭用户整个浏览器；涉及 session 断开时先核对当前版本的外部浏览器所有权行为。图片/评论的能力检查与七种方式一致，不能因 CLI 命令成功就标记采集完成。
