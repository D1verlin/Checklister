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
