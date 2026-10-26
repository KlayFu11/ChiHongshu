# Browser Use browser-harness 适配

`browser.mode: browser-harness`。官方资料核对：2026-10-26；未安装或本机实测。依据 [README](https://github.com/browser-use/browser-harness/blob/main/README.md)、[安装](https://github.com/browser-use/browser-harness/blob/main/install.md)、[官方 Skill](https://github.com/browser-use/browser-harness/blob/main/SKILL.md)、[截图](https://github.com/browser-use/browser-harness/blob/main/interaction-skills/screenshots.md)和[标签页](https://github.com/browser-use/browser-harness/blob/main/interaction-skills/tabs.md)。

## 前提与需确定的信息

| 信息 | 规则 |
|---|---|
| CLI/Python | 官方安装路径使用 uv 与 Python 3.12。已安装后读取 `browser-harness skill` 获取匹配版本的指南；缺失时给安装入口，不自动安装/强制升级。 |
| 本地 Chrome | 默认连接正在运行的 Chrome/Chromium CDP，使用现有登录态；官方介绍 Chrome 144+ 的远程调试复选框与连接 Allow。让用户确认实际目标环境。 |
| daemon | 顺序本地任务通常复用默认 daemon，省略 `BU_NAME`；已有确切命名 daemon 才保留其名称，不为每帖/每词建立新 daemon。 |
| endpoint（可选） | 已授权指定端点时，按当前版本使用 `BU_CDP_URL`（HTTP）或 `BU_CDP_WS`（WebSocket）；本地默认路径不需要浏览器 ID 或 API key。端点只用于连接，不落入研究报告。 |
| 录制偏好 | `browser-harness recordings` 查看现状；首次未设置时先问用户，默认不启用，已有偏好保留。不把一般研究等同于同意录制。 |
| 小红书登录与任务页 | 核对同一 Chrome 的登录状态；记录初始 tabs 和自己的新 tab。账号或 profile 需要切换时让用户决定，不复制登录资料。 |

安装指南可能建议全局优先使用其工具；本 Skill 只在用户已选择 browser-harness 时加载它，不移除其他技能或覆盖七项选择。云浏览器、profile 同步与新独立环境不是默认路径，需用户另行接受，不能为避免登录或验证码自动启用。

## 调用方式

CLI 从 stdin 执行 Python，helpers 已预导入。Bash 示例：

```bash
browser-harness <<'PY'
print(page_info())
print(list_tabs())
PY
```

PowerShell 使用 here-string 管道，不直接粘贴 Bash heredoc：

```powershell
@'
print(page_info())
print(list_tabs())
'@ | browser-harness
```

连接信息确认后，用 `new_tab("https://www.xiaohongshu.com")` 创建并保存任务 tab ID，先检查登录；不要先用 `goto_url` 导航覆盖当前用户页。每次调用不重复建新 tab，通过 `current_tab()`、`list_tabs()`、`switch_tab()` 复用本任务页面。

登录确认后按官方工作流取 AX/DOM 定位和文本，必要时 `js(...)`，用 `capture_screenshot(<研究文件路径>)` 捕获并实际查看每张图片。`cdp` 的参数用关键字传入，第二个位置参数是 session ID，不是参数字典。阅读时先检查页面身份及就绪状态，再提取内容。

## 注意与故障处理

- 一个 daemon 的 current tab 可变，多代理必须串行浏览；不能同时切换并点击，否则可能作用于别人的页。
- `switch_tab()` 不等于用户可见的前台切换；不因懒加载自动 `activate_tab()`。按当前指南处理焦点/可见性，仍受限时说明，不推断空白图片内容。
- `browser-harness --doctor` 用于诊断；已存在 daemon 可使用官方 `doctor --json --require-existing-daemon` 与已确认名称核对。连接失败时不改用任意端口或不断新建 daemon。
- Windows/Linux 出现 Chrome Allow 时，保留原等待命令，让用户批准后继续同一进程，不重复启动。macOS 专用辅助步骤只按当前指南和用户授权执行，不套用到 Windows。
- 截图像素和点击 CSS 坐标可能不同；图片缩放导致小字不可读时记录限制，不从降采样图猜文字。
- 未登录、验证码、MFA先告知并等待用户；本 Skill 不采用官方指南中可选的自动 SSO 例外来跳过用户的登录要求。
- 收尾只关闭自己的 task tabs，使用当前指南/暴露 helper，不猜测关闭命令。保留共享 daemon 与原有浏览器；不导出 cookie、不自动清理配置或启用云服务。
