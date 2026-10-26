import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, matchesGlob } from 'node:path';
import { Document, parseDocument } from 'yaml';

const checkout = 'actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803';
const setupNode = 'actions/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38';
const nodeStep = { uses: setupNode, with: { 'node-version': '24', 'package-manager-cache': false } };

export async function setupWorkflow({ file, needs, check, version, confirm }) {
  let source;
  try { source = await readFile(file, 'utf8'); } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (source === undefined && !check?.trim()) {
    throw new Error('New workflow requires --check "your required check commands".');
  }
  const doc = source === undefined ? new Document({
    name: 'CI',
    on: { push: { branches: ['main'] }, pull_request: null },
    permissions: { contents: 'read' },
    jobs: { checks: {
      'runs-on': 'ubuntu-latest',
      steps: [{ uses: checkout }, nodeStep, { run: 'npm ci' }, { run: check }],
    } },
  }) : parseDocument(source);
  if (doc.errors.length) throw new Error(`Invalid workflow YAML: ${doc.errors[0].message}`);
  const workflow = doc.toJS();
  if (!workflow?.jobs || typeof workflow.jobs !== 'object') throw new Error('Workflow must contain check jobs.');
  const push = typeof workflow.on === 'string' ? workflow.on === 'push'
    : Array.isArray(workflow.on) ? workflow.on.includes('push')
      : workflow.on && Object.hasOwn(workflow.on, 'push');
  if (!push) throw new Error('Workflow must run on pushes to main.');
  const filters = workflow.on?.push;
  if ((filters?.tags || filters?.['tags-ignore']) && !filters.branches && !filters['branches-ignore']) {
    throw new Error('Tag-only workflows do not run on pushes to main.');
  }
  const matchesMain = pattern => {
    if (/[?+()[\]{}\\]/.test(pattern)) {
      throw new Error('Use literal branch names and * patterns to include main; this filter syntax is unsupported.');
    }
    return matchesGlob('main', pattern);
  };
  const includesMain = !filters?.branches || filters.branches.reduce((included, pattern) =>
    pattern.startsWith('!') ? included && !matchesMain(pattern.slice(1))
      : included || matchesMain(pattern), false);
  if (!includesMain || filters?.['branches-ignore']?.some(matchesMain)) {
    throw new Error('Workflow push branch filters exclude main.');
  }
  const previous = workflow.jobs.release?.needs;
  const required = needs ?? (Array.isArray(previous) ? previous : previous ? [previous] : undefined)
    ?? (workflow.jobs.checks ? ['checks'] : []);
  if (!required.length) throw new Error('Specify required check jobs with --needs lint,test,build.');
  const dependsOnRelease = (id, visited = new Set()) => {
    if (id === 'release') return true;
    if (visited.has(id)) return false;
    visited.add(id);
    return [workflow.jobs[id]?.needs ?? []].flat().some(dep => dependsOnRelease(dep, visited));
  };
  for (const id of required) {
    if (!Object.hasOwn(workflow.jobs, id)) throw new Error(`Unknown check job: ${id}`);
    if (dependsOnRelease(id)) throw new Error(`Check job ${id} depends on release; this would create a cycle.`);
  }
  doc.setIn(['jobs', 'release'], {
    needs: required,
    if: "github.event_name == 'push' && github.ref == 'refs/heads/main'",
    permissions: { contents: 'write' },
    concurrency: { group: 'release-${{ github.repository }}', 'cancel-in-progress': false },
    'runs-on': 'ubuntu-latest',
    steps: [
      { uses: checkout, with: { 'fetch-depth': 0, 'persist-credentials': false } },
      nodeStep,
      { run: 'npm ci --include=dev --ignore-scripts --no-audit --no-fund' },
      { run: 'npm exec --no -- release-workflows release', env: { GITHUB_TOKEN: '${{ secrets.GITHUB_TOKEN }}' } },
    ],
  });
  doc.getIn(['jobs', 'release'], true).commentBefore = ` Managed by @le0u0/release-workflows ${version}.`;
  if (source !== undefined) {
    if (!await confirm(`Update ${file}, replacing its release job (needs: ${required.join(', ')})? [y/N] `)) return false;
    if (await readFile(file, 'utf8') !== source) throw new Error('Workflow changed during confirmation; run setup again.');
  }
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, String(doc), source === undefined ? { flag: 'wx' } : undefined);
  return true;
}
