import { build } from 'esbuild';
import {
  copyFile,
  cp,
  mkdir,
  readFile,
  rm,
  stat,
} from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const extensionRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = resolve(extensionRoot, '..', '..');
const outputDirectory = resolve(extensionRoot, 'dist');

if (
  outputDirectory !== join(extensionRoot, 'dist') ||
  !outputDirectory.startsWith(extensionRoot)
) {
  throw new Error('Refusing to clean an unexpected extension output path.');
}

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

await build({
  entryPoints: {
    'service-worker': join(extensionRoot, 'src/background/index.ts'),
    'content-script': join(extensionRoot, 'src/content/index.ts'),
  },
  outdir: outputDirectory,
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['chrome120'],
  sourcemap: true,
  logLevel: 'info',
});

await copyFile(
  join(extensionRoot, 'manifest.json'),
  join(outputDirectory, 'manifest.json'),
);
await cp(
  join(extensionRoot, 'public/icons'),
  join(outputDirectory, 'icons'),
  { recursive: true },
);

const manifest = JSON.parse(
  await readFile(join(outputDirectory, 'manifest.json'), 'utf8'),
);
for (const requiredFile of [
  manifest.background.service_worker,
  ...manifest.content_scripts.flatMap((script) => script.js),
  ...Object.values(manifest.icons),
]) {
  await stat(join(outputDirectory, requiredFile));
}

console.log(`Packaged Chrome extension at ${outputDirectory}`);
