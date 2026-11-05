import assert from 'node:assert/strict'
import { readFile, readdir, stat } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../public/demos/fyin/dia-2')
const snapshot = JSON.parse(await readFile(resolve(root, 'snapshot.json'), 'utf8'))
for (const [name, hash] of Object.entries(snapshot.sha256)) {
  const path = resolve(root, name)
  const data = await readFile(path)
  assert.equal(createHash('sha256').update(data).digest('hex'), hash, `Snapshot changed: ${name}`)
  if (!/\.(html|css|js)$/.test(name)) continue
  const source = data.toString()
  assert.doesNotMatch(source, /jean|poliana/i, `Personal name: ${name}`)
  assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|WebSocket/, `Network call: ${name}`)
  const references = [...source.matchAll(/(?:src|href)=["']([^"']+)["']|url\(["']?([^\s)"']+)/g)]
  for (const ref of references) {
    const target = ref[1] ?? ref[2]
    assert.doesNotMatch(target, /^https?:/, `External asset: ${name}: ${target}`)
    if (target.startsWith('#') || target.startsWith('data:')) continue
    assert.ok((await stat(resolve(dirname(path), target.split(/[?#]/)[0]))).isFile(), `Missing ${target} in ${name}`)
  }
}
for (const flow of ['patrimonio-investido', 'cartao', 'transacoes', 'contas']) {
  const html = await readFile(resolve(root, flow, 'index.html'), 'utf8')
  assert.match(html, /presentation.css/)
  assert.match(html, /presentation.js/)
}
assert.equal((await readdir(root)).includes('record.js'), false)
console.log(`PASS: ${Object.keys(snapshot.sha256).length} snapshot files, hashes, local resources, names and network isolation`)
