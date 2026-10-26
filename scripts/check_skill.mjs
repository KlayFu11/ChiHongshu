// 目的：检查发布包的本地引用、JSON、UI 元信息及 JavaScript 语法，不联网。
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { skillRoot, readJson, isMain } from './lib.mjs';

export function checkSkill(root = skillRoot) {
  const errors = [], files = [];
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (['.git', 'node_modules', '.venv'].includes(entry.name)) continue;
      const file = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) { errors.push('Unexpected symlink in skill package'); continue; }
      if (entry.isDirectory()) visit(file); else files.push(file);
    }
  }
  visit(root);
  const skill = fs.readFileSync(path.join(root, 'SKILL.md'), 'utf8');
  if (!/^---\r?\nname: chihongshu\r?\ndescription: .+\r?\n---/.test(skill)) errors.push('Missing expected skill identity or description');
  const ui = fs.readFileSync(path.join(root, 'agents/openai.yaml'), 'utf8');
  if (!ui.includes('display_name: "ChiHongshu"') || !ui.includes('$chihongshu')) errors.push('UI identity mismatch');
  const short = ui.match(/short_description: "([^"]+)"/)?.[1];
  if (!short || short.length < 25 || short.length > 64) errors.push('UI short description length invalid');
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    if (text.includes('\uFFFD')) errors.push(`${path.relative(root, file)}: replacement character`);
    if (file.endsWith('.json')) { try { readJson(file); } catch { errors.push(`${path.relative(root, file)}: invalid JSON`); } }
    if (file.endsWith('.md')) {
      const prose = text.replace(/^```[^\n]*\n[\s\S]*?^```\s*$/gm, '');
      for (const match of prose.matchAll(/\[[^\]\n]*\]\(([^\s)]+)\)/g)) {
        const link = match[1];
        if (/^(?:https?:|#)/.test(link)) continue;
        const target = path.resolve(path.dirname(file), decodeURIComponent(link.split('#')[0]));
        if (!fs.existsSync(target)) errors.push(`${path.relative(root, file)}: broken resource link ${link}`);
      }
    }
    if (file.endsWith('.mjs')) {
      const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
      if (result.status !== 0) errors.push(`${path.relative(root, file)}: syntax check failed`);
    }
  }
  return { files: files.length, errors, valid: errors.length === 0 };
}
if (isMain(import.meta.url)) {
  const result = checkSkill(); console.log(JSON.stringify(result, null, 2));
  if (!result.valid) process.exitCode = 1;
}
