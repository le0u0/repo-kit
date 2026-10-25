import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Writable } from 'node:stream';
import { test } from 'node:test';
import semanticRelease from 'semantic-release';
import config from '../release.config.mjs';

// Only local Git remotes are used. No GitHub plugin or credentials enter a dry run.
const plugins = config.plugins.slice(0, 2);
const silent = () => new Writable({ write(chunk, encoding, done) { done(); } });

for (const [name, baseline, messages, expected, branch = 'main'] of [
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
      git('add', 'package.json');
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
