import semanticRelease from 'semantic-release';
import config from './release-options.mjs';
import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function release(cwd = process.cwd()) {
  if (process.env.GITHUB_ACTIONS !== 'true' || process.env.GITHUB_EVENT_NAME !== 'push'
    || process.env.GITHUB_REF !== 'refs/heads/main') {
    throw new Error('Release must run on a GitHub Actions push to main.');
  }
  // Reject caller hooks before semantic-release can load or execute their configuration.
  const extensions = ['', '.json', '.yaml', '.yml', '.js', '.ts', '.cjs', '.mjs'];
  const files = [
    ...extensions.flatMap(ext => [`.releaserc${ext}`, `.config/releaserc${ext}`]),
    ...['.js', '.ts', '.cjs', '.mjs'].map(ext => `release.config${ext}`),
    ...extensions.filter(Boolean).map(ext => `.config/config${ext}`),
    'package.yaml',
  ];
  for (const file of files) {
    try { await access(join(cwd, file)); } catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }
    throw new Error(`Remove existing release configuration before using this package: ${file}`);
  }
  let pkg;
  try { pkg = JSON.parse(await readFile(join(cwd, 'package.json'), 'utf8')); } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (pkg && (Object.hasOwn(pkg, 'release') || Object.hasOwn(pkg, 'cosmiconfig'))) {
    throw new Error('Remove existing release configuration from package.json before using this package.');
  }
  await semanticRelease({
    ...config,
    repositoryUrl: `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}.git`,
  }, { cwd });
}
