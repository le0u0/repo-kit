import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Writable } from 'node:stream';
import { test } from 'node:test';
import semanticRelease from 'semantic-release';
import config from '../release-options.mjs';

// Only local Git remotes are used. No GitHub plugin or credentials enter a dry run.
const plugins = config.plugins.slice(0, 2);
const silent = () => new Writable({ write(chunk, encoding, done) { done(); } });

for (const [name, baseline, messages, expected, branch = 'main', selfHosted = false] of [
  ['first fix', null, 'fix: repair behavior', '1.0.0'],
  ['first breaking change', null, 'feat!: replace API', '1.0.0'],
  ['patch', '1.2.3', 'fix: repair behavior', '1.2.4'],
  ['minor', '1.2.3', 'feat: add behavior', '1.3.0'],
  ['breaking subject', '1.2.3', 'feat!: replace API', '2.0.0'],
  ['breaking footer', '1.2.3', 'fix: replace API\n\nBREAKING CHANGE: remove old API', '2.0.0'],
  ['breaking non-feature', '1.2.3', 'chore!: replace API', '2.0.0'],
  ['highest bump wins', '1.2.3', ['feat: add behavior', 'fix: repair behavior'], '1.3.0'],
  ['no release', '1.2.3', 'docs: clarify usage', null],
  ['no first release', null, 'chore: initialize project', null],
  ['independent history', '8.0.0', 'fix: repair behavior', '8.0.1'],
  ['other branch', '1.2.3', 'feat: add behavior', null, 'feature'],
  ['self-hosted tooling', null, 'feat: add behavior', '1.0.0', 'main', true],
]) {
  test(name, async () => {
    const root = await mkdtemp(join(tmpdir(), 'shared-release-'));
    const cwd = join(root, 'caller');
    const remote = join(root, 'origin.git');
    const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    try {
      execFileSync('git', ['init', '--bare', '--initial-branch=main', remote], { stdio: 'ignore' });
      execFileSync('git', ['init', '--initial-branch=main', cwd], { stdio: 'ignore' });
      git('config', 'user.name', 'Release validation');
      git('config', 'user.email', 'validation@example.invalid');
      git('config', 'url.' + remote + '.insteadOf', 'https://github.com/validation/caller.git');
      git('remote', 'add', 'origin', remote);
      await writeFile(join(cwd, 'package.json'), '{"name":"fixture","version":"0.0.42"}\n');
      if (selfHosted) {
        const source = new URL('../', import.meta.url);
        for (const file of await readdir(source)) {
          if (file.endsWith('.mjs')) await copyFile(new URL(file, source), join(cwd, file));
        }
      }
      git('add', '.');
      git('commit', '-m', 'chore: initial project');
      if (baseline) git('tag', `v${baseline}`);
      if (branch !== 'main') git('switch', '-c', branch);
      for (const message of [messages].flat()) git('commit', '--allow-empty', '-m', message);
      git('push', '--tags', 'origin', 'main');
      if (branch !== 'main') git('push', 'origin', branch);
      const before = git('show-ref');
      const remoteBefore = git('ls-remote', 'origin');
      const packageBefore = await readFile(join(cwd, 'package.json'), 'utf8');
      const result = await semanticRelease({
        ...config,
        plugins,
        repositoryUrl: 'https://github.com/validation/caller.git',
        dryRun: true,
        ci: false,
      }, {
        cwd,
        env: {
          PATH: process.env.PATH,
          HOME: root,
          GIT_CONFIG_NOSYSTEM: '1',
          GIT_CONFIG_GLOBAL: '/dev/null',
          GIT_TERMINAL_PROMPT: '0',
        },
        stdout: silent(),
        stderr: silent(),
      });
      assert.equal(result ? result.nextRelease.version : null, expected);
      if (result) {
        assert.equal(result.nextRelease.gitTag, `v${expected}`);
        assert.ok(result.nextRelease.notes.length > 0);
        assert.match(result.nextRelease.notes, /repair behavior|replace API|add behavior/);
      }
      assert.equal(git('show-ref'), before, 'dry run must not change local refs');
      assert.equal(git('ls-remote', 'origin'), remoteBefore, 'dry run must not change remote refs');
      assert.equal(await readFile(join(cwd, 'package.json'), 'utf8'), packageBefore);
      assert.equal(git('status', '--porcelain'), '');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
}

test('installed tooling uses its own release plugins when the caller has competing versions', async () => {
  const root = await mkdtemp(join(tmpdir(), 'release-resolution-'));
  const tool = join(root, 'tool');
  const semantic = join(tool, 'node_modules/semantic-release');
  try {
    await mkdir(join(semantic, 'node_modules/@semantic-release'), { recursive: true });
    await writeFile(join(semantic, 'package.json'), '{"name":"semantic-release","main":"index.js"}');
    await writeFile(join(semantic, 'index.js'), '');
    await copyFile(new URL('../release-options.mjs', import.meta.url), join(tool, 'release-options.mjs'));
    const names = ['commit-analyzer', 'release-notes-generator', 'github'];
    for (const [index, name] of names.entries()) {
      await symlink(dirname(config.plugins[index][0]), join(semantic, 'node_modules/@semantic-release', name), 'dir');
      const competing = join(root, 'node_modules/@semantic-release', name);
      await mkdir(competing, { recursive: true });
      await writeFile(join(competing, 'package.json'), '{"main":"index.js","type":"module"}');
      await writeFile(join(competing, 'index.js'), 'throw new Error("Caller plugin must not load");');
    }
    await symlink(fileURLToPath(new URL('../node_modules/conventional-changelog-conventionalcommits', import.meta.url)),
      join(tool, 'node_modules/conventional-changelog-conventionalcommits'), 'dir');
    const { default: installed } = await import(pathToFileURL(join(tool, 'release-options.mjs')));
    const { analyzeCommits } = await import(pathToFileURL(installed.plugins[0][0]));
    const bump = await analyzeCommits(installed.plugins[0][1], {
      cwd: root, commits: [{ hash: 'abc123', message: 'feat!: replace API' }], logger: { log() {} },
    });
    assert.equal(bump, 'major');
  } finally { await rm(root, { recursive: true, force: true }); }
});
