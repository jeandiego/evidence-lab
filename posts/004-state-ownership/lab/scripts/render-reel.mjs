#!/usr/bin/env node
import { spawn } from "node:child_process"
import { once } from "node:events"
import { mkdir } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import process from "node:process"
import { chromium } from "@playwright/test"

const lab = resolve(import.meta.dirname, "..")
const arg = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`)
  return index === -1 ? fallback : process.argv[index + 1]
}
const origin = arg("url", "http://localhost:4174")
const fps = Number(arg("fps", "30"))
const out = resolve(lab, arg("out", "../post/assets/reel-004.mp4"))

await mkdir(dirname(out), { recursive: true })
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--hide-scrollbars", "--force-color-profile=srgb"] })

try {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 })
  await page.goto(`${origin}/reel.html?capture`, { waitUntil: "networkidle" })
  await page.waitForFunction(() => window.reel?.ready, null, { timeout: 30_000 })
  const meta = await page.evaluate(() => ({ length: window.reel.length, poster: window.reel.poster }))
  const frames = Math.round(meta.length * fps)
  const ffmpeg = spawn("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "image2pipe", "-c:v", "png", "-framerate", String(fps), "-i", "-", "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out], { stdio: ["pipe", "inherit", "inherit"] })
  const finished = once(ffmpeg, "close").then(([code]) => { if (code) throw new Error(`ffmpeg saiu com ${code}`) })

  for (let frame = 0; frame < frames; frame++) {
    await page.evaluate((time) => window.reel.seek(time), frame / fps)
    const image = await page.screenshot({ type: "png" })
    if (!ffmpeg.stdin.write(image)) await once(ffmpeg.stdin, "drain")
    if (frame % 90 === 0) process.stdout.write(`\r${Math.round(frame / frames * 100)}%`)
  }
  ffmpeg.stdin.end()
  await finished
  await page.evaluate((time) => window.reel.seek(time), meta.poster)
  const poster = out.replace(/\.mp4$/, "-poster.jpg")
  await page.screenshot({ path: poster, type: "jpeg", quality: 94 })
  console.log(`\r${frames} quadros · ${meta.length}s → ${out}\nthumbnail base → ${poster}`)
} finally {
  await browser.close()
}
