// Renders public/icons/icon.svg into the PNG sizes iOS and Android want.
// Run after editing the SVG: node scripts/build-icons.mjs
import sharp from "sharp";

const src = new URL("../public/icons/icon.svg", import.meta.url).pathname;
const out = (name) => new URL(`../public/icons/${name}`, import.meta.url).pathname;

for (const [name, size] of [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["apple-touch-icon.png", 180],
]) {
  await sharp(src, { density: 300 }).resize(size, size).png().toFile(out(name));
}

// Maskable: Android crops to a circle, so the art sits inside the middle 80%.
const inner = await sharp(src, { density: 300 }).resize(410, 410).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: "#1f7a55" } })
  .composite([{ input: inner, gravity: "center" }])
  .png()
  .toFile(out("maskable-512.png"));
console.log("icons written");
