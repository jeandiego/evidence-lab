import { cp, mkdir, rm } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const here = dirname(fileURLToPath(import.meta.url))
const siteRoot = resolve(here, '..')

const demos = [
  {
    slug: '003-guarded-handlers',
    lab: resolve(siteRoot, '../posts/003-guarded-handlers/lab'),
  },
]

function run(command, args, cwd) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit' })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolvePromise()
      else reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`))
    })
  })
}

for (const demo of demos) {
  await run('npm', ['ci'], demo.lab)
  await run('npm', ['run', 'build'], demo.lab)

  const destination = resolve(siteRoot, 'public/demos', demo.slug)
  await rm(destination, { recursive: true, force: true })
  await mkdir(destination, { recursive: true })
  await cp(resolve(demo.lab, 'dist'), destination, { recursive: true })
}
