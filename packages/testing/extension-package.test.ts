import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const extensionDist = resolve(
  process.cwd(),
  '..',
  '..',
  'apps',
  'extension',
  'dist',
);
const manifest = JSON.parse(
  readFileSync(resolve(extensionDist, 'manifest.json'), 'utf8'),
);

describe('Phase 0 extension package', () => {
  it('uses a minimal MV3 permission surface', () => {
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.permissions).toEqual([
      'activeTab',
      'scripting',
      'storage',
      'tabs',
    ]);
    expect(manifest.host_permissions).toBeUndefined();
    expect(manifest.oauth2).toBeUndefined();
  });

  it('contains every manifest-referenced runtime file', () => {
    const files = [
      manifest.background.service_worker,
      ...manifest.content_scripts.flatMap(
        (script: { js: string[] }) => script.js,
      ),
      ...Object.values(manifest.icons),
    ] as string[];
    for (const file of files) {
      const path = resolve(extensionDist, file);
      expect(existsSync(path), file).toBe(true);
      expect(statSync(path).size, file).toBeGreaterThan(0);
    }
  });

  it('packages only the non-interactive Phase 0 shell', () => {
    expect(manifest.action.default_popup).toBeUndefined();
    expect(manifest.options_page).toBeUndefined();
    expect(existsSync(resolve(extensionDist, 'popup.html'))).toBe(false);
    expect(existsSync(resolve(extensionDist, 'options.html'))).toBe(false);
  });

  it('bundles extraction code without external module imports', () => {
    const contentScript = readFileSync(
      resolve(extensionDist, 'content-script.js'),
      'utf8',
    );
    expect(contentScript).toContain('VISOR_EXTRACT_DOM');
    expect(contentScript).not.toMatch(/from\s+["']@visor\//);
  });
});
