import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import process from 'node:process'

const root = resolve(import.meta.dirname, '..')
const groups = {
  reactAbstractedConsumer: ['src/react/App.tsx'],
  reactAbstractedInfrastructure: ['src/react/create-form.tsx'],
  reactUncontrolledConsumer: ['src/react-uncontrolled/App.tsx'],
  reactUncontrolledInfrastructure: ['src/react-uncontrolled/create-form.tsx'],
  validationSchema: ['src/react/schema.ts'],
  reactRHFZodConsumer: ['src/react-rhf/App.tsx'],
  reactUseStateConsumerAndValidation: ['src/react-state/App.tsx'],
  vueConsumerAndValidation: ['src/vue/App.vue'],
  angularConsumerAndValidation: ['src/angular/template.html', 'src/angular/main.ts'],
}

function sourceLines(text) {
  return text.split('\n').filter(line => {
    const value = line.trim()
    return value && !value.startsWith('//') && !value.startsWith('<!--') && !value.includes('markRender')
  }).length
}

const metrics = { generatedAt: new Date().toISOString(), environment: { node: process.version, platform: process.platform, arch: process.arch }, groups: {} }
for (const [name, files] of Object.entries(groups)) {
  const counts = {}
  for (const file of files) counts[file] = sourceLines(await readFile(resolve(root, file), 'utf8'))
  metrics.groups[name] = { files: counts, total: Object.values(counts).reduce((sum, value) => sum + value, 0) }
}

const target = resolve(root, '../evidence/metrics.json')
await mkdir(dirname(target), { recursive: true })
await writeFile(target, JSON.stringify(metrics, null, 2) + '\n')
console.log(JSON.stringify(metrics, null, 2))
