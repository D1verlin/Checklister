import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';

export interface MpvDetectionResult {
  path: string;
  version?: string;
  source: string;
}

export interface MpvValidationResult {
  valid: boolean;
  version?: string;
  error?: string;
}

/**
 * Validates whether a file path points to an executable mpv binary and extracts its version.
 */
export async function validateMpvPath(exePath: string): Promise<MpvValidationResult> {
  if (!exePath || typeof exePath !== 'string') {
    return { valid: false, error: 'Путь к файлу не указан' };
  }

  const cleanPath = path.normalize(exePath.trim().replace(/^["']|["']$/g, ''));

  try {
    if (!fs.existsSync(cleanPath)) {
      return { valid: false, error: 'Файл не существует' };
    }

    const stat = await fs.promises.stat(cleanPath);
    if (!stat.isFile()) {
      return { valid: false, error: 'Указанный путь является папкой, а не исполняемым файлом' };
    }

    const ext = path.extname(cleanPath).toLowerCase();
    if (process.platform === 'win32' && ext !== '.exe' && ext !== '.com') {
      return { valid: false, error: 'Файл должен иметь расширение .exe или .com' };
    }

    // Attempt to run --version to confirm it's mpv and retrieve version string
    // Check if companion mpv.com exists in the same directory on Windows
    const dir = path.dirname(cleanPath);
    const companionCom = path.join(dir, 'mpv.com');
    const runnerPath = (process.platform === 'win32' && fs.existsSync(companionCom))
      ? companionCom
      : cleanPath;

    const version = await new Promise<string>((resolve) => {
      execFile(runnerPath, ['--version'], { timeout: 3000 }, (err, stdout, stderr) => {
        const out = (stdout || '') + (stderr || '');
        const match = out.match(/mpv\s+(v?[\w.-]+)/i);
        if (match && match[1]) {
          resolve(match[1]);
        } else if (!err && out.toLowerCase().includes('mpv')) {
          resolve('mpv');
        } else {
          // If execution times out or produces unexpected output, but filename is mpv.exe
          if (path.basename(cleanPath).toLowerCase().startsWith('mpv')) {
            resolve('mpv');
          } else {
            resolve('');
          }
        }
      });
    });

    if (!version && !path.basename(cleanPath).toLowerCase().startsWith('mpv')) {
      return { valid: false, error: 'Исполняемый файл не опознан как mpv' };
    }

    return { valid: true, version: version || 'mpv' };
  } catch (err) {
    return { valid: false, error: (err as Error).message };
  }
}

/**
 * Searches for mpv in common system locations, PATH, and registry on Windows.
 */
export async function detectMpvExecutable(): Promise<MpvDetectionResult | null> {
  const candidates: { path: string; source: string }[] = [];

  // 1. Check PATH using 'where.exe mpv' on Windows
  if (process.platform === 'win32') {
    try {
      const whereOutput = await new Promise<string>((resolve) => {
        execFile('where.exe', ['mpv'], { timeout: 2000 }, (err, stdout) => {
          if (!err && stdout) resolve(stdout);
          else resolve('');
        });
      });

      const lines = whereOutput.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      for (const line of lines) {
        if (line.toLowerCase().endsWith('.exe')) {
          candidates.push({ path: line, source: 'PATH' });
        }
      }
    } catch {}
  }

  // 2. Check root drive folders (C:\mpv, D:\mpv, E:\mpv, etc.)
  const rootDrives = ['C', 'D', 'E', 'F'];
  for (const drive of rootDrives) {
    const rootPath = `${drive}:\\mpv\\mpv.exe`;
    candidates.push({ path: rootPath, source: `Диск ${drive}:` });
  }

  // 3. Check standard Program Files & AppData folders
  const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
  const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
  const localAppData = process.env.LOCALAPPDATA || '';
  const userProfile = process.env.USERPROFILE || '';
  const allUsersProfile = process.env.ALLUSERSPROFILE || 'C:\\ProgramData';

  if (programFiles) {
    candidates.push({ path: path.join(programFiles, 'mpv', 'mpv.exe'), source: 'Program Files' });
  }
  if (programFilesX86) {
    candidates.push({ path: path.join(programFilesX86, 'mpv', 'mpv.exe'), source: 'Program Files (x86)' });
  }
  if (localAppData) {
    candidates.push({ path: path.join(localAppData, 'Programs', 'mpv', 'mpv.exe'), source: 'Local AppData' });
    candidates.push({ path: path.join(localAppData, 'Microsoft', 'WinGet', 'Links', 'mpv.exe'), source: 'WinGet' });
  }
  if (userProfile) {
    candidates.push({ path: path.join(userProfile, 'scoop', 'apps', 'mpv', 'current', 'mpv.exe'), source: 'Scoop' });
    candidates.push({ path: path.join(userProfile, 'scoop', 'shims', 'mpv.exe'), source: 'Scoop' });
  }
  if (allUsersProfile) {
    candidates.push({ path: path.join(allUsersProfile, 'chocolatey', 'bin', 'mpv.exe'), source: 'Chocolatey' });
  }

  // Deduplicate candidate paths
  const seen = new Set<string>();
  const uniqueCandidates: { path: string; source: string }[] = [];
  for (const c of candidates) {
    const norm = path.normalize(c.path).toLowerCase();
    if (!seen.has(norm)) {
      seen.add(norm);
      uniqueCandidates.push(c);
    }
  }

  // Test each candidate
  for (const item of uniqueCandidates) {
    if (fs.existsSync(item.path)) {
      const res = await validateMpvPath(item.path);
      if (res.valid) {
        return {
          path: item.path,
          version: res.version,
          source: item.source,
        };
      }
    }
  }

  return null;
}
