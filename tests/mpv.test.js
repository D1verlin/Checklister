import test from 'node:test';
import assert from 'node:assert';
import { validateMpvPath, detectMpvExecutable } from '../electron/mpvDetector.ts';

test('MPV detector and validation suite', async (t) => {
  await t.test('rejects empty or non-existent path', async () => {
    const res1 = await validateMpvPath('');
    assert.strictEqual(res1.valid, false);

    const res2 = await validateMpvPath('C:\\non_existent_folder\\fake_mpv.exe');
    assert.strictEqual(res2.valid, false);
  });

  await t.test('detectMpvExecutable returns valid installation if available', async () => {
    const detected = await detectMpvExecutable();
    if (detected) {
      assert.ok(detected.path.toLowerCase().endsWith('mpv.exe'));
      assert.ok(detected.source.length > 0);
      const validation = await validateMpvPath(detected.path);
      assert.strictEqual(validation.valid, true);
    }
  });
});
