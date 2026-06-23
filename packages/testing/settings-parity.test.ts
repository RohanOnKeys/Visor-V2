import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  clearAllData,
  deleteSiteProfile,
  loadRecentCompiles,
  loadSettings,
  loadSiteProfiles,
  resetMemoryStorageForTests,
  saveRecentCompile,
  saveSettings,
  saveSiteProfile,
} from '../../apps/extension/src/storage/settings.ts';
import type {
  RecentCompileMetadata,
  SiteProfile,
  UserSettings,
} from '@visor/protocol';

describe('V1 extension settings parity', () => {
  beforeEach(() => {
    resetMemoryStorageForTests();
  });

  it('loads isolated defaults and merges saved settings', async () => {
    expect(await loadSettings()).toEqual(DEFAULT_SETTINGS);
    const settings: UserSettings = {
      ...DEFAULT_SETTINGS,
      defaultMode: 'debug',
      blockedDomains: ['example.com'],
    };
    await saveSettings(settings);
    expect(await loadSettings()).toEqual(settings);
  });

  it('upserts and deletes site profiles by id or domain', async () => {
    const profile: SiteProfile = {
      id: 'profile-1',
      domain: 'example.com',
      preserveSelectors: ['main'],
      ignoreSelectors: ['.ad'],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    await saveSiteProfile(profile);
    await saveSiteProfile({
      ...profile,
      id: 'replacement-id',
      preserveSelectors: ['article'],
    });

    const profiles = await loadSiteProfiles();
    expect(profiles).toHaveLength(1);
    expect(profiles[0]?.preserveSelectors).toEqual(['article']);
    await deleteSiteProfile('replacement-id');
    expect(await loadSiteProfiles()).toEqual([]);
  });

  it('keeps the 20 newest unique recent compiles', async () => {
    for (let index = 0; index < 22; index++) {
      const metadata: RecentCompileMetadata = {
        id: `compile-${index}`,
        url: `https://example.com/${index}`,
        title: `Compile ${index}`,
        createdAt: new Date(2026, 0, index + 1).toISOString(),
        mode: 'detailed',
        tokenCount: index,
        riskLevel: 'low',
      };
      await saveRecentCompile(metadata);
    }
    const recent = await loadRecentCompiles();
    expect(recent).toHaveLength(20);
    expect(recent[0]?.id).toBe('compile-21');
    expect(recent.at(-1)?.id).toBe('compile-2');
  });

  it('clears all stored settings and history', async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, debugMode: true });
    await saveRecentCompile({
      id: 'compile',
      url: 'https://example.com',
      title: 'Example',
      createdAt: '2026-06-23T00:00:00.000Z',
      mode: 'compact',
      tokenCount: 1,
      riskLevel: 'low',
    });
    await clearAllData();
    expect(await loadSettings()).toEqual(DEFAULT_SETTINGS);
    expect(await loadRecentCompiles()).toEqual([]);
  });
});
