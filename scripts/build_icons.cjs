const { app, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

function createIcoFromPngs(pngBuffers) {
  const count = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  let offset = headerSize + count * dirEntrySize;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // ICO type
  header.writeUInt16LE(count, 4); // image count

  const dirEntries = [];
  for (const item of pngBuffers) {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(item.width >= 256 ? 0 : item.width, 0);
    entry.writeUInt8(item.height >= 256 ? 0 : item.height, 1);
    entry.writeUInt8(0, 2); // color count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(item.buffer.length, 8); // image size
    entry.writeUInt32LE(offset, 12); // image offset
    dirEntries.push(entry);
    offset += item.buffer.length;
  }

  return Buffer.concat([header, ...dirEntries, ...pngBuffers.map(p => p.buffer)]);
}

app.whenReady().then(async () => {
  try {
    const masterPngPath = path.resolve(__dirname, '..', 'public', 'android-chrome-512x512.png');
    const masterImg = nativeImage.createFromPath(masterPngPath);
    console.log('Loaded user master image:', masterImg.getSize());

    const sizes = [16, 24, 32, 48, 64, 128, 256, 512];
    const iconsDir = path.resolve(__dirname, '..', 'public', 'icons');
    const buildIconsDir = path.resolve(__dirname, '..', 'build', 'icons');
    fs.mkdirSync(iconsDir, { recursive: true });
    fs.mkdirSync(buildIconsDir, { recursive: true });

    const icoCandidates = [];

    for (const size of sizes) {
      let pngBuf;
      // If user supplied a direct file for 16x16 or 32x32, prefer their exact pixels
      if (size === 16 && fs.existsSync(path.resolve(__dirname, '..', 'public', 'favicon-16x16.png'))) {
        pngBuf = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'favicon-16x16.png'));
      } else if (size === 32 && fs.existsSync(path.resolve(__dirname, '..', 'public', 'favicon-32x32.png'))) {
        pngBuf = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'favicon-32x32.png'));
      } else if (size === 512) {
        pngBuf = fs.readFileSync(masterPngPath);
      } else {
        const resized = masterImg.resize({ width: size, height: size, quality: 'best' });
        pngBuf = resized.toPNG();
      }

      fs.writeFileSync(path.join(iconsDir, `${size}x${size}.png`), pngBuf);
      fs.writeFileSync(path.join(buildIconsDir, `${size}x${size}.png`), pngBuf);

      if (size <= 256) {
        icoCandidates.push({ width: size, height: size, buffer: pngBuf });
      }
    }

    const fullIco = createIcoFromPngs(icoCandidates);
    fs.writeFileSync(path.resolve(__dirname, '..', 'public', 'icon.ico'), fullIco);
    fs.writeFileSync(path.resolve(__dirname, '..', 'build', 'icon.ico'), fullIco);
    fs.writeFileSync(path.resolve(__dirname, '..', 'icon.ico'), fullIco);

    console.log('Generated full Windows multi-res ICO with user artwork:', fullIco.length, 'bytes');
  } catch (err) {
    console.error('Error generating ICO:', err);
  } finally {
    app.quit();
  }
});
