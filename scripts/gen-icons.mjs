import { deflateSync, crc32 } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

// Placeholder PWA icons (teal tile + three rising bars). Replace with the real logo later.
const TEAL = [0x0f, 0x76, 0x6e, 0xff];
const WHITE = [0xff, 0xff, 0xff, 0xff];

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0);
  return Buffer.concat([len, body, crc]);
}

function png(size, drawGlyph) {
  const px = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) px.set(TEAL, i * 4);
  const rect = (x, y, w, h) => {
    for (let yy = Math.round(y); yy < Math.round(y + h); yy++)
      for (let xx = Math.round(x); xx < Math.round(x + w); xx++)
        if (xx >= 0 && yy >= 0 && xx < size && yy < size) px.set(WHITE, (yy * size + xx) * 4);
  };
  drawGlyph(rect, size);
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Glyph stays inside the central 60% so the maskable icon survives cropping.
const glyph = (rect, s) => {
  const barW = s * 0.12;
  const gap = s * 0.06;
  const total = barW * 3 + gap * 2;
  const x0 = (s - total) / 2;
  const base = s * 0.7;
  [0.22, 0.34, 0.46].forEach((h, i) => rect(x0 + i * (barW + gap), base - s * h, barW, s * h));
};

mkdirSync('public', { recursive: true });
writeFileSync('public/pwa-192.png', png(192, glyph));
writeFileSync('public/pwa-512.png', png(512, glyph));
writeFileSync('public/pwa-maskable-512.png', png(512, glyph));
writeFileSync('public/apple-touch-icon.png', png(180, glyph));
writeFileSync(
  'public/favicon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0F766E"/><rect x="16" y="34" width="9" height="14" fill="#fff"/><rect x="27.5" y="27" width="9" height="21" fill="#fff"/><rect x="39" y="19" width="9" height="29" fill="#fff"/></svg>\n`,
);
console.log('icons written to public/');
