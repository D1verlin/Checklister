export const CURRENT_APP_VERSION = '1.0.0';
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
 * Queries GitHub API for the latest release.
 */
export async function checkForAppUpdates(): Promise<UpdateInfo> {
  const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

  try {
    const res = await fetch(apiUrl, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'CheckLister-App',
      },
      signal: AbortSignal.timeout(10000),
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
      return {
        isAvailable: false,
        currentVersion: CURRENT_APP_VERSION,
        latestVersion: CURRENT_APP_VERSION,
        htmlUrl: GITHUB_REPO_URL,
        error: `GitHub API error (${res.status})`,
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
