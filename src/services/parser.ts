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
    const candidate = groupMatch[1].trim();
    // Do not treat episode numbers, counts, or quality as release groups
    if (
      !candidate.match(/^\d{1,4}(\s*(?:из|of|\/|-)\s*\d{1,4})?$/i) &&
      !candidate.match(/^(?:ep|e|s\d+e)\d+/i)
    ) {
      releaseGroup = candidate;
      working = working.substring(groupMatch[0].length);
    }
  }

  // 3. Extract Resolution
  let resolution: string | undefined;
  const resMatch = working.match(/\b(2160p|1080p|720p|480p|360p|4K|\d{3,4}x\d{3,4})\b/i);
  if (resMatch) {
    resolution = resMatch[1].toLowerCase();
    working = working.replace(resMatch[0], ' ');
  }

  // 4. Strip known technical and quality tags
  const techTags = [
    /\b(x264|x265|hevc|avc|av1|h\.?264|h\.?265)\b/gi,
    /\b(10bits?|8bits?|hi10p)\b/gi,
    /\b(aac|flac|opus|mp3|ac3|dts|dual[\s_-]?audio|multi[\s_-]?(?:sub|audio)?)\b/gi,
    /\b(web-?dl|webrip|bluray|bdrip|dvdrip|hdtv|tvrip|remux)\b/gi,
    /\b(multiple[\s_-]?subtitles?|subtitles?|raw)\b/gi,
  ];
  for (const tag of techTags) {
    working = working.replace(tag, ' ');
  }

  let season: number | undefined;
  let episode: number | undefined;

  // 5. Detect Season from parent folder first if provided (e.g. "Season 2", "S02", "2 сезон")
  if (parentFolderName) {
    const parentSeasonMatch = parentFolderName.match(/(?:season|s|сезон)\s*0?(\d+)/i);
    if (parentSeasonMatch) {
      season = parseInt(parentSeasonMatch[1], 10);
    }
  }

  // 6. Check brackets or parentheses for episode (e.g. [01], [01 of 12], [01 из 12], (01), [Серия 01], [S01E02])
  // Pattern A: [01 из 12] or (01 of 12)
  const bracketCountMatch = working.match(/[\[\(]\s*0?(\d{1,4})\s*(?:из|of|\/)\s*\d{1,4}(?:v\d+)?\s*[\]\)]/i);
  if (bracketCountMatch) {
    episode = parseInt(bracketCountMatch[1], 10);
    working = working.replace(bracketCountMatch[0], ' ');
  }

  // Pattern B: [S01E02] or (S1E02)
  if (episode === undefined) {
    const bracketSeMatch = working.match(/[\[\(]\s*[sS]0?(\d{1,2})[\s._-]*[eE](?:pisode)?[\s._-]*0?(\d{1,4})(?:v\d+)?\s*[\]\)]/i);
    if (bracketSeMatch) {
      if (!season) season = parseInt(bracketSeMatch[1], 10);
      episode = parseInt(bracketSeMatch[2], 10);
      working = working.replace(bracketSeMatch[0], ' ');
    }
  }

  // Pattern C: [01] or (01) or [EP01] or [Серия 01]
  if (episode === undefined) {
    const bracketEpMatch = working.match(/[\[\(]\s*(?:(?:ep|episode|серия|сер\.?|эпизод|выпуск|e)[\s._-]*)?0?(\d{1,4})(?:v\d+)?\s*[\]\)]/iu);
    if (bracketEpMatch) {
      const num = parseInt(bracketEpMatch[1], 10);
      // Ignore 4-digit numbers in range 1950-2099 without ep prefix (likely release year like (2024))
      const isYear = num >= 1950 && num <= 2099 && !bracketEpMatch[0].match(/(?:ep|episode|серия|сер|эпизод|выпуск|e)/i);
      if (!isYear) {
        episode = num;
        working = working.replace(bracketEpMatch[0], ' ');
      }
    }
  }

  // Strip remaining brackets and parentheses containing metadata
  working = working.replace(/\[[^\]]*\]/g, ' ');
  working = working.replace(/\([^)]*\)/g, ' ');

  // Normalize underscores to spaces (allowing regex boundaries to work seamlessly)
  working = working.replace(/_+/g, ' ');

  // 7. Pattern: S01E04 or S1E04 (extracts both Season and Episode, plus title before it)
  if (episode === undefined) {
    const fullSeMatch = working.match(/^(.*?)\s*\b[sS]0?(\d{1,2})[\s._-]*[eE](?:pisode)?[\s._-]*0?(\d{1,4})(?:v\d+)?\b(?:\s+(.*))?$/i);
    if (fullSeMatch) {
      if (fullSeMatch[1] && fullSeMatch[1].trim()) {
        working = fullSeMatch[1];
      }
      if (!season) season = parseInt(fullSeMatch[2], 10);
      episode = parseInt(fullSeMatch[3], 10);
    }
  }

  // Pattern: 1x02 or 01x02
  if (episode === undefined) {
    const xSeMatch = working.match(/^(.*?)\s*\b0?(\d{1,2})x0?(\d{1,4})(?:v\d+)?\b(?:\s+(.*))?$/i);
    if (xSeMatch) {
      if (xSeMatch[1] && xSeMatch[1].trim()) {
        working = xSeMatch[1];
      }
      if (!season) season = parseInt(xSeMatch[2], 10);
      episode = parseInt(xSeMatch[3], 10);
    }
  }

  // Check filename for Season if not found yet
  if (!season) {
    const sMatch = working.match(/\b(?:season\s*0?|s0?|сезон\s*0?)(\d{1,2})\b/iu);
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

  // 8. Pattern: Russian / English explicit words: "Серия 02", "Сер. 02", "Эпизод 02", "Episode 02", "Ep 02", "02 серия"
  if (episode === undefined) {
    const prefixEpMatch = working.match(/(?<![a-zA-Zа-яА-Я0-9])(?:серия|серии|сер\.?|эпизод|выпуск|episode|ep\.?|e)[\s._-]*0?(\d{1,4})(?:v\d+)?(?![a-zA-Zа-яА-Я0-9])/iu);
    if (prefixEpMatch) {
      episode = parseInt(prefixEpMatch[1], 10);
      working = working.replace(prefixEpMatch[0], ' ');
    } else {
      const postfixEpMatch = working.match(/(?<![a-zA-Zа-яА-Я0-9])0?(\d{1,4})\s*(?:серия|серии|сер\.?|эпизод|выпуск)(?![a-zA-Zа-яА-Я0-9])/iu);
      if (postfixEpMatch) {
        episode = parseInt(postfixEpMatch[1], 10);
        working = working.replace(postfixEpMatch[0], ' ');
      }
    }
  }

  // 9. Pattern: "<Title> - 04" or "<Title> - 00 Episode Name" (greedy match on title for multiple dashes)
  if (episode === undefined) {
    const dashEpMatch = working.match(/^(.*)\s*-\s*0?(\d{1,4})(?:v\d+)?(?:\s*-\s*|\s+|$)(.*)$/i);
    if (dashEpMatch) {
      working = dashEpMatch[1];
      episode = parseInt(dashEpMatch[2], 10);
    }
  }

  // 10. Pattern: Leading episode number, e.g. "02. Title" or "02 - Title" or "02 Title"
  if (episode === undefined) {
    const leadingEpMatch = working.match(/^\s*0?(\d{1,4})(?:v\d+)?\s*(?:[-–.]\s+|\s+)(.+)$/);
    if (leadingEpMatch) {
      episode = parseInt(leadingEpMatch[1], 10);
      working = leadingEpMatch[2];
    }
  }

  // 11. Pattern: Dot separated episode, e.g. "Title.04.1080p" or "Sousou.no.Frieren.E04"
  if (episode === undefined) {
    const dotEpMatch = working.match(/\.0?(\d{1,4})(?:v\d+)?(?:\.|$)/);
    if (dotEpMatch) {
      episode = parseInt(dotEpMatch[1], 10);
      working = working.replace(dotEpMatch[0], ' ');
    }
  }

  // 12. Pattern: standalone number surrounded by spaces, e.g. "Title 04" or pure number "04"
  if (episode === undefined) {
    const standaloneMatch = working.match(/(?:^|\s)0?(\d{1,3})(?:v\d+)?(?=\s|$)/);
    if (standaloneMatch) {
      episode = parseInt(standaloneMatch[1], 10);
      working = working.replace(standaloneMatch[0], ' ');
    }
  }

  // 13. Clean up remaining title string
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

  // If title became empty or is just a generic indicator (e.g. "серия", "эпизод", "episode")
  if (
    !cleanedTitle ||
    cleanedTitle.length < 2 ||
    cleanedTitle.match(/^(?:серия|сер|эпизод|выпуск|episode|ep)$/iu)
  ) {
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
