import type {
  RecentCompileMetadata,
  SiteProfile,
  UserSettings,
} from '@visor/protocol';

export const DEFAULT_SETTINGS: UserSettings = {
  defaultMode: 'compact',
  privacyLevel: 'medium',
  tokenBudget: 4000,
  defaultExport: 'json',
  debugMode: false,
  autoCompile: true,
  widgetEnabled: true,
  blockedDomains: [],
};

let memoryStorage: Record<string, unknown> = {};

function hasChromeStorage(): boolean {
  return (
    typeof chrome !== 'undefined' &&
    chrome.storage?.local !== undefined
  );
}

function sessionStorage(): chrome.storage.StorageArea | undefined {
  if (!hasChromeStorage()) return undefined;
  return chrome.storage.session;
}

async function getValue<T>(
  area: chrome.storage.StorageArea,
  key: string,
): Promise<T | undefined> {
  const result = await area.get(key);
  return result[key] as T | undefined;
}

async function setValue(
  area: chrome.storage.StorageArea,
  key: string,
  value: unknown,
): Promise<void> {
  await area.set({ [key]: value });
}

export async function loadSettings(): Promise<UserSettings> {
  const session = sessionStorage();
  if (session) {
    const settings = await getValue<Partial<UserSettings>>(session, 'settings');
    return settings
      ? { ...DEFAULT_SETTINGS, ...settings }
      : { ...DEFAULT_SETTINGS };
  }
  const settings = memoryStorage.settings as Partial<UserSettings> | undefined;
  return settings
    ? { ...DEFAULT_SETTINGS, ...settings }
    : { ...DEFAULT_SETTINGS };
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  const session = sessionStorage();
  if (session) {
    await setValue(session, 'settings', settings);
    return;
  }
  memoryStorage.settings = settings;
}

export async function loadSiteProfiles(): Promise<SiteProfile[]> {
  if (hasChromeStorage()) {
    const profiles = await getValue<SiteProfile[]>(
      chrome.storage.local,
      'siteProfiles',
    );
    return Array.isArray(profiles) ? profiles : [];
  }
  const profiles = memoryStorage.siteProfiles;
  return Array.isArray(profiles) ? (profiles as SiteProfile[]) : [];
}

export async function saveSiteProfiles(
  profiles: SiteProfile[],
): Promise<void> {
  if (hasChromeStorage()) {
    await setValue(chrome.storage.local, 'siteProfiles', profiles);
    return;
  }
  memoryStorage.siteProfiles = profiles;
}

export async function saveSiteProfile(profile: SiteProfile): Promise<void> {
  const profiles = await loadSiteProfiles();
  const index = profiles.findIndex(
    (item) => item.id === profile.id || item.domain === profile.domain,
  );
  const now = new Date().toISOString();
  if (index >= 0) {
    profiles[index] = { ...profile, updatedAt: now };
  } else {
    profiles.push({ ...profile, createdAt: now, updatedAt: now });
  }
  await saveSiteProfiles(profiles);
}

export async function deleteSiteProfile(profileId: string): Promise<void> {
  await saveSiteProfiles(
    (await loadSiteProfiles()).filter((profile) => profile.id !== profileId),
  );
}

export async function loadRecentCompiles(): Promise<
  RecentCompileMetadata[]
> {
  if (hasChromeStorage()) {
    const recent = await getValue<RecentCompileMetadata[]>(
      chrome.storage.local,
      'recentCompiles',
    );
    return Array.isArray(recent) ? recent : [];
  }
  const recent = memoryStorage.recentCompiles;
  return Array.isArray(recent) ? (recent as RecentCompileMetadata[]) : [];
}

export async function saveRecentCompile(
  metadata: RecentCompileMetadata,
): Promise<void> {
  const recent = await loadRecentCompiles();
  const updated = [
    metadata,
    ...recent.filter((item) => item.id !== metadata.id),
  ].slice(0, 20);
  if (hasChromeStorage()) {
    await setValue(chrome.storage.local, 'recentCompiles', updated);
    return;
  }
  memoryStorage.recentCompiles = updated;
}

export async function clearAllData(): Promise<void> {
  if (hasChromeStorage()) {
    await chrome.storage.local.clear();
    await sessionStorage()?.clear();
    return;
  }
  memoryStorage = {};
}

export function resetMemoryStorageForTests(): void {
  memoryStorage = {};
}
