import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { makeFixture, id, url } from './fixtures/research.mjs';
import { parseDisplayDate, noteDate, inRange, normalizeNoteUrl, dayAt, localFile, readJson, skillRoot } from '../scripts/lib.mjs';
import { initResearch } from '../scripts/init_research.mjs';
import { buildSourceIndex } from '../scripts/build_source_index.mjs';
import { validateResearch } from '../scripts/validate_research.mjs';

const collected = '2026-10-26T12:00:00+08:00';
const zone = 'Asia/Shanghai';
test('edited date takes precedence over original publication', () => {
  const date = noteDate({ edited: '10-20', published: '2025-01-01' }, collected, zone);
  assert.equal(date.date, '2026-10-20'); assert.equal(date.kind, 'edited'); assert.equal(date.basis, 'current-year-policy');
});
test('page date and publication fallback preserve their different meanings', () => {
  assert.equal(noteDate({ page: '2026-10-01', published: '2025-01-01' }, collected, zone).kind, 'page');
  assert.equal(noteDate({ published: '2025-01-01' }, collected, zone).kind, 'published');
  assert.equal(noteDate({ edited: '模糊时间', published: '2026-10-01' }, collected, zone).status, 'unknown');
});
test('year and relative day use task timezone across New Year', () => {
  const instant = '2026-12-31T16:30:00Z';
  assert.equal(dayAt(instant, zone), '2027-01-01');
  assert.equal(parseDisplayDate('01-01', instant, zone).date, '2027-01-01');
  assert.equal(parseDisplayDate('昨天', instant, zone).date, '2026-12-31');
});
test('invalid days and future month-day are not silently repaired', () => {
  assert.equal(parseDisplayDate('02-29', collected, zone).status, 'invalid');
  assert.equal(parseDisplayDate('12-01', collected, zone).status, 'future');
  assert.equal(parseDisplayDate('2024-02-29', collected, zone).status, 'resolved');
});
test('relative rounded times do not falsely pass narrow date boundaries', () => {
  const date = parseDisplayDate('1小时前', '2026-10-26T01:30:00+08:00', zone);
  assert.equal(date.earliest, '2026-10-25'); assert.equal(date.latest, '2026-10-26');
  assert.equal(inRange(date, { from: '2026-10-26', to: '2026-10-26' }), false);
  assert.equal(inRange(date, { from: '2026-10-25', to: '2026-10-26' }), true);
});
test('unknown dates allowed without scope, excluded with a date scope', () => {
  const unknown = parseDisplayDate('', collected, zone);
  assert.equal(inRange(unknown, null), true);
  assert.equal(inRange(unknown, { from: '2026-01-01', to: '2026-12-31' }), false);
});
test('collection timestamps without an offset cannot inherit the machine timezone', () => {
  assert.throws(() => dayAt('2026-10-26T12:00:00', zone), /explicit offset/);
});
test('URL normalization removes observed session parameters but rejects other hosts', () => {
  assert.equal(normalizeNoteUrl(`${url}?foo=bar`).url, url);
  assert.throws(() => normalizeNoteUrl('https://example.com/explore/' + id));
  assert.throws(() => normalizeNoteUrl('https://www.xiaohongshu.com@evil.example/explore/' + id));
});
test('valid simulated research passes final validation', t => {
  const { root } = makeFixture(t);
  const result = validateResearch(root, { final: true });
  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.equal(result.readyForDelivery, true);
  assert.equal(result.counts.commentsChecked, 2); assert.equal(result.counts.commentsIncluded, 1);
});
test('draft validation is not final delivery approval', t => {
  const { parent } = makeFixture(t);
  const root = initResearch(path.join(parent, 'draft'));
  const result = validateResearch(root);
  assert.equal(result.valid, true, result.errors.join('\n')); assert.equal(result.readyForDelivery, false);
  assert.equal(validateResearch(root, { final: true }).valid, false);
});
test('initializer refuses existing outputs and output inside skill repository', t => {
  const { root } = makeFixture(t);
  assert.throws(() => initResearch(root), /already exists/);
  assert.throws(() => initResearch(path.join(skillRoot, 'private-research')), /outside/);
});
test('cross-query coverage does not inflate unique sources', t => {
  const f = makeFixture(t);
  f.research.queries.push({ ...structuredClone(f.research.queries[0]), id: 'q2', keyword: '另一个词' });
  f.save(); buildSourceIndex(f.root);
  const result = validateResearch(f.root, { final: true });
  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.equal(result.counts.uniqueSources, 1); assert.equal(result.counts.queryCoverage.length, 2);
});
test('properly disclosed partial image reading can support a limited report', t => {
  const f = makeFixture(t);
  f.sources[0].images[0].status = 'partial'; f.sources[0].images[0].reason = '局部模糊';
  f.sources[0].readStatus = 'partial'; f.sources[0].limitations.push('局部模糊');
  f.research.status = 'limited'; f.research.gaps.push('局部图像不可读');
  f.save(); buildSourceIndex(f.root);
  assert.equal(validateResearch(f.root, { final: true }).valid, true);
});
test('strict eligible target can finish without saturation', t => {
  const f = makeFixture(t);
  f.research.sampling = { mode: 'strict', strictTarget: 1, strictUnit: 'eligible', strictDefinition: '模拟按顺序的首篇日期合格笔记' };
  f.research.queries[0].stopReason = 'strict-target'; f.save(); buildSourceIndex(f.root);
  const result = validateResearch(f.root, { final: true }); assert.equal(result.valid, true, result.errors.join('\n'));
});

const mutations = [
  ['missing image file', f => { f.sources[0].images[0].file = 'evidence/images/missing.png'; }, /missing image evidence/],
  ['saved image is not visual reading', f => { f.sources[0].images[0].summary = ''; }, /visual summary/],
  ['pending image cannot pass final', f => { f.sources[0].images[0].status = 'pending'; }, /pending image/],
  ['partial image cannot claim fully reviewed', f => { f.sources[0].images[0].status = 'partial'; }, /fully reviewed/],
  ['image gallery cannot become zero', f => { f.sources[0].images = []; f.sources[0].imageCount = 0; }, /empty gallery/],
  ['empty image metadata cannot hide missing image', f => { f.sources[0].imageCount = 2; }, /coverage count/],
  ['unread source cannot support final', f => { f.sources[0].readStatus = 'unread'; }, /unread source/],
  ['body not read', f => { f.sources[0].bodyRead = false; }, /body not actually read/],
  ['missing semantic review', f => { f.research.manualReview.claimsSupported = false; }, /Manual review missing/],
  ['missing required keyword', f => { f.research.requiredKeywords.push('未执行关键词'); }, /Required keyword/],
  ['missing source for claim', f => { f.research.claims[0].sourceIds = ['missing']; }, /missing\/unread/],
  ['comment date outside scope', f => { f.sources[0].comments[0].dateRaw = '2025-01-01'; }, /comment outside date/],
  ['reply context unknown', f => { f.sources[0].comments[0].contextUnderstood = false; }, /understood context/],
  ['duplicate comments', f => { f.sources[0].comments.push(structuredClone(f.sources[0].comments[0])); }, /duplicate comment/],
  ['loaded count cannot be lower than inspected', f => { f.sources[0].commentsLoaded = 1; }, /loaded comments/],
  ['duplicate sources', f => { f.sources.push(structuredClone(f.sources[0])); }, /duplicate ID/],
  ['candidate order cannot be fabricated', f => { f.research.queries[0].candidates.push({ sourceId: 'other', position: 1, snapshot: 'simulated-1', outcome: 'excluded', reason: '无关' }); }, /order not increasing/],
  ['unobserved coverage rejected', f => { f.research.queries[0].sourceIds = []; }, /coverage must match/],
  ['candidate budget enforced', f => { f.research.queries[0].candidates = Array.from({ length: 101 }, (_, i) => ({ sourceId: String(i), position: i + 1, snapshot: 'sim', outcome: 'excluded', reason: '时间不合格' })); f.research.queries[0].sourceIds = []; }, /candidate budget/],
  ['excluded comments still consume budget', f => { f.sources[0].comments = Array.from({ length: 101 }, (_, i) => ({ id: String(i), parentId: null, included: false, exclusionReason: '时间不合格' })); f.sources[0].commentsLoaded = 101; }, /inspection budget/],
  ['supplement rounds bounded', f => { f.research.queries[0].round = 3; }, /invalid supplement round/],
  ['supplement keywords bounded', f => { f.research.queries = Array.from({ length: 4 }, (_, i) => ({ ...structuredClone(f.research.queries[0]), id: String(i), round: 1 })); }, /exceeds keyword limit/],
  ['saturation requires counterexamples search', f => { f.research.queries[0].saturation.counterSearchAttempted = false; }, /counterSearchAttempted/],
  ['saturation window must use real final coverage', f => { f.research.queries[0].saturation.window[0].sourceId = 'other'; }, /last eligible notes/],
  ['cap cannot imply saturated evidence', f => { f.research.queries[0].stopReason = 'note-cap'; }, /cap not reached/],
  ['unknown question cannot be complete', f => { f.research.questions[0].status = 'unknown'; }, /Unknown question/],
  ['blocked cannot become final report', f => { f.research.status = 'blocked'; }, /blocked work/],
  ['native search-only capability cannot claim full workflow', f => { f.research.browser.capabilities.images = false; }, /capability missing/],
  ['strict target cannot silently use purposeful sampling', f => { f.research.sampling = { mode: 'strict', strictTarget: 2, strictDefinition: '前2篇合格笔记', strictUnit: 'eligible' }; }, /strict sampling cannot stop|strict target not met/i],
  ['strict raw positions cannot skip first result', f => { f.research.sampling = { mode: 'strict', strictTarget: 1, strictDefinition: '原始第1条', strictUnit: 'positions' }; f.research.queries[0].candidates[0].position = 2; }, /without gaps/],
  ['credential fields never stored', f => { f.sources[0].cookie = 'synthetic-test-only'; }, /credential field/],
  ['session URL rejected', f => { f.sources[0].url += '?xsec_token=synthetic-test-only'; }, /credential-like|canonical URL/],
  ['path escapes rejected', f => { f.sources[0].images[0].file = '../../outside.png'; }, /escapes/]
];
for (const [name, mutate, expected] of mutations) test(name, t => {
  const f = makeFixture(t); mutate(f); f.save();
  const result = validateResearch(f.root, { final: true });
  assert.equal(result.valid, false); assert.match(result.errors.join('\n'), expected);
});
test('source index becomes stale after evidence changes', t => {
  const f = makeFixture(t); f.sources[0].title = '修改后的模拟标题'; f.save();
  assert.match(validateResearch(f.root, { final: true }).errors.join('\n'), /index stale/);
  buildSourceIndex(f.root); assert.equal(validateResearch(f.root, { final: true }).valid, true);
});
test('report must contain actual source links and valid local paths', t => {
  const f = makeFixture(t);
  fs.writeFileSync(path.join(f.root, 'report.md'), '# 模拟报告\n[缺失](missing.md)\n');
  const result = validateResearch(f.root, { final: true });
  assert.match(result.errors.join('\n'), /broken local link/); assert.match(result.errors.join('\n'), /link absent/);
});
test('embedded report images must point to existing local evidence', t => {
  const f = makeFixture(t);
  fs.appendFileSync(path.join(f.root, 'report.md'), '\n![缺图](evidence/images/missing.png)\n');
  assert.match(validateResearch(f.root, { final: true }).errors.join('\n'), /broken local link/);
});
test('unavailable images cannot leave broken links in generated index', t => {
  const f = makeFixture(t);
  Object.assign(f.sources[0].images[0], { status: 'unavailable', file: 'missing.png', reason: '未取得' });
  f.sources[0].readStatus = 'partial'; f.sources[0].limitations.push('未取得图片'); f.save();
  assert.match(validateResearch(f.root).errors.join('\n'), /missing declared image/);
});
test('index produces actual source attribution and relative encoded links', t => {
  const f = makeFixture(t);
  const index = fs.readFileSync(buildSourceIndex(f.root), 'utf8');
  assert.ok(index.includes('模拟作者')); assert.ok(index.includes(url)); assert.ok(index.includes('current-year-policy'));
});
test('CLI reports nonzero exit on final validation failure', t => {
  const f = makeFixture(t); f.research.status = 'blocked'; f.save();
  const result = spawnSync(process.execPath, [path.join(skillRoot, 'scripts/validate_research.mjs'), f.root, '--final'], { encoding: 'utf8' });
  assert.equal(result.status, 1); assert.equal(readJson(path.join(f.root, 'checks.json')).readyForDelivery, false);
});
test('relative and absolute evidence paths cannot leave the research root', t => {
  const f = makeFixture(t);
  assert.throws(() => localFile(f.root, '../escape')); assert.throws(() => localFile(f.root, 'C:\\escape'));
  assert.throws(() => localFile(f.root, '/escape'));
});
