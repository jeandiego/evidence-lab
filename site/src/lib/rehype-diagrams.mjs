import fs from 'node:fs'
import path from 'node:path'
import { fromHtml } from 'hast-util-from-html'
import { visit } from 'unist-util-visit'

// ![alt](./assets/x.svg "Legenda") sozinho num parágrafo vira <figure class="diagram">, com o SVG inline.
// Inline porque o SVG usa as variáveis do tema do site (--paper, --ink...): um <img> não enxerga o data-theme
// do cabeçalho. A legenda vem do título da imagem. O SVG rola dentro do contêiner, nunca a página.
export function rehypeDiagrams() {
  return (tree, file) => {
    const filePath = file.path ?? file.history?.[0]
    if (!filePath) return
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'p' || !parent || index === undefined || node.children.length !== 1) return
      const img = node.children[0]
      if (img.type !== 'element' || img.tagName !== 'img') return
      const src = img.properties?.src
      if (typeof src !== 'string' || !src.endsWith('.svg') || /^([a-z]+:|\/)/i.test(src)) return
      const markup = fs.readFileSync(path.resolve(path.dirname(filePath), src), 'utf8')
      const svg = fromHtml(markup, { fragment: true })
      const caption = img.properties?.title
      parent.children[index] = {
        type: 'element',
        tagName: 'figure',
        properties: { className: ['diagram'] },
        children: [
          {
            type: 'element',
            tagName: 'div',
            properties: { className: ['diagram-scroll'], tabIndex: 0, role: 'region', ariaLabel: img.properties?.alt ?? '' },
            children: svg.children,
          },
          ...(caption ? [{ type: 'element', tagName: 'figcaption', properties: {}, children: [{ type: 'text', value: String(caption) }] }] : []),
        ],
      }
    })
  }
}
