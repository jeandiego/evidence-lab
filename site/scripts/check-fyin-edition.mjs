import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const dist = resolve(dirname(fileURLToPath(import.meta.url)), '../dist')
const read = path => readFile(resolve(dist, path), 'utf8')
const article = await read('pt-br/fyin/index.html')
assert.match(article, /Edição Nº 008/)
assert.match(article, /rel="canonical" href="https:\/\/lab.synko.digital\/pt-br\/fyin\/"/)
assert.match(article, /og\/pt-br\/fyin.png/)
assert.match(article, /não comprovam que todas essas funcionalidades estejam implementadas/)
assert.equal((article.match(/<iframe\b/g) ?? []).length, 1)
assert.match(article, /href="#explore-title"/)
assert.match(article, /href="\/pt-br\/005-fetch-interceptor-tradeoffs\/"/)
for (const lang of ['pt-br', 'en']) {
  assert.match(await read(`${lang}/index.html`), /href="\/pt-br\/fyin\/"/)
  assert.match(await read(`${lang}/rss.xml`), /https:\/\/lab.synko.digital\/pt-br\/fyin\//)
}
const previous = await read('pt-br/005-fetch-interceptor-tradeoffs/index.html')
assert.match(previous, /href="\/pt-br\/fyin\/"/)
assert.doesNotMatch(previous, /id="fyin-demo"/)
assert.match(await read('lab/fyin/index.html'), /http-equiv="refresh"[^>]+\/pt-br\/fyin\//)
assert.match(await read('_redirects'), /\/lab\/fyin\/ \/pt-br\/fyin\/ 301/)
const sitemap = await read('sitemap-0.xml')
assert.match(sitemap, /https:\/\/lab.synko.digital\/pt-br\/fyin\//)
assert.doesNotMatch(sitemap, /https:\/\/lab.synko.digital\/lab\/fyin/)
const og = await readFile(resolve(dist, 'og/pt-br/fyin.png'))
assert.equal(og.subarray(1, 4).toString(), 'PNG')
console.log('PASS: official issue, canonical, metadata, TOC, index PT/EN, RSS PT/EN, navigation, redirect, sitemap and OG')
