import type { ParseResult } from '../types/index.ts';

/**
 * Normalizes and extracts title, season, and episode from anime filenames and folder structures.
 */
export function parseAnimeFileName(fileName: string, parentFolderName?: string): ParseResult {
  // Strip file extension
  const extMatch = fileName.lastIndexOf('.');
  const baseName = extMatch !== -1 ? fileName.substring(0, extMatch) : fileName;

  let working = baseName;

  // 1. Extract CRC32 if present (8 hex characters in brackets)
  let crc: string | undefined;
  const crcMatch = working.match(/\[([0-9a-fA-F]{8})\]/);
  if (crcMatch) {
    crc = crcMatch[1];
    working = working.replace(crcMatch[0], ' ');
  }

  // 2. Extract release group (usually first bracketed term)
  let releaseGroup: string | undefined;
  const groupMatch = working.match(/^\[([^\]]+)\]/);
  if (groupMatch) {
    releaseGroup = groupMatch[1];
    working = working.substring(groupMatch[0].length);
  }

  // 3. Extract Resolution
  let resolution: string | undefined;
  const resMatch = working.match(/\b(2160p|1080p|720p|480p|4K)\b/i);
  if (resMatch) {
    resolution = resMatch[1].toLowerCase();
    working = working.replace(resMatch[0], ' ');
  }

  // 4. Strip known technical and quality tags
  const techTags = [
    /\b(x264|x265|hevc|avc|av1|h\.?264|h\.?265)\b/gi,
    /\b(10bits?|8bits?|hi10p)\b/gi,
    /\b(aac|flac|opus|mp3|ac3|dts|dual[\s_-]?audio|multi[\s_-]?(?:sub|audio)?)\b/gi,
    /\b(web-?dl|webrip|bluray|bdrip|dvdrip|hdtv)\b/gi,
    /\b(multiple[\s_-]?subtitles?|subtitles?|raw)\b/gi,
  ];
  for (const tag of techTags) {
    working = working.replace(tag, ' ');
  }
  // Strip any remaining brackets and parentheses containing metadata
  working = working.replace(/\[[^\]]*\]/g, ' ');
  working = working.replace(/\([^)]*\)/g, ' ');

  // 5. Detect Season
  let season: number | undefined;
  
  // Check from parent folder first if provided (e.g. "Season 2", "S02")
  if (parentFolderName) {
    const parentSeasonMatch = parentFolderName.match(/(?:season|s)\s*0?(\d+)/i);
    if (parentSeasonMatch) {
      season = parseInt(parentSeasonMatch[1], 10);
    }
  }

  let episode: number | undefined;

  // Pattern: S01E04 or S1E04 (extracts both Season and Episode, plus title before it)
  const fullSeMatch = working.match(/^(.*?)\s*\b[sS]0?(\d{1,2})[\s._-]*[eE](?:pisode)?[\s._-]*0?(\d{1,4})(?:v\d+)?\b(?:\s+(.*))?$/i);
  if (fullSeMatch) {
    if (fullSeMatch[1] && fullSeMatch[1].trim()) {
      working = fullSeMatch[1];
    }
    if (!season) {
      season = parseInt(fullSeMatch[2], 10);
    }
    episode = parseInt(fullSeMatch[3], 10);
  }

  // Check filename for Season if not found yet
  if (!season) {
    const sMatch = working.match(/\b(?:season\s*0?|s0?)(\d{1,2})\b/i);
    if (sMatch) {
      season = parseInt(sMatch[1], 10);
      working = working.replace(sMatch[0], ' ');
    } else {
      const ordinalSeasonMatch = working.match(/\b(\d+)(?:nd|rd|th|st)\s*season\b/i);
      if (ordinalSeasonMatch) {
        season = parseInt(ordinalSeasonMatch[1], 10);
        working = working.replace(ordinalSeasonMatch[0], ' ');
      }
    }
  }

  // If episode not found yet, check other patterns
  if (episode === undefined) {
    // Pattern: "<Title> - 04" or "<Title> - 00 Episode Name"
    const dashEpMatch = working.match(/^(.*?)\s*-\s*0?(\d{1,4})(?:v\d+)?(?:\s*-\s*|\s+|$)(.*)$/i);
    if (dashEpMatch) {
      working = dashEpMatch[1];
      episode = parseInt(dashEpMatch[2], 10);
    } else {
      const epOnlyMatch = working.match(/\b[eE](?:pisode)?[\s._-]*0?(\d{1,4})(?:v\d+)?\b/i);
      if (epOnlyMatch) {
        episode = parseInt(epOnlyMatch[1], 10);
        working = working.replace(epOnlyMatch[0], ' ');
      } else {
        // Pattern: "Episode 04" or "Ep 04"
        const epWordMatch = working.match(/\b(?:episode|ep|e)[\s._-]*0?(\d{1,4})\b/i);
        if (epWordMatch) {
          episode = parseInt(epWordMatch[1], 10);
          working = working.replace(epWordMatch[0], ' ');
        } else {
          // Pattern: standalone number surrounded by spaces or brackets, e.g. "Title 04 (1080p)"
          const standaloneMatch = working.match(/(?:^|\s)0?(\d{1,3})(?:v\d+)?(?=\s|$)/);
          if (standaloneMatch) {
            episode = parseInt(standaloneMatch[1], 10);
            working = working.replace(standaloneMatch[0], ' ');
          }
        }
      }
    }
  }

  // 7. Clean up remaining title string
  // If dot-separated, replace dots with spaces
  let cleanedTitle = working;
  if ((cleanedTitle.match(/\./g) || []).length >= 1) {
    cleanedTitle = cleanedTitle.replace(/\./g, ' ');
  }

  // Remove leftover brackets, underscores, extra hyphens, and whitespace
  cleanedTitle = cleanedTitle
    .replace(/[_[\]().]/g, ' ')
    .replace(/\s+-\s*$/, '')
    .replace(/^\s*-\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();

  // If title became empty, fallback to parent folder name or baseName
  if (!cleanedTitle || cleanedTitle.length < 2) {
    if (parentFolderName && !parentFolderName.match(/^season\s*\d+$/i)) {
      cleanedTitle = parentFolderName;
    } else {
      cleanedTitle = baseName;
    }
  }

  return {
    title: cleanedTitle,
    season,
    episode,
    resolution,
    releaseGroup,
    crc,
    originalFileName: fileName,
  };
}
