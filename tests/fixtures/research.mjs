// 仅供离线测试的模拟材料；ID、作者、内容均非真实采集，不作为研究证据。
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initResearch } from '../../scripts/init_research.mjs';
import { readJson, writeJson } from '../../scripts/lib.mjs';
import { buildSourceIndex } from '../../scripts/build_source_index.mjs';

export const id = '000000000000000000000001';
export const url = `https://www.xiaohongshu.com/explore/${id}`;
export function makeFixture(t) {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'chihongshu-test-'));
  t.after(() => {
    const resolved = path.resolve(parent);
    if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('chihongshu-test-')) throw new Error('Refusing cleanup outside isolated test directory');
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  const root = initResearch(path.join(parent, 'research'));
  const research = readJson(path.join(root, 'research.json'));
  Object.assign(research, {
    topic: '模拟研究', focus: ['模拟问题'], status: 'complete', collectedAt: '2026-10-26T12:00:00+08:00', timezone: 'Asia/Shanghai',
    dateRange: { from: '2026-01-01', to: '2026-10-26' }, requiredKeywords: ['模拟关键词'],
    budgetOverrideReason: '离线模拟用例，明确将阅读预算缩小为 1–2 篇，窗口 1 篇',
    browser: { mode: 'native-browser', checkedAt: '2026-10-26T11:00:00+08:00', capabilities: { body: true, images: true, comments: true, saveEvidence: true } },
    queries: [{ id: 'q1', keyword: '模拟关键词', purpose: '回答模拟问题', order: '默认', round: 0, status: 'done', candidates: [{ sourceId: id, snapshot: 'simulated-1', position: 1, outcome: 'included' }], sourceIds: [id], stopReason: 'saturated', stopExplanation: '模拟停止条件', saturation: { directEvidence: true, crossCheckAttempted: true, counterSearchAttempted: true, rationale: '仅供测试，无真实研究结论', window: [{ sourceId: id, newInformation: false, reason: '模拟无新增信息' }] } }],
    questions: [{ question: '模拟问题', status: 'answered', summary: '模拟回答', sourceIds: [id] }],
    claims: [{ id: 'c1', summary: '模拟判断', sourceIds: [id] }],
    limitations: ['全部内容为离线模拟，未访问真实帖子'],
    manualReview: { checkedAt: '2026-10-26T12:00:00+08:00', claimsSupported: true, attributionChecked: true, scopeDisclosed: true }
  });
  Object.assign(research.budgets, { minNotes: 1, maxNotes: 2, saturationWindow: 1 });
  const sources = [{
    id, url, title: '模拟帖子', author: '模拟作者', type: 'image', collectedAt: research.collectedAt,
    dates: { edited: '10-20', published: '2025-01-01', page: '' }, bodyText: '', bodyRead: true, readStatus: 'reviewed',
    imageCount: 1, images: [{ index: 1, status: 'read', file: 'evidence/images/simulated.png', summary: '测试生成的单像素图片，不是真实笔记' }],
    commentsLoaded: 2, commentOrder: '默认', commentLimitation: '',
    comments: [{ id: 'sim-c1', parentId: null, included: true, author: '模拟评论者', text: '模拟回复', dateRaw: '10-21', read: true, contextUnderstood: true }, { id: 'sim-c2', parentId: null, included: false, dateRaw: '2025-01-01', exclusionReason: '不在范围内' }],
    limitations: []
  }];
  fs.writeFileSync(path.join(root, 'evidence/images/simulated.png'), Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWZkAAAAASUVORK5CYII=', 'base64'));
  fs.writeFileSync(path.join(root, 'report.md'), `# 模拟报告\n\n仅用于离线测试。[模拟作者原帖](${url})。\n\n[索引](source-index.md)\n`, 'utf8');
  const save = () => { writeJson(path.join(root, 'research.json'), research); writeJson(path.join(root, 'sources.json'), sources); };
  save(); buildSourceIndex(root);
  return { root, parent, research, sources, save };
}
