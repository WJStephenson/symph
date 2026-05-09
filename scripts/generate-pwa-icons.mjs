import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "public");
const svgPath = path.join(root, "favicon.svg");

async function main() {
  const svgBuf = await fs.promises.readFile(svgPath);
  await sharp(svgBuf).resize(192, 192).png().toFile(path.join(root, "pwa-192.png"));
  await sharp(svgBuf).resize(512, 512).png().toFile(path.join(root, "pwa-512.png"));
  await sharp(svgBuf).resize(512, 512).png().toFile(path.join(root, "pwa-maskable.png"));
  console.log("Wrote pwa-192.png, pwa-512.png, pwa-maskable.png from favicon.svg");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
