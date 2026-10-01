import path from 'node:path'
import { visit } from 'unist-util-visit'

const REPO = 'https://github.com/jeandiego/evidence-lab'
const BRANCH = 'main'

// Links relativos do post (../evidence/x.json, ../docs/y.md) apontam para a
// pasta do post no repositório. No site, viram URLs do GitHub.
export function rehypeRepoLinks() {
  return (tree, file) => {
    const filePath = file.path ?? file.history?.[0]
    if (!filePath) return
    const repoRoot = path.resolve(path.dirname(filePath), '../../..')
    visit(tree, 'element', node => {
      if (node.tagName !== 'a') return
      const href = node.properties?.href
      if (typeof href !== 'string' || /^([a-z]+:|#|\/)/i.test(href)) return
      const target = path.resolve(path.dirname(filePath), href)
      const rel = path.relative(repoRoot, target).split(path.sep).join('/')
      if (rel.startsWith('..')) return
      const kind = path.extname(rel) ? 'blob' : 'tree'
      node.properties.href = `${REPO}/${kind}/${BRANCH}/${rel}`
      node.properties.dataRepo = ''
    })
  }
}
