export const CURRENT_APP_VERSION = '1.0.2';
export const GITHUB_REPO = 'D1verlin/Checklister';
export const GITHUB_REPO_URL = `https://github.com/${GITHUB_REPO}`;

export interface UpdateInfo {
  isAvailable: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseName?: string;
  publishedAt?: string;
  releaseNotes?: string;
  htmlUrl: string;
  downloadUrl?: string;
  error?: string;
}

/**
 * Normalizes semver string (e.g. 'v1.0.4' -> [1, 0, 4])
 */
function parseSemver(versionStr: string): number[] {
  const clean = versionStr.replace(/^v/i, '').trim();
  return clean.split('.').map((p) => {
    const n = parseInt(p, 10);
    return isNaN(n) ? 0 : n;
  });
}

/**
 * Returns true if versionB is strictly greater than versionA.
 */
function isVersionNewer(current: string, latest: string): boolean {
  const a = parseSemver(current);
  const b = parseSemver(latest);
  const len = Math.max(a.length, b.length);

  for (let i = 0; i < len; i++) {
    const valA = a[i] || 0;
    const valB = b[i] || 0;
    if (valB > valA) return true;
    if (valB < valA) return false;
  }
  return false;
}

/**
 * Fallback to check version directly from raw package.json on GitHub
 * when GitHub REST API rate limits (HTTP 403) or is blocked.
 * Has no rate limits and works reliably from any IP.
 */
async function checkFallbackVersion(): Promise<UpdateInfo | null> {
  try {
    const rawUrl = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/package.json`;
    const res = await fetch(rawUrl, {
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = await res.json();
      const latestVer = (data.version || '').replace(/^v/i, '') || CURRENT_APP_VERSION;
      const isAvailable = isVersionNewer(CURRENT_APP_VERSION, latestVer);
      return {
        isAvailable,
        currentVersion: CURRENT_APP_VERSION,
        latestVersion: latestVer,
        releaseName: `v${latestVer}`,
        htmlUrl: `${GITHUB_REPO_URL}/releases/latest`,
        downloadUrl: `${GITHUB_REPO_URL}/releases/download/v${latestVer}/CheckLister-Setup-${latestVer}.exe`,
      };
    }
  } catch {}
  return null;
}

/**
 * Queries GitHub API for the latest release, with automatic fallback
 * to raw repository metadata if GitHub REST API rate limits (403).
 */
export async function checkForAppUpdates(): Promise<UpdateInfo> {
  const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

  try {
    const res = await fetch(apiUrl, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'CheckLister-App',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (res.status === 404) {
      // No releases published on GitHub repository yet
      return {
        isAvailable: false,
        currentVersion: CURRENT_APP_VERSION,
        latestVersion: CURRENT_APP_VERSION,
        htmlUrl: GITHUB_REPO_URL,
      };
    }

    if (!res.ok) {
      // If GitHub REST API is rate-limited (403) or returns an error, use un-rate-limited fallback
      const fallback = await checkFallbackVersion();
      if (fallback) return fallback;

      return {
        isAvailable: false,
        currentVersion: CURRENT_APP_VERSION,
        latestVersion: CURRENT_APP_VERSION,
        htmlUrl: GITHUB_REPO_URL,
        error: res.status === 403 ? 'Лимит запросов GitHub API (403)' : `GitHub API error (${res.status})`,
      };
    }

    const data = await res.json();
    const tagName = data.tag_name || '';
    const latestVer = tagName.replace(/^v/i, '') || CURRENT_APP_VERSION;
    const isAvailable = isVersionNewer(CURRENT_APP_VERSION, latestVer);

    // Look for installer asset (.exe or .zip)
    let downloadUrl = data.html_url || GITHUB_REPO_URL;
    if (Array.isArray(data.assets) && data.assets.length > 0) {
      const exeAsset = data.assets.find(
        (a: any) => typeof a.name === 'string' && (a.name.endsWith('.exe') || a.name.endsWith('.zip'))
      );
      if (exeAsset?.browser_download_url) {
        downloadUrl = exeAsset.browser_download_url;
      }
    }

    return {
      isAvailable,
      currentVersion: CURRENT_APP_VERSION,
      latestVersion: latestVer,
      releaseName: data.name || tagName,
      publishedAt: data.published_at ? new Date(data.published_at).toLocaleDateString() : undefined,
      releaseNotes: data.body || undefined,
      htmlUrl: data.html_url || GITHUB_REPO_URL,
      downloadUrl,
    };
  } catch (err) {
    // If network/timeout fails, try fallback
    const fallback = await checkFallbackVersion();
    if (fallback) return fallback;

    return {
      isAvailable: false,
      currentVersion: CURRENT_APP_VERSION,
      latestVersion: CURRENT_APP_VERSION,
      htmlUrl: GITHUB_REPO_URL,
      error: (err as Error).message,
    };
  }
}

/**
 * Opens external URL safely through Electron or browser window.
 */
export function openExternalUrl(url: string) {
  const electron = (window as any).electronAPI;
  if (electron?.openExternal) {
    electron.openExternal(url);
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
