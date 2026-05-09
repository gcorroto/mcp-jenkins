#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const smokeTarball = process.argv.includes('--smoke-tarball');

function fail(message) {
  console.error(`Package verification failed: ${message}`);
  process.exit(1);
}

function run(command, args, cwd = root) {
  return execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32' && command === 'npm',
  });
}

function parsePackOutput(output) {
  try {
    return JSON.parse(output.trim())[0];
  } catch (error) {
    fail(`Unable to parse npm pack output: ${error.message}`);
  }
}

const packageJsonPath = join(root, 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

if (packageJson.dependencies?.https) {
  fail('package.json must not depend on the built-in https module');
}

if (packageJson.dependencies?.['zod-to-json-schema'] !== '3.24.3') {
  fail('zod-to-json-schema must be pinned to 3.24.3');
}

if (JSON.stringify(packageJson.files) !== JSON.stringify(['dist'])) {
  fail('package.json files must be exactly ["dist"]');
}

const requiredDistFiles = [
  'dist/index.js',
  'dist/tools/jenkins-service.js',
  'dist/common/types.js',
  'dist/common/utils.js',
];

for (const file of requiredDistFiles) {
  if (!existsSync(join(root, file))) {
    fail(`missing required file: ${file}`);
  }
}

const indexJs = readFileSync(join(root, 'dist/index.js'), 'utf8');
if (!indexJs.startsWith('#!/usr/bin/env node')) {
  fail('dist/index.js must keep the node shebang');
}

const dryRunPack = parsePackOutput(run('npm', ['pack', '--json', '--dry-run']));
const packedFiles = new Set(dryRunPack.files.map(file => file.path));

for (const file of requiredDistFiles) {
  if (!packedFiles.has(file)) {
    fail(`npm pack would not include ${file}`);
  }
}

for (const file of packedFiles) {
  if (!file.startsWith('dist/') && file !== 'package.json' && file !== 'README.md') {
    fail(`unexpected file in npm package: ${file}`);
  }
}

if (!smokeTarball) {
  console.log('Package verification passed.');
  process.exit(0);
}

const pack = parsePackOutput(run('npm', ['pack', '--json']));
const tarballPath = join(root, pack.filename);
const tempDir = mkdtempSync(join(tmpdir(), 'mcp-jenkins-smoke-'));

try {
  run('npm', ['init', '-y'], tempDir);
  run('npm', ['install', tarballPath, '--ignore-scripts'], tempDir);
  run('node', [
    '--input-type=module',
    '-e',
    "import { existsSync } from 'node:fs'; await import('@modelcontextprotocol/sdk/server/mcp.js'); await import('zod-to-json-schema'); if (!existsSync('node_modules/zod-to-json-schema/dist/esm/parsers/record.js')) throw new Error('zod-to-json-schema ESM record parser missing'); console.log('tarball smoke passed');",
  ], tempDir);
  console.log('Tarball smoke verification passed.');
} finally {
  if (existsSync(tarballPath)) {
    unlinkSync(tarballPath);
  }
  rmSync(tempDir, { recursive: true, force: true });
}
