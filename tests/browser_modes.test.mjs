// 模拟协议校验；不会启动、安装或连接任何真实浏览器。
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { makeFixture } from './fixtures/research.mjs';
import { buildSourceIndex } from '../scripts/build_source_index.mjs';
import { validateResearch } from '../scripts/validate_research.mjs';
import { initResearch } from '../scripts/init_research.mjs';
import { readJson } from '../scripts/lib.mjs';

function currentFixture(t, mode = 'codex-chrome') {
  const f = makeFixture(t);
  f.research.schemaVersion = 2;
  Object.assign(f.research.browser, {
    mode, host: '模拟宿主', toolVersion: 'offline-fixture',
    connection: { kind: 'existing-session', target: '用户指定的模拟 Chrome profile', independentEnvironmentApproved: false },
    login: { status: 'logged-in', checkedAt: '2026-10-26T10:50:00+08:00', evidence: '模拟页面显示已登录账户入口；未读 cookie', userNotifiedAt: null }
  });
  return f;
}

test('new task starts at v2 without preselecting a browser or claiming login', t => {
  const f = makeFixture(t);
  const root = initResearch(path.join(f.parent, 'new-task'));
  const research = readJson(path.join(root, 'research.json'));
  assert.equal(research.schemaVersion, 2);
  assert.equal(research.browser.mode, null);
  assert.equal(research.browser.login.status, 'unknown');
  assert.equal(research.browser.connection.independentEnvironmentApproved, false);
});

for (const mode of ['web-access', 'playwright-mcp', 'ego-browser', 'agent-browser', 'browser-harness', 'codex-chrome', 'claude-code-chrome']) {
  test(`schema v2 accepts explicitly selected ${mode} with confirmed login`, t => {
    const f = currentFixture(t, mode); f.save(); buildSourceIndex(f.root);
    const result = validateResearch(f.root, { final: true });
    assert.equal(result.valid, true, result.errors.join('\n'));
  });
}
test('v1 native-browser archives remain readable without fabricated login evidence', t => {
  const f = makeFixture(t); f.research.schemaVersion = 1;
  f.research.browser = { mode: 'native-browser', checkedAt: '2026-10-26T11:00:00+08:00', capabilities: { body: true, images: true, comments: true, saveEvidence: true } };
  f.save(); buildSourceIndex(f.root);
  const result = validateResearch(f.root, { final: true });
  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.match(result.warnings.join('\n'), /legacy.*login/i);
});
test('v2 cannot choose the retired native-browser option', t => {
  const f = currentFixture(t, 'native-browser'); f.save();
  assert.match(validateResearch(f.root).errors.join('\n'), /browser mode/i);
});
for (const status of ['unknown', 'logged-out', 'blocked']) {
  test(`v2 cannot finalize with login status ${status}`, t => {
    const f = currentFixture(t); f.research.browser.login.status = status; f.save();
    const result = validateResearch(f.root, { final: true });
    assert.equal(result.valid, false); assert.match(result.errors.join('\n'), /login.*confirmed/i);
  });
}
test('research cannot run before confirming Xiaohongshu login', t => {
  const f = currentFixture(t); f.research.status = 'running'; f.research.browser.login.status = 'unknown'; f.save();
  assert.match(validateResearch(f.root).errors.join('\n'), /login.*confirmed/i);
});
test('logged-out record requires prior user notification', t => {
  const f = currentFixture(t); f.research.status = 'blocked'; f.research.browser.login.status = 'logged-out'; f.save();
  assert.match(validateResearch(f.root).errors.join('\n'), /notification/i);
});
test('notified login blocker can retain a valid non-deliverable stage record', t => {
  const f = currentFixture(t); f.research.status = 'blocked';
  f.research.browser.login.status = 'logged-out'; f.research.browser.login.userNotifiedAt = '2026-10-26T12:10:00+08:00';
  f.research.gaps.push('等待用户在指定 profile 登录'); f.save();
  const result = validateResearch(f.root); assert.equal(result.valid, true, result.errors.join('\n')); assert.equal(result.readyForDelivery, false);
});
test('logged-in requires observed evidence and a real check timestamp', t => {
  const f = currentFixture(t); f.research.browser.login.evidence = ''; f.research.browser.login.checkedAt = 'unknown'; f.save();
  assert.match(validateResearch(f.root).errors.join('\n'), /login.*(evidence|timestamp)/i);
});
for (const kind of ['dedicated-profile', 'remote-session']) {
  test(`${kind} requires a user decision before use`, t => {
    const f = currentFixture(t); f.research.browser.connection.kind = kind; f.save();
    assert.match(validateResearch(f.root).errors.join('\n'), /independent.*approval/i);
    f.research.browser.connection.independentEnvironmentApproved = true; f.save(); buildSourceIndex(f.root);
    assert.equal(validateResearch(f.root, { final: true }).valid, true);
  });
}
test('connection target must identify the environment where login was checked', t => {
  const f = currentFixture(t); f.research.browser.connection.target = ''; f.save();
  assert.match(validateResearch(f.root).errors.join('\n'), /connection target/i);
});
