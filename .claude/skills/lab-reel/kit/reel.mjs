#!/usr/bin/env node
// Lab Reel CLI — Synko Lab.
//   node scripts/reel.mjs check                 validate facts, selectors, layout and collisions
//   node scripts/reel.mjs sheet                 contact sheet of every beat → .reel/sheet.png
//   node scripts/reel.mjs render [--out file]   MP4 (H.264, 1080×1350, 30 fps) + poster JPG
// Options: --url <running dev server>  --fps <n>  --strict (warnings fail too)
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import puppeteer from 'puppeteer-core'
import { createServer } from 'vite'

const lab = resolve(import.meta.dirname, '..')
const [command = 'check'] = process.argv.slice(2).filter(a => !a.startsWith('--'))
const option = (name, fallback) => { const at = process.argv.indexOf(`--${name}`); return at === -1 ? fallback : process.argv[at + 1] }
const fps = Number(option('fps', 30))
const work = join(lab, '.reel')

function ffmpeg(args, input) {
  const child = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: [input ? 'pipe' : 'ignore', 'inherit', 'inherit'] })
  const done = once(child, 'close').then(([code]) => { if (code) throw new Error(`ffmpeg saiu com ${code}`) })
  return { child, done }
}

async function withPage(run) {
  let server, origin = option('url')
  if (!origin) {
    server = await createServer({ root: lab, logLevel: 'error', server: { port: 5288 } })
    await server.listen(); origin = server.resolvedUrls.local[0]
  }
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--hide-scrollbars', '--force-color-profile=srgb'] })
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 1 })
    page.on('pageerror', e => console.error('[página]', e.message))
    await page.goto(new URL('reel.html?capture', origin).href, { waitUntil: 'networkidle0' })
    await page.waitForFunction('window.reel?.ready', { timeout: 60_000 })
    const meta = await page.evaluate(() => ({ length: window.reel.length, beats: window.reel.beats, poster: window.reel.poster, errors: window.reel.errors, warnings: window.reel.warnings }))
    for (const e of meta.errors) console.error(`ERRO   ${e}`)
    for (const w of meta.warnings) console.warn(`AVISO  ${w}`)
    if (meta.errors.length || (process.argv.includes('--strict') && meta.warnings.length)) { process.exitCode = 1; return }
    const at = time => page.evaluate(x => window.reel.seek(x), time)
    await run({ page, meta, at })
  } finally {
    await browser.close(); await server?.close()
  }
}

await withPage(async ({ page, meta, at }) => {
  if (command === 'check') {
    console.log(`ok · ${meta.length.toFixed(1)} s · ${meta.beats.length} batidas · ${meta.warnings.length} avisos`)
  } else if (command === 'sheet') {
    await rm(work, { recursive: true, force: true }); await mkdir(join(work, 'beats'), { recursive: true })
    const index = []
    for (const [i, b] of meta.beats.entries()) {
      await at(b.t)
      await page.screenshot({ path: join(work, 'beats', `${String(i).padStart(3, '0')}.png`) })
      index.push(`${String(i).padStart(3, '0')}  ${b.t.toFixed(2).padStart(6)}s  ${b.cut} · ${b.label}`)
    }
    await writeFile(join(work, 'beats', 'index.txt'), index.join('\n') + '\n')
    const cols = 6, { done } = ffmpeg(['-i', join(work, 'beats', '%03d.png'), '-vf', `scale=300:-1,tile=${cols}x${Math.ceil(meta.beats.length / cols)}:padding=8:color=0x2A2522`, '-frames:v', '1', join(work, 'sheet.png')])
    await done
    const cost = await page.evaluate(() => { const ms = []; for (let t = 0; t < window.reel.length; t += 1 / 30) { const a = performance.now(); window.reel.seek(t); ms.push(performance.now() - a) } ms.sort((a, b) => a - b); return { p50: ms[ms.length >> 1], p95: ms[Math.floor(ms.length * 0.95)], max: ms.at(-1) } })
    console.log(`${meta.beats.length} batidas → ${join(work, 'sheet.png')}\nseek: p50 ${cost.p50.toFixed(2)} ms · p95 ${cost.p95.toFixed(2)} ms · máx ${cost.max.toFixed(2)} ms`)
  } else if (command === 'render') {
    const out = resolve(lab, option('out', '../post/assets/reel.mp4'))
    await mkdir(dirname(out), { recursive: true })
    const frames = Math.round(meta.length * fps), began = Date.now()
    const { child, done } = ffmpeg(['-f', 'image2pipe', '-c:v', 'png', '-framerate', String(fps), '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], true)
    for (let f = 0; f < frames; f++) {
      await at(f / fps)
      if (!child.stdin.write(await page.screenshot({ type: 'png' }))) await once(child.stdin, 'drain')
      if (f % 90 === 0) process.stdout.write(`\r${Math.round((f / frames) * 100)}%`)
    }
    child.stdin.end(); await done
    await at(meta.poster)
    const poster = out.replace(/\.mp4$/, '-poster.jpg')
    await page.screenshot({ path: poster, type: 'jpeg', quality: 92 })
    console.log(`\r${frames} quadros · ${meta.length.toFixed(1)} s · ${Math.round((Date.now() - began) / 1000)} s → ${out}\ncapa → ${poster}`)
  } else {
    console.error(`comando desconhecido: ${command} (use check, sheet ou render)`); process.exitCode = 1
  }
})
