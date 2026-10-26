// 目的：初始化独立研究目录；已有目录不覆盖，不进行网页访问。
import fs from 'node:fs';
import path from 'node:path';
import { skillRoot, readJson, writeJson, isMain } from './lib.mjs';

export function initResearch(directory) {
  const root = path.resolve(directory);
  // 实际父目录解析避免通过符号链接将私有研究写进 Skill 仓库。
  let parent = path.dirname(root);
  while (!fs.existsSync(parent)) parent = path.dirname(parent);
  const realRoot = path.resolve(fs.realpathSync(parent), path.relative(parent, root));
  const rel = path.relative(fs.realpathSync(skillRoot), realRoot);
  if (rel === '' || (!rel.startsWith('..' + path.sep) && rel !== '..' && !path.isAbsolute(rel))) throw new Error('Use a research directory outside the skill repository');
  if (fs.existsSync(root)) throw new Error('Output directory already exists; refusing to overwrite');
  fs.mkdirSync(path.dirname(root), { recursive: true });
  fs.mkdirSync(root);
  const research = readJson(path.join(skillRoot, 'assets/research-data-template.json'));
  writeJson(path.join(root, 'research.json'), research);
  writeJson(path.join(root, 'sources.json'), []);
  fs.mkdirSync(path.join(root, 'evidence', 'notes'), { recursive: true });
  fs.mkdirSync(path.join(root, 'evidence', 'images'), { recursive: true });
  fs.copyFileSync(path.join(skillRoot, 'assets/report-template.md'), path.join(root, 'report.md'));
  fs.copyFileSync(path.join(skillRoot, 'assets/source-index-template.md'), path.join(root, 'source-index.md'));
  return root;
}
if (isMain(import.meta.url)) {
  try {
    if (process.argv.length !== 3) throw new Error('Usage: node scripts/init_research.mjs OUTPUT_DIRECTORY');
    console.log(JSON.stringify({ output: initResearch(process.argv[2]), status: 'draft' }));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
