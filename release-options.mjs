import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export default {
  branches: ['main'],
  tagFormat: 'v${version}',
  extends: [],
  plugins: [
    [require.resolve('@semantic-release/commit-analyzer'), { preset: 'conventionalcommits' }],
    [require.resolve('@semantic-release/release-notes-generator'), { preset: 'conventionalcommits' }],
    [require.resolve('@semantic-release/github'), {
      successComment: false,
      failComment: false,
      labels: false,
      releasedLabels: false,
    }],
  ],
};
