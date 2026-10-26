// 目的：检查证据、预算、日期与报告的一致性；不证明作者真实或推导正确。
import fs from 'node:fs';
import path from 'node:path';
import { defaults, browserModes, readJson, writeJson, localFile, normalizeNoteUrl, dayAt, validDay, noteDate, parseDisplayDate, inRange, reportLinks, checkSecrets, nonempty, unique, isMain, evidenceDigest } from './lib.mjs';

export function validateResearch(directory, { final = false, write = true } = {}) {
  const root = path.resolve(directory);
  const errors = [], warnings = [];
  const require = (condition, message) => { if (!condition) errors.push(message); };
  const result = { checkedAt: new Date().toISOString(), valid: false, readyForDelivery: false, finalCheck: final, errors, warnings, counts: {}, limitations: ['Checks validate recorded consistency only; visual reading and claim support require actual review.'] };
  function finish() {
    result.valid = errors.length === 0;
    result.readyForDelivery = final && result.valid;
    if (write) writeJson(path.join(root, 'checks.json'), result);
    return result;
  }
  let research, sources;
  try { research = readJson(path.join(root, 'research.json')); sources = readJson(path.join(root, 'sources.json')); }
  catch { errors.push('Cannot read research.json or sources.json as JSON'); return finish(); }
  require(research && typeof research === 'object' && !Array.isArray(research), 'research must be an object');
  require(Array.isArray(sources), 'sources must be an array');
  if (errors.length) return finish();
  for (const field of ['focus', 'requiredKeywords', 'queries', 'questions', 'claims', 'gaps', 'limitations']) require(Array.isArray(research[field]), `${field} must be an array`);
  require([1, 2].includes(research.schemaVersion), 'Unsupported schemaVersion');
  require(['draft', 'running', 'blocked', 'limited', 'complete'].includes(research.status), 'Invalid research status');
  require(research.budgets && typeof research.budgets === 'object', 'budgets must be an object');
  require(research.sampling && ['purposeful', 'strict'].includes(research.sampling.mode), 'sampling.mode must be purposeful or strict');
  if (errors.length) return finish();
  errors.push(...checkSecrets(research, 'research'), ...checkSecrets(sources, 'sources'));
  const budgets = research.budgets;
  for (const key of Object.keys(defaults)) require(Number.isInteger(budgets[key]) && budgets[key] >= (key === 'supplementalRounds' ? 0 : 1), `Invalid budget ${key}`);
  require(budgets.minNotes <= budgets.maxNotes && budgets.maxNotes <= budgets.maxCandidates, 'Inconsistent note budgets');
  require(budgets.topLevelComments <= budgets.commentNodes, 'Comment budget smaller than top-level budget');
  if (Object.keys(defaults).some(key => budgets[key] !== defaults[key])) require(nonempty(research.budgetOverrideReason), 'Budget override requires an agreed reason');
  if (research.dateRange) require(validDay(research.dateRange.from) && validDay(research.dateRange.to) && research.dateRange.from <= research.dateRange.to, 'Invalid dateRange');
  if (sources.length || research.collectedAt || final) {
    try { dayAt(research.collectedAt, research.timezone); } catch { errors.push('Valid research collectedAt and timezone required'); }
  }
  const allowedModes = research.schemaVersion === 1 ? [...browserModes, 'native-browser'] : browserModes;
  if (research.schemaVersion === 1) {
    warnings.push('Legacy schema v1: historical login checks are not recorded; do not infer a current authenticated session.');
  } else {
    const browser = research.browser ?? {};
    const login = browser.login ?? {};
    const hasActivity = sources.length > 0 || research.queries.some(q => q?.status !== 'planned');
    const activeResearch = hasActivity && research.status !== 'blocked';
    require(browser.mode == null || allowedModes.includes(browser.mode), 'Select a supported browser mode; native-browser is legacy-only');
    require(['unknown', 'logged-in', 'logged-out', 'blocked'].includes(login.status), 'Invalid login status');
    if (final || activeResearch) {
      require(allowedModes.includes(browser.mode), 'Select a browser mode before research');
      require(nonempty(browser.host), 'Browser host required');
      require(login.status === 'logged-in', 'Xiaohongshu login must be confirmed before research');
    }
    if (login.status === 'logged-in') {
      require(nonempty(login.evidence), 'Login check needs observed evidence, not an assumed session');
      try { dayAt(login.checkedAt, research.timezone); } catch { errors.push('Login check needs a valid timestamp with explicit offset'); }
    }
    if (login.status === 'logged-out') {
      try { dayAt(login.userNotifiedAt, research.timezone); } catch { errors.push('Logged-out state requires prior user notification timestamp'); }
    }
    if (final || hasActivity || ['logged-in', 'logged-out'].includes(login.status)) {
      const connection = browser.connection ?? {};
      require(['existing-session', 'dedicated-profile', 'remote-session'].includes(connection.kind), 'Select a connection kind');
      require(nonempty(connection.target), 'A non-secret connection target description is required');
      if (['dedicated-profile', 'remote-session'].includes(connection.kind)) require(connection.independentEnvironmentApproved === true, 'Independent environment needs user approval before use');
    }
  }
  if (final) {
    require(['complete', 'limited'].includes(research.status), 'Final report requires complete or limited status; blocked work remains a stage report');
    require(nonempty(research.topic) && research.focus.length > 0, 'Topic and focus required');
    require(allowedModes.includes(research.browser?.mode), 'Select a browser mode');
    require(nonempty(research.browser?.checkedAt), 'Browser capability check required');
    for (const cap of ['body', 'images', 'comments', 'saveEvidence']) require(research.browser?.capabilities?.[cap] === true, `Browser capability missing: ${cap}`);
    require(sources.length > 0 && research.queries.length > 0 && research.questions.length > 0, 'Final report needs actual sources, queries and question coverage');
    require(nonempty(research.manualReview?.checkedAt), 'Manual semantic review timestamp required');
    for (const key of ['claimsSupported', 'attributionChecked', 'scopeDisclosed']) require(research.manualReview?.[key] === true, `Manual review missing: ${key}`);
    if (research.status === 'limited') require(research.gaps.length > 0 || research.limitations.length > 0, 'Limited report requires disclosed gaps or limitations');
  }
  const sourceMap = new Map();
  let imageCount = 0, imageRead = 0, checkedComments = 0, includedComments = 0;
  for (const source of sources) {
    try {
      require(source && typeof source === 'object', 'Invalid source');
      if (!source || typeof source !== 'object') continue;
      const label = `source ${source.id ?? '(missing id)'}`;
      require(!sourceMap.has(source.id), `${label}: duplicate ID`);
      sourceMap.set(source.id, source);
      const normalized = normalizeNoteUrl(source.url);
      require(normalized.id === source.id, `${label}: ID and URL mismatch`);
      require(source.url === normalized.url, `${label}: save canonical URL without session parameters`);
      for (const key of ['title', 'author', 'collectedAt']) require(nonempty(source[key]), `${label}: missing ${key}`);
      require(typeof source.bodyText === 'string', `${label}: bodyText must preserve observed text (empty allowed)`);
      if (final) require(source.bodyRead === true, `${label}: body not actually read`);
      require(['image', 'text', 'video'].includes(source.type), `${label}: invalid type`);
      require(['reviewed', 'partial', 'unread'].includes(source.readStatus), `${label}: invalid readStatus`);
      require(Array.isArray(source.limitations), `${label}: limitations array required`);
      const limitations = Array.isArray(source.limitations) ? source.limitations : [];
      const date = noteDate(source.dates, source.collectedAt, research.timezone);
      require(inRange(date, research.dateRange), `${label}: date invalid, uncertain, future or outside scope`);
      if (date.status === 'unknown' || date.basis === 'current-year-policy') warnings.push(`${label}: date uses ${date.basis}`);
      if (source.readStatus !== 'reviewed') {
        warnings.push(`${label}: ${source.readStatus}`);
        require(limitations.length > 0, `${label}: non-reviewed source needs limitations`);
      }
      if (final) require(source.readStatus !== 'unread', `${label}: unread source cannot enter final evidence`);
      if (source.rawFile) require(fs.existsSync(localFile(root, source.rawFile)), `${label}: missing rawFile`);
      require(Number.isInteger(source.imageCount) && source.imageCount >= 0 && Array.isArray(source.images), `${label}: invalid image metadata`);
      if (source.type === 'image') require(source.imageCount > 0, `${label}: image note cannot claim an empty gallery`);
      if (Array.isArray(source.images)) {
        imageCount += source.images.length;
        require(source.images.length === source.imageCount, `${label}: image coverage count mismatch`);
        require(unique(source.images.map(im => im.index)), `${label}: duplicate image index`);
        for (const im of source.images) {
          require(Number.isInteger(im.index) && im.index >= 1 && im.index <= source.imageCount, `${label}: invalid image index`);
          require(['read', 'partial', 'unavailable', 'pending'].includes(im.status), `${label}: invalid image status`);
          if (im.file) require(fs.existsSync(localFile(root, im.file)), `${label} image ${im.index}: missing declared image file`);
          if (['read', 'partial'].includes(im.status)) {
            require(nonempty(im.summary), `${label} image ${im.index}: missing visual summary`);
            require(fs.existsSync(localFile(root, im.file)), `${label} image ${im.index}: missing image evidence`);
            imageRead++;
          }
          if (im.status !== 'read') {
            require(nonempty(im.reason) && limitations.length > 0, `${label} image ${im.index}: limitation required`);
            require(source.readStatus !== 'reviewed', `${label}: incomplete image cannot be marked fully reviewed`);
          }
          if (final) require(im.status !== 'pending', `${label}: pending image in final evidence`);
        }
      }
      require(Array.isArray(source.comments), `${label}: comments array required`);
      const comments = Array.isArray(source.comments) ? source.comments : [];
      require(unique(comments.map(c => c.id)), `${label}: duplicate comment IDs`);
      require(comments.length <= budgets.commentNodes, `${label}: comment inspection budget exceeded`);
      require(Number.isInteger(source.commentsLoaded) && source.commentsLoaded >= comments.length, `${label}: loaded comments below inspected count`);
      require(nonempty(source.commentOrder), `${label}: actual comment order required`);
      const included = comments.filter(c => c.included === true);
      checkedComments += comments.length; includedComments += included.length;
      require(included.filter(c => c.parentId === null).length <= budgets.topLevelComments, `${label}: top-level comment budget exceeded`);
      for (const comment of comments) {
        require(nonempty(comment.id) && typeof comment.included === 'boolean', `${label}: comment identity and inclusion required`);
        require(comment.parentId === null || nonempty(comment.parentId), `${label}: comment parentId must be null or a reply parent identifier`);
        if (comment.included) {
          require(nonempty(comment.author) && nonempty(comment.text) && comment.read === true, `${label}: included comment lacks actual reading/attribution`);
          require(comment.contextUnderstood === true, `${label}: included comment lacks understood context`);
          require(inRange(parseDisplayDate(comment.dateRaw, source.collectedAt, research.timezone), research.dateRange), `${label}: included comment outside date scope or uncertain`);
        } else require(nonempty(comment.exclusionReason), `${label}: excluded comment needs a reason`);
      }
      if (source.commentLimitation) require(limitations.length > 0, `${label}: comment limitation must be disclosed`);
    } catch (error) { errors.push(`source ${source?.id ?? '(missing id)'}: ${error.message}`); }
  }
  const queryIds = [], referencedSources = new Set();
  const rounds = new Map();
  for (const query of research.queries) {
    try {
      const label = `query ${query.id}`;
      queryIds.push(query.id);
      require(nonempty(query.id) && nonempty(query.keyword) && nonempty(query.purpose) && nonempty(query.order), `${label}: identity, purpose and actual ordering required`);
      require(Number.isInteger(query.round) && query.round >= 0 && query.round <= budgets.supplementalRounds, `${label}: invalid supplement round`);
      if (query.round > 0) rounds.set(query.round, (rounds.get(query.round) ?? 0) + 1);
      require(['planned', 'running', 'done', 'blocked'].includes(query.status), `${label}: invalid status`);
      require(Array.isArray(query.candidates) && Array.isArray(query.sourceIds), `${label}: candidates and sourceIds required`);
      if (!Array.isArray(query.candidates) || !Array.isArray(query.sourceIds)) continue;
      require(unique(query.candidates.map(c => c.sourceId)), `${label}: candidate must be counted once per keyword`);
      require(unique(query.sourceIds), `${label}: duplicate coverage ID`);
      require(query.candidates.length <= budgets.maxCandidates, `${label}: candidate budget exceeded`);
      require(query.sourceIds.length <= budgets.maxNotes, `${label}: note coverage budget exceeded`);
      const snapshots = new Map();
      for (const c of query.candidates) {
        require(nonempty(c.sourceId) && nonempty(c.snapshot) && Number.isInteger(c.position) && c.position > 0, `${label}: invalid candidate identity/snapshot/position`);
        require(c.position > (snapshots.get(c.snapshot) ?? 0), `${label}: candidate order not increasing within snapshot`);
        snapshots.set(c.snapshot, c.position);
        require(['included', 'excluded', 'unavailable'].includes(c.outcome), `${label}: invalid candidate outcome`);
        if (c.outcome !== 'included') require(nonempty(c.reason), `${label}: exclusion/access failure reason required`);
      }
      const includedIds = query.candidates.filter(c => c.outcome === 'included').map(c => c.sourceId);
      require(JSON.stringify(includedIds) === JSON.stringify(query.sourceIds), `${label}: coverage must match included candidates in observed order`);
      for (const id of query.sourceIds) {
        require(sourceMap.has(id), `${label}: unknown source ID ${id}`);
        referencedSources.add(id);
      }
      if (final) {
        require(query.status === 'done', `${label}: unfinished query in final report`);
        require(['saturated', 'note-cap', 'candidate-cap', 'exhausted', 'strict-target'].includes(query.stopReason), `${label}: invalid final stop reason`);
        require(nonempty(query.stopExplanation), `${label}: stopping explanation required`);
        if (query.stopReason === 'note-cap') require(query.sourceIds.length === budgets.maxNotes, `${label}: note cap not reached`);
        if (query.stopReason === 'candidate-cap') require(query.candidates.length === budgets.maxCandidates, `${label}: candidate cap not reached`);
        if (query.sourceIds.length < budgets.minNotes) require(research.gaps.length > 0 || research.limitations.length > 0, `${label}: insufficient coverage needs disclosure`);
        if (query.stopReason === 'saturated') {
          require(research.sampling.mode !== 'strict', `${label}: strict sampling cannot stop for saturation`);
          require(query.sourceIds.length >= budgets.minNotes, `${label}: saturation below minimum`);
          const sat = query.saturation ?? {};
          for (const key of ['directEvidence', 'crossCheckAttempted', 'counterSearchAttempted']) require(sat[key] === true, `${label}: saturation missing ${key}`);
          require(nonempty(sat.rationale), `${label}: saturation rationale required`);
          const window = sat.window ?? [];
          require(Array.isArray(window) && window.length === budgets.saturationWindow, `${label}: saturation window size mismatch`);
          if (Array.isArray(window)) {
            require(JSON.stringify(window.map(w => w.sourceId)) === JSON.stringify(query.sourceIds.slice(-budgets.saturationWindow)), `${label}: saturation must use last eligible notes`);
            require(window.every(w => w.newInformation === false && nonempty(w.reason)), `${label}: saturation requires actual per-note assessment`);
          }
        }
      }
      if (research.sampling.mode === 'strict') {
        require(Number.isInteger(research.sampling.strictTarget) && research.sampling.strictTarget > 0 && nonempty(research.sampling.strictDefinition), 'Strict sampling requires target and unambiguous definition');
        require(['eligible', 'positions'].includes(research.sampling.strictUnit), 'Strict sampling unit must be eligible or positions');
        const count = research.sampling.strictUnit === 'positions' ? query.candidates.length : query.sourceIds.length;
        if (research.sampling.strictUnit === 'positions') require(query.candidates.every((c, i) => c.position === i + 1 && c.snapshot === query.candidates[0]?.snapshot), `${label}: strict positions require one ordered snapshot without gaps`);
        if (final && (research.status === 'complete' || query.stopReason === 'strict-target')) require(count === research.sampling.strictTarget, `${label}: strict target not met exactly`);
        if (final && count !== research.sampling.strictTarget) require(research.status === 'limited' && research.gaps.length > 0, `${label}: unmet strict target requires limited status and gaps`);
      }
    } catch (error) { errors.push(`query structure: ${error.message}`); }
  }
  require(unique(queryIds), 'Duplicate query IDs');
  for (const [round, count] of rounds) require(count <= budgets.keywordsPerRound, `Supplement round ${round} exceeds keyword limit`);
  if (rounds.size > 0) for (let i = 1; i <= Math.max(...rounds.keys()); i++) require(rounds.has(i), 'Supplement rounds must be consecutive');
  if (final) {
    for (const keyword of research.requiredKeywords) require(research.queries.some(q => q.keyword === keyword && q.status === 'done'), 'Required keyword not completed');
    for (const id of sourceMap.keys()) require(referencedSources.has(id), `Source ${id} missing query provenance`);
  }
  for (const question of research.questions) {
    require(nonempty(question.question) && ['answered', 'unknown'].includes(question.status), 'Invalid question coverage');
    require(nonempty(question.summary) && Array.isArray(question.sourceIds), 'Question needs evidence summary and sourceIds');
    for (const id of question.sourceIds ?? []) require(sourceMap.has(id), 'Question references unknown source');
    if (question.status === 'answered') require(question.sourceIds?.length > 0, 'Answered question needs source evidence');
    if (final && question.status === 'unknown') require(research.gaps.length > 0 && research.status === 'limited', 'Unknown question requires limited report with gaps');
  }
  const reportPath = path.join(root, 'report.md');
  const report = fs.existsSync(reportPath) ? fs.readFileSync(reportPath, 'utf8') : '';
  errors.push(...checkSecrets(report, 'report'));
  const cited = new Set();
  for (const link of reportLinks(report)) {
    try {
      if (link.startsWith('#')) continue;
      if (/^https?:/i.test(link)) {
        const normalized = normalizeNoteUrl(link);
        require(link === normalized.url, 'Report source URL must be canonical and credential-free');
        require(sourceMap.has(normalized.id), 'Report cites a source absent from evidence');
        cited.add(normalized.id);
      } else require(fs.existsSync(localFile(root, decodeURIComponent(link.split('#')[0]))), 'Report has broken local link');
    } catch { errors.push('Report contains invalid, non-note, or unsafe link'); }
  }
  require(unique(research.claims.map(c => c.id)), 'Duplicate claim IDs');
  for (const claim of research.claims) {
    require(nonempty(claim.id) && nonempty(claim.summary) && Array.isArray(claim.sourceIds) && claim.sourceIds.length > 0, 'Claim needs ID, summary and original sources');
    for (const id of claim.sourceIds ?? []) {
      require(sourceMap.has(id) && sourceMap.get(id)?.readStatus !== 'unread', 'Claim uses missing/unread source');
      if (final) require(cited.has(id), 'Claim source link absent from report');
    }
  }
  if (final) {
    require(nonempty(report) && !/尚未采集|阶段稿|模板提示/.test(report), 'Final report missing or still marked as a draft/template');
    require(research.claims.length > 0, 'Final analysis requires a claim/source ledger');
    const indexPath = path.join(root, 'source-index.md');
    require(fs.existsSync(indexPath), 'Source index required');
    if (fs.existsSync(indexPath)) require(fs.readFileSync(indexPath, 'utf8').includes(`<!-- ChiHongshu index sha256: ${evidenceDigest(research, sources)} -->`), 'Source index stale or not generated from current evidence');
  }
  result.counts = { uniqueSources: sourceMap.size, queryCoverage: research.queries.map(q => ({ id: q.id, count: q.sourceIds?.length ?? 0 })), imageCount, imagesReadOrPartial: imageRead, commentsChecked: checkedComments, commentsIncluded: includedComments };
  return finish();
}

if (isMain(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length < 1 || args.length > 2 || (args[1] && args[1] !== '--final')) throw new Error('Usage: node scripts/validate_research.mjs OUTPUT_DIRECTORY [--final]');
    const result = validateResearch(args[0], { final: args[1] === '--final' });
    console.log(JSON.stringify(result, null, 2));
    if (!result.valid) process.exitCode = 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
