import test from 'node:test';
import assert from 'node:assert';
import { fetchAniList, fetchShikimori, searchAnimeCandidates } from '../src/services/metadata.ts';

test('Metadata API suite', async (t) => {
  await t.test('AniList fetches high-res cover and episode count', async () => {
    const data = await fetchAniList('Sousou no Frieren');
    assert.ok(data !== null, 'AniList returned data');
    assert.ok(data?.title?.romaji.includes('Frieren'), 'Title matched Frieren');
    assert.ok(data?.coverImage?.large, 'Has cover image');
    assert.strictEqual(data?.episodes, 28, 'Has 28 episodes');
  });

  await t.test('Shikimori fetches Russian localized title', async () => {
    const data = await fetchShikimori('Frieren');
    assert.ok(data !== null, 'Shikimori returned data');
    assert.ok(data?.russian?.includes('Фрирен'), 'Russian title contains Фрирен');
  });

  await t.test('Search candidates returns list for remap modal with provider filtering', async () => {
    const listAll = await searchAnimeCandidates('Dandadan', 'all');
    assert.ok(listAll.length > 0, 'Found candidates with provider all');

    const listShikimori = await searchAnimeCandidates('Dandadan', 'shikimori');
    assert.ok(listShikimori.length > 0, 'Found candidates with provider shikimori');
    assert.ok(listShikimori.every(c => c.source === 'shikimori'), 'All candidates are from shikimori');
  });
});

