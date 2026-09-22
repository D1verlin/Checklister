import test from 'node:test';
import assert from 'node:assert';
import { parseAnimeFileName } from '../src/services/parser.ts';

test('Parser test suite', async (t) => {
  await t.test('parses SubsPlease format', () => {
    const res = parseAnimeFileName('[SubsPlease] Sousou no Frieren - 04 (1080p) [ABCD1234].mkv');
    assert.strictEqual(res.title, 'Sousou no Frieren');
    assert.strictEqual(res.episode, 4);
    assert.strictEqual(res.resolution, '1080p');
    assert.strictEqual(res.releaseGroup, 'SubsPlease');
    assert.strictEqual(res.crc, 'ABCD1234');
  });

  await t.test('parses Erai-raws format', () => {
    const res = parseAnimeFileName('[Erai-raws] Dandadan - 01 [1080p][Multiple Subtitle][A1B2C3D4].mkv');
    assert.strictEqual(res.title, 'Dandadan');
    assert.strictEqual(res.episode, 1);
    assert.strictEqual(res.resolution, '1080p');
    assert.strictEqual(res.releaseGroup, 'Erai-raws');
  });

  await t.test('parses S01E12 format', () => {
    const res = parseAnimeFileName('Chainsaw Man S01E12 1080p WEB-DL x265.mkv');
    assert.strictEqual(res.title, 'Chainsaw Man');
    assert.strictEqual(res.season, 1);
    assert.strictEqual(res.episode, 12);
  });

  await t.test('parses Season in parent folder', () => {
    const res = parseAnimeFileName('ep05.mkv', 'Jujutsu Kaisen Season 2');
    assert.strictEqual(res.episode, 5);
    assert.strictEqual(res.season, 2);
  });

  await t.test('parses versioned episodes like 04v2', () => {
    const res = parseAnimeFileName('[HorribleSubs] Bleach - 120v2 [720p].mkv');
    assert.strictEqual(res.title, 'Bleach');
    assert.strictEqual(res.episode, 120);
    assert.strictEqual(res.resolution, '720p');
  });

  await t.test('parses dot separated title with E04', () => {
    const res = parseAnimeFileName('Sousou.no.Frieren.E04.1080p.mkv');
    assert.strictEqual(res.title, 'Sousou no Frieren');
    assert.strictEqual(res.episode, 4);
    assert.strictEqual(res.resolution, '1080p');
  });

  await t.test('parses ordinal season like 2nd Season', () => {
    const res = parseAnimeFileName('[ASW] Boku no Kokoro 2nd Season - 14 [1080p].mkv');
    assert.strictEqual(res.title, 'Boku no Kokoro');
    assert.strictEqual(res.season, 2);
    assert.strictEqual(res.episode, 14);
  });

  await t.test('parses Episode 00 with episode name and preserves consistent series title', () => {
    const ep0 = parseAnimeFileName(
      'Mushoku Tensei Isekai Ittara Honki Dasu II - 00 Guardian Fitz [BDRip 1080p AVC 10bits FLAC].mkv',
      'Mushoku Tensei Isekai Ittara Honki Dasu II'
    );
    const ep1 = parseAnimeFileName(
      'Mushoku Tensei Isekai Ittara Honki Dasu II - 01 [BDRip 1080p AVC 10bits FLAC].mkv',
      'Mushoku Tensei Isekai Ittara Honki Dasu II'
    );

    assert.strictEqual(ep0.episode, 0);
    assert.strictEqual(ep1.episode, 1);
    assert.strictEqual(ep0.title, 'Mushoku Tensei Isekai Ittara Honki Dasu II');
    assert.strictEqual(ep1.title, 'Mushoku Tensei Isekai Ittara Honki Dasu II');
    assert.strictEqual(ep0.title, ep1.title);
  });

  await t.test('parses AniLibria bracketed episode numbers', () => {
    const res = parseAnimeFileName('[AniLibria] Sousou no Frieren [02] [WEBRip 1080p].mkv');
    assert.strictEqual(res.title, 'Sousou no Frieren');
    assert.strictEqual(res.episode, 2);
  });

  await t.test('parses Rutracker episode counts like [04 из 28]', () => {
    const res = parseAnimeFileName('Sousou no Frieren [04 из 28] [WEBRip 1080p].mkv');
    assert.strictEqual(res.title, 'Sousou no Frieren');
    assert.strictEqual(res.episode, 4);
  });

  await t.test('parses Russian series keywords like Серия 03', () => {
    const res = parseAnimeFileName('Sousou no Frieren - Серия 03.mkv');
    assert.strictEqual(res.title, 'Sousou no Frieren');
    assert.strictEqual(res.episode, 3);
  });

  await t.test('parses files with underscores properly', () => {
    const res1 = parseAnimeFileName('Sousou_no_Frieren_-_05.mkv');
    const res2 = parseAnimeFileName('Sousou_no_Frieren_06.mkv');
    assert.strictEqual(res1.episode, 5);
    assert.strictEqual(res2.episode, 6);
  });

  await t.test('parses dot separated episode format', () => {
    const res = parseAnimeFileName('Sousou.no.Frieren.07.1080p.mkv');
    assert.strictEqual(res.episode, 7);
  });

  await t.test('parses 1x08 format', () => {
    const res = parseAnimeFileName('Sousou no Frieren - 1x08.mkv');
    assert.strictEqual(res.season, 1);
    assert.strictEqual(res.episode, 8);
  });

  await t.test('handles release year in brackets without treating it as episode number', () => {
    const res = parseAnimeFileName('Spice and Wolf (2024) - 02.mkv');
    assert.strictEqual(res.episode, 2);
  });

  await t.test('handles titles with numbers and multiple dashes correctly', () => {
    const res86 = parseAnimeFileName('86 - Eighty Six - 02.mkv');
    const resMob = parseAnimeFileName('Mob Psycho 100 - 02.mkv');
    assert.strictEqual(res86.episode, 2);
    assert.strictEqual(res86.title, '86 - Eighty Six');
    assert.strictEqual(resMob.episode, 2);
    assert.strictEqual(resMob.title, 'Mob Psycho 100');
  });
});

test('Folder path matching test suite', async (t) => {
  const { isPathInsideFolder, isAnimeInFolders } = await import('../src/services/scanner.ts');

  await t.test('detects subfolder inside configured parent folder', () => {
    assert.strictEqual(isPathInsideFolder('D:\\Anime\\Frieren', 'D:\\Anime'), true);
    assert.strictEqual(isPathInsideFolder('D:/Anime/Frieren', 'd:\\anime'), true);
    assert.strictEqual(isPathInsideFolder('D:\\Anime', 'D:\\Anime'), true);
  });

  await t.test('rejects unrelated paths', () => {
    assert.strictEqual(isPathInsideFolder('D:\\Downloads\\Movie.mkv', 'D:\\Anime'), false);
    assert.strictEqual(isPathInsideFolder('C:\\Anime', 'D:\\Anime'), false);
  });

  await t.test('isAnimeInFolders works across multiple roots and empty list', () => {
    const roots = ['D:\\Anime', 'E:\\Shows'];
    assert.strictEqual(isAnimeInFolders('D:\\Anime\\DanDaDan', roots), true);
    assert.strictEqual(isAnimeInFolders('E:\\Shows\\Bleach', roots), true);
    assert.strictEqual(isAnimeInFolders('C:\\Anime\\Other', roots), false);
    assert.strictEqual(isAnimeInFolders('D:\\Anime\\DanDaDan', []), false);
  });
});

test('Disk space & Gap detection test suite', async (t) => {
  const { formatBytes, buildAnimeWithEpisodes } = await import('../src/services/scanner.ts');

  await t.test('formatBytes formats properly across sizes', () => {
    assert.strictEqual(formatBytes(0), '0 B');
    assert.strictEqual(formatBytes(1024), '1 KB');
    assert.strictEqual(formatBytes(1048576 * 500), '500.0 MB');
    assert.strictEqual(formatBytes(1073741824 * 2.5), '2.5 GB');
  });

  await t.test('buildAnimeWithEpisodes calculates totalSizeBytes and sequential gaps', () => {
    const mockAnime = [
      {
        id: 'anime-1',
        titleRomaji: 'DanDaDan',
        coverImage: '',
        airingStatus: 'FINISHED',
        folderPath: 'D:\\Anime\\DanDaDan',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const mockEpisodes = [
      {
        id: 'ep-1',
        animeId: 'anime-1',
        episodeNumber: 1,
        fileName: 'DanDaDan - 01.mkv',
        filePath: 'D:\\Anime\\DanDaDan\\01.mkv',
        fileSize: 1000000000,
        isWatched: true,
      },
      {
        id: 'ep-2',
        animeId: 'anime-1',
        episodeNumber: 2,
        fileName: 'DanDaDan - 02.mkv',
        filePath: 'D:\\Anime\\DanDaDan\\02.mkv',
        fileSize: 1000000000,
        isWatched: false,
      },
      {
        id: 'ep-4',
        animeId: 'anime-1',
        episodeNumber: 4,
        fileName: 'DanDaDan - 04.mkv',
        filePath: 'D:\\Anime\\DanDaDan\\04.mkv',
        fileSize: 1000000000,
        isWatched: false,
      },
    ];

    const result = buildAnimeWithEpisodes(mockAnime, mockEpisodes);
    assert.strictEqual(result.length, 1);
    const item = result[0];

    // Total size should be sum of 3 episodes = 3,000,000,000 bytes
    assert.strictEqual(item.totalSizeBytes, 3000000000);

    // Episode 3 is missing between 1, 2 and 4
    assert.deepStrictEqual(item.missingEpisodeNumbers, [3]);
    assert.strictEqual(item.hasMissingFiles, false);
    assert.strictEqual(item.watchedCount, 1);
    assert.strictEqual(item.nextEpisodeToWatch?.episodeNumber, 2);
  });
});

test('Batch rename collision protection test suite', async (t) => {
  await t.test('disambiguates duplicate target names with numbering', () => {
    const episodes = [
      { id: '1', fileName: 'DanDaDan_01.mkv', episodeNumber: 1, seasonNumber: 1 },
      { id: '2', fileName: 'DanDaDan_01v2.mkv', episodeNumber: 1, seasonNumber: 1 },
      { id: '3', fileName: 'DanDaDan_01_extra.mkv', episodeNumber: 1, seasonNumber: 1 },
    ];

    const baseTitle = 'DanDaDan';
    const usedNames = new Map();

    const results = episodes.map((ep) => {
      const extIndex = ep.fileName.lastIndexOf('.');
      const ext = extIndex !== -1 ? ep.fileName.substring(extIndex) : '';
      const epNum = String(ep.episodeNumber).padStart(2, '0');
      const rawBase = `${baseTitle} - ${epNum}`;

      const key = `${rawBase.toLowerCase()}${ext.toLowerCase()}`;
      const count = usedNames.get(key) || 0;
      usedNames.set(key, count + 1);

      const suffix = count > 0 ? ` (${count + 1})` : '';
      return `${rawBase}${suffix}${ext}`;
    });

    assert.strictEqual(results[0], 'DanDaDan - 01.mkv');
    assert.strictEqual(results[1], 'DanDaDan - 01 (2).mkv');
    assert.strictEqual(results[2], 'DanDaDan - 01 (3).mkv');
  });
});
