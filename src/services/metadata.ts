import type { AnimeMetadata } from '../types/index.ts';

// In-memory cache for fast UI retrieval
const metadataCache = new Map<string, Partial<AnimeMetadata>>();

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

interface AniListMedia {
  id: number;
  title: {
    romaji: string;
    english?: string;
    native?: string;
  };
  synonyms?: string[];
  description?: string;
  coverImage?: {
    extraLarge?: string;
    large?: string;
  };
  bannerImage?: string;
  episodes?: number;
  status?: string;
  averageScore?: number;
  genres?: string[];
  studios?: {
    nodes?: { name: string }[];
  };
  nextAiringEpisode?: {
    episode: number;
    timeUntilAiring: number;
  };
}

interface ShikimoriAnime {
  id: number;
  name: string;
  russian?: string;
  score?: string;
  status?: string;
  episodes?: number;
  image?: {
    original?: string;
    preview?: string;
  };
}

/**
 * Queries AniList GraphQL API for anime metadata.
 */
export async function fetchAniList(query: string): Promise<AniListMedia | null> {
  const gql = `
    query ($search: String) {
      Page(page: 1, perPage: 1) {
        media(search: $search, type: ANIME) {
          id
          title {
            romaji
            english
            native
          }
          synonyms
          description
          coverImage {
            extraLarge
            large
          }
          bannerImage
          episodes
          status
          averageScore
          genres
          nextAiringEpisode {
            episode
            timeUntilAiring
          }
        }
      }
    }
  `;

  try {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: gql,
        variables: { search: query },
      }),
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) return null;
    const json = await res.json();
    const media = json?.data?.Page?.media;
    return media && media.length > 0 ? media[0] : null;
  } catch (err) {
    console.warn(`AniList fetch failed for "${query}":`, (err as Error).message);
    return null;
  }
}

const SHIKIMORI_HEADERS = {
  'User-Agent': 'CheckLister/1.0.0 (https://github.com/D1verlin/Checklister)',
  'Accept': 'application/json',
};

/**
 * Queries official Shikimori API (shikimori.io) for Russian title, synopsis, and poster.
 */
export async function fetchShikimori(query: string): Promise<{
  id?: number;
  russian?: string;
  romaji?: string;
  synopsisRussian?: string;
  coverImage?: string;
  episodes?: number;
  score?: number;
  status?: string;
} | null> {
  const clean = query.replace(/[._]/g, ' ').trim();
  if (!clean) return null;

  const urls = [
    `https://shikimori.io/api/animes?search=${encodeURIComponent(clean)}&limit=5`,
    `https://shikimori.one/api/animes?search=${encodeURIComponent(clean)}&limit=5`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: SHIKIMORI_HEADERS,
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) continue;
      const list: ShikimoriAnime[] = await res.json();
      if (!list || list.length === 0) continue;

      // Find the best match
      // If query has "season 2" or "2" or "ii" or "part 2", pick the item that matches
      let best = list[0];
      const qLower = clean.toLowerCase();
      if (qLower.includes('2') || qLower.includes('ii') || qLower.includes('season 2')) {
        const matchingSecond = list.find((item) =>
          item.name.toLowerCase().includes('ii') ||
          item.name.toLowerCase().includes(' 2') ||
          (item.russian && (item.russian.includes(' 2') || item.russian.includes('II')))
        );
        if (matchingSecond) best = matchingSecond;
      }

      const host = 'https://shikimori.io';
      const cover = best.image?.original
        ? (best.image.original.startsWith('http') ? best.image.original : `${host}${best.image.original}`)
        : undefined;

      let synopsisRussian: string | undefined;
      try {
        const detailRes = await fetch(`https://shikimori.io/api/animes/${best.id}`, {
          headers: SHIKIMORI_HEADERS,
          signal: AbortSignal.timeout(3500),
        });
        if (detailRes.ok) {
          const detail = await detailRes.json();
          synopsisRussian = (detail.description || detail.description_html || '').replace(/<[^>]*>?/gm, '').replace(/\[[^\]]*\]/gm, '').trim() || undefined;
        }
      } catch {}

      return {
        id: best.id,
        russian: best.russian || undefined,
        romaji: best.name || undefined,
        synopsisRussian,
        coverImage: cover,
        episodes: best.episodes || undefined,
        score: best.score ? parseFloat(best.score) : undefined,
        status: best.status === 'ongoing' ? 'RELEASING' : 'FINISHED',
      };
    } catch {
      // try next url
    }
  }

  return null;
}

export type MetadataProvider = 'all' | 'shikimori' | 'anilist';

export interface AnimeCandidate {
  id: string;
  source: 'shikimori' | 'anilist';
  shikimoriId?: number;
  aniListId?: number;
  titleRomaji: string;
  titleEnglish?: string;
  titleRussian?: string;
  coverImage: string;
  episodes?: number;
  status?: string;
  score?: number;
}

/**
 * Searches for anime candidates across Shikimori (primary) & AniList for the Remap modal.
 */
export async function searchAnimeCandidates(
  query: string,
  provider: MetadataProvider = 'all'
): Promise<AnimeCandidate[]> {
  const clean = query.replace(/[._]/g, ' ').trim();
  if (!clean) return [];

  // Query Shikimori if provider is 'all' or 'shikimori'
  const shikiPromise = (async () => {
    if (provider === 'anilist') return [];
    const urls = [
      `https://shikimori.io/api/animes?search=${encodeURIComponent(clean)}&limit=10`,
      `https://shikimori.one/api/animes?search=${encodeURIComponent(clean)}&limit=10`,
    ];
    for (const url of urls) {
      try {
        const r = await fetch(url, {
          headers: SHIKIMORI_HEADERS,
          signal: AbortSignal.timeout(6000),
        });
        if (r.ok) {
          const data = await r.json();
          if (Array.isArray(data) && data.length > 0) return data;
        }
      } catch {}
    }
    return [];
  })();

  // Also query AniList if provider is 'all' or 'anilist'
  const aniListPromise = (async () => {
    if (provider === 'shikimori') return null;
    const gql = `
      query ($search: String) {
        Page(page: 1, perPage: 10) {
          media(search: $search, type: ANIME) {
            id
            title {
              romaji
              english
            }
            synonyms
            coverImage {
              large
              extraLarge
            }
            episodes
            status
            averageScore
          }
        }
      }
    `;
    try {
      const res = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': BROWSER_UA,
        },
        body: JSON.stringify({ query: gql, variables: { search: clean } }),
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) return await res.json();
    } catch {}
    return null;
  })();

  const [shikiList, aniListData] = await Promise.all([shikiPromise, aniListPromise]);

  const results: AnimeCandidate[] = [];
  const addedKeys = new Set<string>();

  // 1. Add all Shikimori candidates first (they have official Russian titles!)
  if (Array.isArray(shikiList)) {
    for (const s of shikiList) {
      const host = 'https://shikimori.io';
      const cover = s.image?.original
        ? (s.image.original.startsWith('http') ? s.image.original : `${host}${s.image.original}`)
        : '';
      const status = s.status === 'ongoing' ? 'RELEASING' : 'FINISHED';

      // Check if AniList has a matching English title
      let matchingEnglish: string | undefined;
      const aniMediaList = aniListData?.data?.Page?.media;
      if (Array.isArray(aniMediaList)) {
        const sNorm = s.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const match = aniMediaList.find((m: any) => {
          const mNorm = m.title.romaji.toLowerCase().replace(/[^a-z0-9]/g, '');
          return mNorm === sNorm || sNorm.includes(mNorm) || mNorm.includes(sNorm);
        });
        if (match) {
          matchingEnglish = match.title.english;
        }
      }

      results.push({
        id: `shiki-${s.id}`,
        source: 'shikimori',
        shikimoriId: s.id,
        titleRomaji: s.name,
        titleEnglish: matchingEnglish,
        titleRussian: s.russian || undefined,
        coverImage: cover,
        episodes: s.episodes || undefined,
        status,
        score: s.score ? parseFloat(s.score) : undefined,
      });

      addedKeys.add(s.name.toLowerCase());
    }
  }

  // 2. Add any additional AniList candidates
  const aniMedia = aniListData?.data?.Page?.media;
  if (Array.isArray(aniMedia)) {
    for (const m of aniMedia) {
      const romajiKey = m.title.romaji.toLowerCase();
      if (provider === 'anilist' || !addedKeys.has(romajiKey)) {
        const anilistRussian = m.synonyms?.find((s: string) => /[а-яА-ЯёЁ]/.test(s));
        results.push({
          id: `anilist-${m.id}`,
          source: 'anilist',
          aniListId: m.id,
          titleRomaji: m.title.romaji,
          titleEnglish: m.title.english || undefined,
          titleRussian: anilistRussian || undefined,
          coverImage: m.coverImage?.large || m.coverImage?.extraLarge || '',
          episodes: m.episodes || undefined,
          status: m.status || undefined,
          score: m.averageScore ? Math.round((m.averageScore / 10) * 10) / 10 : undefined,
        });
        addedKeys.add(romajiKey);
      }
    }
  }

  return results;
}

/**
 * Combines AniList and Shikimori results with caching.
 */
export async function getAnimeMetadata(title: string, folderPath: string): Promise<AnimeMetadata> {
  const cacheKey = title.trim().toLowerCase();
  if (metadataCache.has(cacheKey)) {
    const cached = metadataCache.get(cacheKey)!;
    return {
      id: cached.id || `anime-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      titleRomaji: cached.titleRomaji || title,
      titleEnglish: cached.titleEnglish,
      titleRussian: cached.titleRussian,
      synopsis: cached.synopsis,
      synopsisRussian: cached.synopsisRussian,
      coverImage: cached.coverImage || '',
      bannerImage: cached.bannerImage,
      totalEpisodes: cached.totalEpisodes,
      airingStatus: cached.airingStatus || 'FINISHED',
      nextAiringEpisode: cached.nextAiringEpisode,
      score: cached.score,
      genres: cached.genres,
      studios: cached.studios,
      folderPath,
      createdAt: cached.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // Fetch concurrently
  const [aniList, shikimori] = await Promise.all([
    fetchAniList(title),
    fetchShikimori(title),
  ]);

  let airingStatus: 'RELEASING' | 'FINISHED' | 'NOT_YET_RELEASED' | 'CANCELLED' = 'FINISHED';
  if (aniList?.status === 'RELEASING' || shikimori?.status === 'RELEASING') airingStatus = 'RELEASING';
  else if (aniList?.status === 'NOT_YET_RELEASED') airingStatus = 'NOT_YET_RELEASED';
  else if (aniList?.status === 'CANCELLED') airingStatus = 'CANCELLED';

  const anilistRussian = aniList?.synonyms?.find((s) => /[а-яА-ЯёЁ]/.test(s));
  const resolvedRussian = shikimori?.russian || anilistRussian || undefined;

  const metadata: AnimeMetadata = {
    id: `anime-${aniList?.id || shikimori?.id || Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    aniListId: aniList?.id,
    shikimoriId: shikimori?.id,
    titleRomaji: shikimori?.romaji || aniList?.title.romaji || title,
    titleEnglish: aniList?.title.english || undefined,
    titleRussian: resolvedRussian,
    synopsis: aniList?.description?.replace(/<[^>]*>?/gm, '') || undefined,
    synopsisRussian: shikimori?.synopsisRussian || undefined,
    coverImage: aniList?.coverImage?.extraLarge || aniList?.coverImage?.large || shikimori?.coverImage || '',
    shikimoriCoverImage: shikimori?.coverImage || undefined,
    bannerImage: aniList?.bannerImage || undefined,
    totalEpisodes: aniList?.episodes || shikimori?.episodes || undefined,
    airingStatus,
    nextAiringEpisode: aniList?.nextAiringEpisode ? {
      episode: aniList.nextAiringEpisode.episode,
      timeUntilAiring: aniList.nextAiringEpisode.timeUntilAiring,
    } : undefined,
    score: aniList?.averageScore ? Math.round(aniList.averageScore / 10 * 10) / 10 : shikimori?.score || undefined,
    genres: aniList?.genres || [],
    studios: aniList?.studios?.nodes?.map(n => n.name) || [],
    folderPath,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  metadataCache.set(cacheKey, metadata);
  return metadata;
}
