// 目的：将实际证据记录生成可读索引；不生成分析结论或修改阅读状态。
import fs from 'node:fs';
import path from 'node:path';
import { readJson, noteDate, evidenceDigest, isMain } from './lib.mjs';
import { validateResearch } from './validate_research.mjs';

const escape = value => String(value ?? '').replace(/[\\`*_\[\]<>|]/g, '\\$&').replace(/\r?\n/g, ' ');
const fileUrl = value => value.split(/[\\/]/).map(encodeURIComponent).join('/');
export function buildSourceIndex(directory) {
  const root = path.resolve(directory);
  const check = validateResearch(root, { write: false });
  if (!check.valid) throw new Error(`Fix evidence before indexing: ${check.errors.join('; ')}`);
  const research = readJson(path.join(root, 'research.json'));
  const sources = readJson(path.join(root, 'sources.json'));
  const lines = ['# 来源索引', '', `<!-- ChiHongshu index sha256: ${evidenceDigest(research, sources)} -->`, '', `主题：${escape(research.topic)}；状态：${escape(research.status)}。`, '', `采集时间：${escape(research.collectedAt)}；时区：${escape(research.timezone)}；独立来源：${sources.length}。`, '', '索引反映记录状态，不证明作者说法真实。评论仅限实际加载/检查范围，图像摘要来自实际核读。', ''];
  for (const source of sources) {
    const date = noteDate(source.dates, source.collectedAt, research.timezone);
    const queries = research.queries.filter(q => q.sourceIds.includes(source.id)).map(q => q.keyword);
    lines.push(`## ${escape(source.title)}`, '', `- 作者：${escape(source.author)}；[原帖](${source.url})。`, `- 日期：${escape(date.raw)}；采用：${date.kind}；解释：${date.basis}；解析日期：${date.date ?? '未知'}。`, `- 采集：${escape(source.collectedAt)}；阅读状态：${source.readStatus}。`, `- 检索词：${queries.map(escape).join('、')}。`, `- 图片：${source.images.length}/${source.imageCount} 条记录；评论加载 ${source.commentsLoaded}、检查 ${source.comments.length}、纳入 ${source.comments.filter(c => c.included).length}；排序：${escape(source.commentOrder)}。`);
    if (source.rawFile) lines.push(`- [正文及相关记录](${fileUrl(source.rawFile)})。`);
    if (source.limitations.length) lines.push(`- 限制：${source.limitations.map(escape).join('；')}。`);
    for (const image of source.images) lines.push(`- 图 ${image.index}：${image.status}；${escape(image.summary || image.reason)}${image.file ? `；[图像](${fileUrl(image.file)})` : ''}。`);
    lines.push('');
  }
  const target = path.join(root, 'source-index.md');
  fs.writeFileSync(target, lines.join('\n'), 'utf8');
  return target;
}
if (isMain(import.meta.url)) {
  try {
    if (process.argv.length !== 3) throw new Error('Usage: node scripts/build_source_index.mjs OUTPUT_DIRECTORY');
    console.log(JSON.stringify({ index: buildSourceIndex(process.argv[2]) }));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
