import { visit } from 'unist-util-visit'

// Tabelas largas rolam dentro de um contêiner, nunca a página.
export function rehypeTables() {
  return tree => {
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'table' || !parent || index === undefined) return
      if (parent.type === 'element' && parent.properties?.className?.includes?.('table-scroll')) return
      parent.children[index] = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['table-scroll'], tabIndex: 0, role: 'region' },
        children: [node],
      }
    })
  }
}
