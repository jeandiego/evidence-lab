// URLs internas no padrão do Cloudflare Pages: páginas com barra final, arquivos sem.
export const url = (path = '') => {
  const clean = path.replace(/^\/+|\/+$/g, '')
  if (!clean) return '/'
  return /\.[a-z0-9]+$/i.test(clean) ? `/${clean}` : `/${clean}/`
}
