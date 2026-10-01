import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { cpus, tmpdir, totalmem } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { gzipSync } from 'node:zlib'
import react from '@vitejs/plugin-react'
import puppeteer from 'puppeteer-core'
import { build, createServer } from 'vite'

const root = resolve(import.meta.dirname, '..')
const evidenceFile = resolve(root, '../evidence/react-performance.json')
const chromePath = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const strategyIds = ['react-abstracted', 'react-uncontrolled', 'react-rhf', 'react-state']
const entries = {
  'react-abstracted': 'src/react/main.tsx',
  'react-uncontrolled': 'src/react-uncontrolled/main.tsx',
  'react-rhf': 'src/react-rhf/main.tsx',
  'react-state': 'src/react-state/main.tsx',
}

const median = values => percentile(values, 0.5)
const percentile = (values, ratio) => {
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)
  return Number(sorted[index].toFixed(3))
}
const summarize = values => ({ median: median(values), p95: percentile(values, 0.95), min: Number(Math.min(...values).toFixed(3)), max: Number(Math.max(...values).toFixed(3)) })

async function measureBundle(entry, id) {
  const outputDirectory = await mkdtemp(join(tmpdir(), `evidence-lab-${id}-`))
  try {
    await build({
      root,
      configFile: false,
      logLevel: 'silent',
      plugins: [react()],
      build: {
        outDir: outputDirectory,
        emptyOutDir: true,
        minify: 'esbuild',
        rollupOptions: { input: resolve(root, entry), output: { entryFileNames: 'app.js', chunkFileNames: '[name].js', assetFileNames: '[name][extname]' } },
      },
    })
    const files = await readdir(outputDirectory, { recursive: true })
    const assets = []
    for (const file of files) {
      const path = join(outputDirectory, file)
      if (!(await stat(path)).isFile() || !/\.(js|css)$/.test(file)) continue
      const content = await readFile(path)
      assets.push({ file, bytes: content.byteLength, gzipBytes: gzipSync(content).byteLength })
    }
    return {
      assets,
      totalBytes: assets.reduce((sum, asset) => sum + asset.bytes, 0),
      totalGzipBytes: assets.reduce((sum, asset) => sum + asset.gzipBytes, 0),
    }
  } finally {
    await rm(outputDirectory, { recursive: true, force: true })
  }
}

async function runInteraction(page, id) {
  await page.goto(`${page.url().split('/benchmark.html')[0]}/benchmark.html`, { waitUntil: 'networkidle0' })
  await page.waitForFunction(() => window.__reactBenchmark != null)
  await page.evaluate(() => window.__reactBenchmark.reset())
  const scope = `#bench-${id}`
  const before = await page.metrics()
  await page.type(`${scope} [name="name"]`, 'Ada Lovelace')
  await page.type(`${scope} [name="email"]`, 'ada@example.com')
  await page.select(`${scope} [name="role"]`, 'lead')
  await page.type(`${scope} [name="bio"]`, 'Computação, linguagem e sistemas.')
  await page.click(`${scope} [name="terms"]`)
  await page.click(`${scope} button[type="submit"]`)
  await new Promise(resolveDelay => setTimeout(resolveDelay, 20))
  const after = await page.metrics()
  const renderCallsByComponent = await page.evaluate(() => window.__reactBenchmark.read())
  return {
    renderFunctionCalls: Object.values(renderCallsByComponent).reduce((sum, count) => sum + count, 0),
    renderCallsByComponent,
    taskDurationMs: Number(((after.TaskDuration - before.TaskDuration) * 1000).toFixed(3)),
  }
}

const bundles = {}
for (const [id, entry] of Object.entries(entries)) bundles[id] = await measureBundle(entry, id)

process.env.NODE_ENV = 'development'
const server = await createServer({ root, configFile: false, logLevel: 'silent', plugins: [react()], server: { host: '127.0.0.1', port: 0 } })
await server.listen()
const baseUrl = server.resolvedUrls.local[0].replace(/\/$/, '')
const browser = await puppeteer.launch({ executablePath: chromePath, headless: true, args: ['--no-sandbox', '--disable-background-timer-throttling'] })

try {
  const page = await browser.newPage()
  await page.goto(`${baseUrl}/benchmark.html`, { waitUntil: 'networkidle0' })
  const runs = {}
  const summary = {}
  for (const id of strategyIds) {
    await runInteraction(page, id) // warm-up discarded
    runs[id] = []
    for (let sample = 0; sample < 10; sample += 1) runs[id].push(await runInteraction(page, id))
    summary[id] = {
      renderFunctionCalls: summarize(runs[id].map(run => run.renderFunctionCalls)),
      taskDurationMs: summarize(runs[id].map(run => run.taskDurationMs)),
      bundle: bundles[id],
    }
  }
  const installedVersion = async name => JSON.parse(await readFile(resolve(root, `node_modules/${name}/package.json`), 'utf8')).version
  const result = {
    generatedAt: new Date().toISOString(),
    methodology: {
      samples: 10,
      warmups: 1,
      build: 'Vite development server with explicit render-call instrumentation; isolated production builds for bundle size',
      scenario: 'Type name, email and bio; select role; check terms; submit valid form',
      caveats: [
        'Render-function calls are explicitly instrumented and count only the App and local field wrappers included in this experiment.',
        'TaskDuration is comparative browser CPU time, not user-perceived latency or an INP measurement.',
        'StrictMode is intentionally absent from the benchmark harness.',
        'TaskDuration is Chromium main-thread task time during the automated scenario.',
        'Bundle measurements use isolated minified builds and include transitive dependencies.',
      ],
    },
    environment: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      chrome: await browser.version(),
      cpu: cpus()[0]?.model,
      memoryBytes: totalmem(),
      react: await installedVersion('react'),
      reactHookForm: await installedVersion('react-hook-form'),
      zod: await installedVersion('zod'),
    },
    summary,
    runs,
  }
  await mkdir(dirname(evidenceFile), { recursive: true })
  await writeFile(evidenceFile, `${JSON.stringify(result, null, 2)}\n`)
  console.log(JSON.stringify({ generatedAt: result.generatedAt, environment: result.environment, summary }, null, 2))
} finally {
  await browser.close()
  await server.close()
}
