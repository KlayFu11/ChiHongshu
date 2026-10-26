# 证据、数据结构与日期

数据目录位于 Skill 仓库之外，避免将用户研究、原图或登录材料一起提交 Git。辅助脚本不抓网页，Agent 使用所选浏览工具取得材料后写入 JSON。模板在 [research-data-template.json](../assets/research-data-template.json)。字段不是已执行的证明，不提前填写核读和人工复核通过。

## research.json

- 新任务使用 `schemaVersion: 2`；`status` 为 `draft`、`running`、`blocked`、`limited` 或 `complete`。旧 v1 数据可原样校验并提示缺少历史登录记录，不自动迁移、不补造当时的登录检查。
- `topic`、`focus[]`、`requiredKeywords[]` 描述用户需求；`collectedAt` 是带时区偏移的 ISO 时间，`timezone` 为任务所在 IANA 时区，例如 `Asia/Shanghai`。记录本次真实时间，不沿用示例年份。
- `dateRange` 为 `null` 或闭区间 `{ "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" }`，按本次时区的日历日期解释。
- `browser` 记录七项中选择的 `mode`、实际 `host` 和 `toolVersion`、`connection`（连接类型、非敏感目标说明及独立环境是否获用户接受）、`login`（实际小红书登录状态、检查时间/依据及未登录通知时间）。字段与流程见 [选择与登录检查](browser-selection.md)。`checkedAt` 和 `capabilities` 的正文 `body`、图像 `images`、评论 `comments`、证据保存 `saveEvidence` 是登录成功后的小样本实际结果，尚未检查保持 false。
- `budgets` 字段见研究协议；修改默认数值时填 `budgetOverrideReason`，保存用户要求或任务开始时约定的理由。
- `sampling.mode` 默认为 `purposeful`。严格模式为 `strict`，另填正整数 `strictTarget`、`strictUnit`（`eligible` 或 `positions`）及自然语言 `strictDefinition`。原始位置模式须保留单个快照从 1 开始无跳号的候选。
- `queries[]` 每条含 `id`、`keyword`、`purpose`、实际 `order`、`round`（初始 0，补查 1/2）、`status`、`candidates[]`、有序 `sourceIds[]`。候选含 `sourceId`、`snapshot`、`position`、`outcome`（`included/excluded/unavailable`）和排除原因 `reason`。每词只保留每个候选的首次检查记录；额外重试细节可另存原始记录。
- 完成查询需 `stopReason`（`saturated/note-cap/candidate-cap/exhausted/strict-target`）与 `stopExplanation`。饱和时另填 `saturation`：`directEvidence`、`crossCheckAttempted`、`counterSearchAttempted`、`rationale` 与 `window[]`（最近 5 个覆盖 ID、`newInformation: false`、判断 `reason`）。这些布尔值来自真实阅读后的简短评估，不是脚本自动判断。
- `questions[]` 含 `question`、`status: answered/unknown`、`summary`、`sourceIds[]`；`claims[]` 含 `id`、`summary`、`sourceIds[]`，映射报告实质判断与原帖，不要求报告细粒度引注。
- `gaps[]`、`limitations[]` 记录缺口与限制。`manualReview` 在语义核对后填写 `checkedAt`、`claimsSupported`、`attributionChecked`、`scopeDisclosed`。如果原帖不足以支持一个判断，应修改判断而不是勾选通过。

## sources.json

这是来源数组。每个来源保存以下字段，内容来自实际访问：

```json
{
  "id": "000000000000000000000001",
  "url": "https://www.xiaohongshu.com/explore/000000000000000000000001",
  "title": "模拟结构示例，不是真实帖子",
  "author": "模拟作者",
  "type": "image",
  "collectedAt": "2026-10-26T12:00:00+08:00",
  "dates": { "edited": "10-20", "page": "", "published": "" },
  "bodyText": "实际正文；正文确实为空时允许空字符串",
  "bodyRead": false,
  "readStatus": "unread",
  "rawFile": null,
  "imageCount": 1,
  "images": [{ "index": 1, "status": "pending", "file": null, "summary": "", "reason": "尚未查看" }],
  "commentOrder": "页面默认顺序",
  "commentsLoaded": 0,
  "commentLimitation": "尚未加载",
  "comments": [],
  "limitations": ["模拟结构示例；尚未核读"]
}
```

ID 和详情 URL 必须来自实际站内页面，不自行编造。保存规范原帖链接，移除会话参数；某些清洁链接重访仍需通过站内搜索恢复，不能承诺无需登录即可访问。正文可直接存 `bodyText`；需要完整上下文文件时填相对路径 `rawFile`。不保存凭证、cookie、会话 token 或无关个人联系方式。

`readStatus` 为 `reviewed/partial/unread`。`images[].status` 为 `read/partial/unavailable/pending`；`read` 和 `partial` 必须有实际图片文件的相对路径和视觉摘要。其他状态填原因；有局部不可读就将来源标记 `partial` 并披露限制，不能补写想象的文字。纯文本帖 `type: text` 可为 0 图，图文帖必须保留真实图数。视频 `type: video` 只记录实际读到的封面、标题、正文和评论。

`comments[]` 是实际检查过的去重节点，不是全部已加载列表。每条含 `id`、`parentId`（一级为 null，回复为实际父节点 ID）、`included`。纳入项还需 `author`、`text`、`dateRaw`、`read: true`、`contextUnderstood: true`；排除项填 `exclusionReason`。日期不合格节点可只存标识、日期及排除原因，不将其文字用于报告。回复缺父层但仍无法理解时不得纳入。保留原始点赞值可以辅助比较，不能冒称全站最高赞。

`commentsLoaded` 是实际加载量，至少不小于检查节点数；若加载总数不能可靠核实，只记录确实观察到的下界并在 `commentLimitation` 说明。所有受限范围同时进入来源 `limitations`。不能把网站显示的总评论数填成实际已加载数。

## 日期解释

笔记依次使用 `dates.edited`、`dates.page`、`dates.published`；前项存在但不可解析时保留未知，不偷偷换成其他时间通过筛选。`page` 指页面未区分发布/编辑的普通日期；`published` 回退仅在未取得前两类日期时使用。评论使用自身 `dateRaw`。

脚本支持完整年月日、无年份月日、今天/昨天/前天、刚刚以及整数分钟/小时/天前。无年份月日按采集时区中的当年解释，是本 Skill 的用户约定，不是独立验证的平台保证。保留 `raw`、解析结果及 `basis`；显示只有月日但按当年得到未来日期时标异常，不擅自回推到去年。

“N 小时前/天前”可能经过取整，脚本给出可能跨日的区间。只有整个可能日期区间都落在筛选范围内才纳入；边界不明须补查明确时间或排除。不能从不完整日期猜出日历精度。

明确时间范围时，笔记与纳入评论分别校验；日期未知/非法/未来异常或跨范围不纳入合格证据。没有范围时不排除日期未知材料，但注明日期未知；非法或未来异常日期仍需核实而不能包装为可靠日期。编辑日期不能证明所述经历的发生时间。
