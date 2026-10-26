#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { once } from 'node:events';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { parseArgs } from 'node:util';

try {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      workflow: { type: 'string', default: '.github/workflows/ci.yml' },
      needs: { type: 'string' },
      check: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
  });
  const [command] = positionals;
  if (values.help || !command) {
    console.log('Usage: release-workflows setup [--workflow path] [--needs checks] [--check "npm test"]\n       release-workflows release');
  } else if (command === 'setup' && positionals.length === 1) {
    const { setupWorkflow } = await import('../lib/workflow.mjs');
    const { version } = JSON.parse(await readFile(new URL('../package.json', import.meta.url)));
    const changed = await setupWorkflow({
      file: resolve(values.workflow),
      needs: values.needs?.split(',').map(value => value.trim()).filter(Boolean),
      check: values.check,
      version,
      confirm: async prompt => {
        const readline = createInterface({ input: process.stdin, output: process.stdout });
        try {
          const closed = once(readline, 'close').then(() => '');
          const answer = await Promise.race([readline.question(prompt), closed]);
          return /^(y|yes)$/i.test(answer.trim());
        } finally { readline.close(); }
      },
    });
    console.log(changed ? `Updated ${values.workflow} using @le0u0/release-workflows ${version}.` : 'Cancelled; no files changed.');
  } else if (command === 'release' && positionals.length === 1) {
    const { release } = await import('../release.mjs');
    await release();
  } else {
    throw new Error(`Unknown command: ${positionals.join(' ')}`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
