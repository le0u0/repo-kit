import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { parse } from 'yaml';

const cli = fileURLToPath(new URL('../bin/release-workflows.mjs', import.meta.url));
const existing = `# Keep project CI
name: CI
on: [push, pull_request]
jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - run: npm test
  deploy:
    needs: checks
    runs-on: ubuntu-latest
    steps:
      - run: echo deploy
`;

async function fixture(run, initial = existing) {
  const cwd = await mkdtemp(join(tmpdir(), 'release-setup-'));
  const file = join(cwd, '.github/workflows/ci.yml');
  await mkdir(join(cwd, '.github/workflows'), { recursive: true });
  if (initial !== null) await writeFile(file, initial);
  const command = (args = [], input = '') => spawnSync(process.execPath, [cli, 'setup', ...args], {
    cwd, input, encoding: 'utf8',
  });
  try { await run({ file, command }); } finally { await rm(cwd, { recursive: true, force: true }); }
}

test('setup preserves existing checks and deployment after explicit confirmation', async () => {
  await fixture(async ({ file, command }) => {
    const result = command(['--needs', 'checks'], 'yes\n');
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /\[y\/N\]/);
    const source = await readFile(file, 'utf8');
    const workflow = parse(source);
    assert.deepEqual(workflow.jobs.checks, parse(existing).jobs.checks);
    assert.deepEqual(workflow.jobs.deploy, parse(existing).jobs.deploy);
    assert.match(source, /# Keep project CI/);
    const release = workflow.jobs.release;
    assert.deepEqual(release.needs, ['checks']);
    assert.deepEqual(release.permissions, { contents: 'write' });
    assert.equal(release.if, "github.event_name == 'push' && github.ref == 'refs/heads/main'");
    assert.equal(release.steps[0].with['fetch-depth'], 0);
    assert.equal(release.steps.at(-1).run, 'npm exec --no -- release-workflows release');
    assert.ok(!JSON.stringify(release).includes('le0u0/workflows'));
    for (const step of release.steps.filter(step => step.uses)) {
      assert.match(step.uses, /^[\w-]+\/[\w-]+@[a-f0-9]{40}$/);
    }
  });
});

for (const answer of ['no\n', '\n', '']) {
  test(`setup leaves existing YAML unchanged when confirmation is ${JSON.stringify(answer)}`, async () => {
    await fixture(async ({ file, command }) => {
      const result = command(['--needs', 'checks'], answer);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(await readFile(file, 'utf8'), existing);
    });
  });
}

test('setup updates an existing release job without duplicating it or losing its dependencies', async () => {
  const old = `${existing}  release:\n    needs: [checks]\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo old release\n`;
  await fixture(async ({ file, command }) => {
    assert.equal(command([], 'y\n').status, 0);
    const jobs = parse(await readFile(file, 'utf8')).jobs;
    assert.deepEqual(jobs.release.needs, ['checks']);
    assert.equal(Object.keys(jobs).filter(key => key === 'release').length, 1);
    assert.equal(jobs.release.steps.at(-1).run, 'npm exec --no -- release-workflows release');
  }, old);
});

test('setup rejects missing check jobs without touching existing YAML', async () => {
  await fixture(async ({ file, command }) => {
    const result = command(['--needs', 'missing'], 'yes\n');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /missing/);
    assert.equal(await readFile(file, 'utf8'), existing);
  });
});

test('setup rejects checks that depend on release, preventing a dependency cycle', async () => {
  const cyclic = existing.replace('runs-on: ubuntu-latest', 'needs: release\n    runs-on: ubuntu-latest');
  await fixture(async ({ file, command }) => {
    const result = command(['--needs', 'checks'], 'yes\n');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /cycle/);
    assert.equal(await readFile(file, 'utf8'), cyclic);
  }, cyclic);
});

test('setup creates a complete local workflow with caller-provided check commands', async () => {
  await fixture(async ({ file, command }) => {
    const result = command(['--check', 'npm run lint && npm test']);
    assert.equal(result.status, 0, result.stderr);
    const workflow = parse(await readFile(file, 'utf8'));
    assert.deepEqual(workflow.on.push.branches, ['main']);
    assert.equal(workflow.jobs.checks.steps.at(-1).run, 'npm run lint && npm test');
    assert.deepEqual(workflow.jobs.release.needs, ['checks']);
  }, null);
});

test('release command refuses execution outside a GitHub Actions main push', () => {
  const result = spawnSync(process.execPath, [cli, 'release'], {
    cwd: tmpdir(), env: { PATH: process.env.PATH }, encoding: 'utf8',
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /GitHub Actions push to main/);
});

for (const filter of ['branches: [develop]', 'branches-ignore: [main]', 'branches: ["**", "!main"]', 'tags: ["v*"]', 'branches: ["mai?"]']) {
  test(`setup refuses a workflow that excludes main: ${filter}`, async () => {
    const source = existing.replace('on: [push, pull_request]', `on:\n  push:\n    ${filter}`);
    await fixture(async ({ file, command }) => {
      const result = command(['--needs', 'checks'], 'yes\n');
      assert.equal(result.status, 1);
      assert.match(result.stderr, /main/);
      assert.equal(await readFile(file, 'utf8'), source);
    }, source);
  });
}

for (const config of ['release.config.cjs', '.releaserc.json', '.config/releaserc.yml', 'package.json']) {
  test(`release refuses caller configuration without evaluating it: ${config}`, async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'release-config-'));
    try {
      await mkdir(join(cwd, '.config'));
      const content = config === 'package.json' ? '{"release":{"prepare":"npm publish"}}'
        : config.endsWith('.cjs') ? 'throw new Error("Caller config must not execute")' : '{}';
      await writeFile(join(cwd, config), content);
      const result = spawnSync(process.execPath, [cli, 'release'], {
        cwd, encoding: 'utf8', env: {
          PATH: process.env.PATH, GITHUB_ACTIONS: 'true', GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/main',
        },
      });
      assert.equal(result.status, 1);
      assert.match(result.stderr, /Remove existing release configuration/);
    } finally { await rm(cwd, { recursive: true, force: true }); }
  });
}
