import { createRequire } from 'node:module';
import semanticRelease from 'semantic-release';
import config from './release-options.mjs';

const require = createRequire(import.meta.url);

await semanticRelease({
  ...config,
  repositoryUrl: `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}.git`,
  plugins: [
    ...config.plugins.slice(0, 2),
    require.resolve('@semantic-release/npm'),
    config.plugins[2],
  ],
});
