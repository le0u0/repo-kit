import semanticRelease from 'semantic-release';
import config from './release.config.mjs';

await semanticRelease({
  ...config,
  repositoryUrl: `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}.git`,
}, { cwd: process.argv[2] });
