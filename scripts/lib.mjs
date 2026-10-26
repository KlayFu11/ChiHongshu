// 目的：共享本地证据读写、日期判断和路径检查；不访问网络。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

export const skillRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const defaults = Object.freeze({ minNotes: 20, maxNotes: 30, maxCandidates: 100, topLevelComments: 30, commentNodes: 100, supplementalRounds: 2, keywordsPerRound: 3, saturationWindow: 5 });
export const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
export const writeJson = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8');
export const isMain = url => Boolean(process.argv[1]) && path.resolve(process.argv[1]) === fileURLToPath(url);
export const nonempty = value => typeof value === 'string' && value.trim().length > 0;
export const unique = values => new Set(values).size === values.length;
export const evidenceDigest = (research, sources) => createHash('sha256').update(JSON.stringify({ research, sources })).digest('hex');
export function localFile(root, relative) {
  if (!nonempty(relative) || path.isAbsolute(relative) || /^[a-z]:|^[\\/]/i.test(relative)) throw new Error('Evidence path must be relative');
  const resolved = path.resolve(root, relative.replaceAll('\\', '/'));
  const rel = path.relative(path.resolve(root), resolved);
  if (rel === '..' || rel.startsWith('..' + path.sep)) throw new Error('Evidence path escapes output directory');
  if (fs.existsSync(resolved)) {
    const realRel = path.relative(fs.realpathSync(root), fs.realpathSync(resolved));
    if (realRel === '..' || realRel.startsWith('..' + path.sep) || path.isAbsolute(realRel)) throw new Error('Evidence symlink escapes output directory');
  }
  return resolved;
}
export function normalizeNoteUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || !['www.xiaohongshu.com', 'xiaohongshu.com'].includes(url.hostname) || url.username || url.password || url.port) throw new Error('Expected an original Xiaohongshu HTTPS note URL');
  const match = url.pathname.match(/^\/(?:explore|discovery\/item)\/([a-f\d]{24})\/?$/i);
  if (!match) throw new Error('Expected a note detail URL with its observed ID');
  return { id: match[1].toLowerCase(), url: `https://www.xiaohongshu.com/explore/${match[1].toLowerCase()}` };
}
export function dayAt(instant, timezone) {
  const date = new Date(instant);
  if (typeof instant !== 'string' || !/T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/i.test(instant) || !Number.isFinite(date.valueOf()) || !timezone) throw new Error('Valid collectedAt with explicit offset and timezone are required');
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  return ['year', 'month', 'day'].map(key => parts.find(p => p.type === key).value).join('-');
}
export function validDay(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return false;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}
const shiftDay = (day, delta) => new Date(new Date(day + 'T00:00:00Z').valueOf() + delta * 86400000).toISOString().slice(0, 10);

export function parseDisplayDate(raw, collectedAt, timezone) {
  const result = { raw: raw ?? '', date: null, basis: 'unknown', status: 'unknown' };
  const today = dayAt(collectedAt, timezone);
  if (!nonempty(raw)) return result;
  const text = raw.trim().replace(/^(?:编辑于|发布于|发表于)\s*/, '').replace(/\s+(?:编辑|发布)$/, '');
  const suffix = '(?:\\s+\\d{1,2}:\\d{2}(?::\\d{2})?)?';
  let match = text.match(new RegExp('^(\\d{4})[-/.年](\\d{1,2})[-/.月](\\d{1,2})日?' + suffix + '$'));
  if (match) {
    result.date = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
    result.basis = 'explicit-year';
  } else if ((match = text.match(new RegExp('^(\\d{1,2})[-/.月](\\d{1,2})日?' + suffix + '$')))) {
    result.date = `${today.slice(0, 4)}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
    result.basis = 'current-year-policy';
  } else if ((match = text.match(/^(今天|昨天|前天)(?:\s+\d{1,2}:\d{2})?$/))) {
    result.date = shiftDay(today, -({ 今天: 0, 昨天: 1, 前天: 2 }[match[1]]));
    result.basis = 'relative-calendar-day';
  } else if (text === '刚刚') {
    result.date = today;
    result.basis = 'relative-instant';
  } else if ((match = text.match(/^(\d+)\s*(分钟|小时|天)前$/))) {
    const count = Number(match[1]);
    if (match[2] === '天') {
      result.date = shiftDay(today, -count);
      result.earliest = shiftDay(result.date, -1);
      result.latest = result.date;
      result.basis = 'relative-rounded-days';
    } else {
      const unit = match[2] === '小时' ? 3600000 : 60000;
      result.latest = dayAt(new Date(new Date(collectedAt).valueOf() - count * unit).toISOString(), timezone);
      result.earliest = dayAt(new Date(new Date(collectedAt).valueOf() - (count + 1) * unit).toISOString(), timezone);
      result.date = result.latest;
      result.basis = 'relative-rounded-time';
    }
  } else return result;
  result.status = !validDay(result.date) ? 'invalid' : result.date > today ? 'future' : 'resolved';
  return result;
}
export function noteDate(dates, collectedAt, timezone) {
  for (const kind of ['edited', 'page', 'published']) {
    if (nonempty(dates?.[kind])) return { ...parseDisplayDate(dates[kind], collectedAt, timezone), kind };
  }
  return { ...parseDisplayDate('', collectedAt, timezone), kind: 'unknown' };
}
export function inRange(date, range) {
  if (date.status === 'invalid' || date.status === 'future') return false;
  if (!range) return true;
  if (date.status !== 'resolved') return false;
  return (date.earliest ?? date.date) >= range.from && (date.latest ?? date.date) <= range.to;
}
export function reportLinks(text) {
  return [...text.matchAll(/\[[^\]\n]*\]\(<?([^\s)>]+)>?(?:\s+"[^"]*")?\)/g)].map(match => match[1]);
}
export function checkSecrets(value, where = 'data', findings = []) {
  if (typeof value === 'string' && /(?:xsec_token\s*[=:]|[?&](?:access_token|auth_token|sessionid|cookie|token)=|authorization\s*:\s*bearer|-----BEGIN (?:RSA |OPENSSH )?PRIVATE KEY-----)/i.test(value)) findings.push(`${where}: credential-like content`);
  if (value && typeof value === 'object') for (const [key, item] of Object.entries(value)) {
    if (/^(cookie|cookies|password|authorization|access_token|auth_token|xsec_token|sessionid|private_key)$/i.test(key)) findings.push(`${where}.${key}: forbidden credential field`);
    checkSecrets(item, `${where}.${key}`, findings);
  }
  return findings;
}
