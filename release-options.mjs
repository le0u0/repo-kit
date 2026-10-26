import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.resolve('semantic-release'));
const preset = { config: fileURLToPath(import.meta.resolve('conventional-changelog-conventionalcommits')) };

export default {
  branches: ['main'],
  tagFormat: 'v${version}',
  extends: [],
  plugins: [
    [require.resolve('@semantic-release/commit-analyzer'), preset],
    [require.resolve('@semantic-release/release-notes-generator'), preset],
    [require.resolve('@semantic-release/github'), {
      successComment: false,
      failComment: false,
      labels: false,
      releasedLabels: false,
    }],
  ],
};
