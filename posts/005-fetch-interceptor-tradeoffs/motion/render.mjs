// Renderiza compose.html frame a frame e entrega ao ffmpeg. Uso:
//   node render.mjs                 -> out/reel-005.mp4 (com o som de sfx.mjs)
//   node render.mjs --stills 1,4.2  -> out/stills/*.png para conferir quadros
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { chromium } from "../lab/node_modules/playwright/index.mjs";
import { story } from "./story.mjs";
import { writeSfx } from "./sfx.mjs";

const here = new URL("./", import.meta.url).pathname;
const stillsArg = process.argv.indexOf("--stills");
const stills = stillsArg > 0 ? process.argv[stillsArg + 1].split(",").map(Number) : null;
await mkdir(here + "out/stills", { recursive: true });

const browser = await chromium.launch({ args: ["--allow-file-access-from-files"] });
const page = await browser.newPage({ viewport: story.size, deviceScaleFactor: 1 });
page.on("pageerror", (e) => console.error("page:", e.message));
await page.goto("file://" + here + "compose.html");
await page.evaluate((d) => window.setup(d), story);
await page.evaluate(() => document.fonts.ready);

const shot = async (t) => {
  await page.evaluate((t) => window.seek(t), t);
  return page.screenshot({ type: "png" });
};

if (stills) {
  for (const t of stills) {
    await page.evaluate((t) => window.seek(t), t);
    await page.screenshot({ path: `${here}out/stills/t${t.toFixed(2)}.png` });
  }
  console.log(`stills: ${stills.join(", ")}`);
} else {
  const wav = `${here}out/sfx.wav`;
  writeSfx(wav);
  const out = `${here}out/reel-005.mp4`;
  const ff = spawn("ffmpeg", [
    "-y", "-loglevel", "error",
    "-f", "image2pipe", "-framerate", String(story.fps), "-i", "-",
    "-i", wav,
    "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", "-profile:v", "high", "-movflags", "+faststart",
    "-af", "loudnorm=I=-14:TP=-1.5:LRA=9,alimiter=limit=0.84:level=false", "-ar", "48000", // alvo de loudness das redes sociais
    "-c:a", "aac", "-b:a", "192k", "-shortest", out,
  ], { stdio: ["pipe", "inherit", "inherit"] });
  const total = story.fps * story.duration;
  const t0 = Date.now();
  for (let i = 0; i < total; i++) {
    const png = await shot(i / story.fps);
    if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once("drain", r));
    if (i % 60 === 0) process.stdout.write(`\r${i}/${total} · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on("close", r));
  console.log(`\n${out}`);
}
await browser.close();
