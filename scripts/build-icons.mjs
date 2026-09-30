// Draws the app icon (a green fork and knife on near-black, same style as
// IronLog's barbell) and writes every size the PWA needs. Run once with
// `node scripts/build-icons.mjs`; the PNGs are committed.
import sharp from "sharp";
import { writeFileSync } from "node:fs";

const BG = "#0b0b0c", ACCENT = "#34c585";

// `pad` shrinks the drawing toward the centre: maskable icons get cropped to a
// circle or squircle by Android, so the glyph has to sit inside the middle 80%.
function svg(pad = 1, rounded = false) {
  const s = 512, c = s / 2, r = rounded ? 112 : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs><radialGradient id="glow" cx="50%" cy="0%" r="90%">
    <stop offset="0" stop-color="${ACCENT}" stop-opacity="0.22"/><stop offset="1" stop-color="${ACCENT}" stop-opacity="0"/>
  </radialGradient></defs>
  <rect width="${s}" height="${s}" rx="${r}" fill="${BG}"/>
  <rect width="${s}" height="${s}" rx="${r}" fill="url(#glow)"/>
  <g fill="${ACCENT}" transform="translate(${c} ${c}) scale(${pad}) translate(${-c} ${-c})">
    <rect x="146" y="112" width="20" height="116" rx="10"/>
    <rect x="182" y="112" width="20" height="116" rx="10"/>
    <rect x="218" y="112" width="20" height="116" rx="10"/>
    <rect x="146" y="196" width="92" height="56" rx="26"/>
    <rect x="172" y="236" width="40" height="164" rx="16"/>
    <path d="M318 128 Q 318 112 334 116 C 378 132, 382 214, 362 280 L 318 280 Z"/>
    <rect x="318" y="248" width="44" height="152" rx="16"/>
  </g>
</svg>`;
}

const png = (src, size, out) => sharp(Buffer.from(src)).resize(size, size).png().toFile(out);

await png(svg(), 192, "public/icons/icon-192.png");
await png(svg(), 512, "public/icons/icon-512.png");
await png(svg(0.78), 512, "public/icons/maskable-512.png");
await png(svg(), 180, "public/icons/apple-touch-icon.png"); // iOS rounds the corners itself
writeFileSync("public/icons/icon.svg", svg(1, true)); // browser tab
console.log("icons written");
