import fs from 'node:fs/promises'
import path from 'node:path'
import { Resvg } from '@resvg/resvg-js'
import type { APIContext } from 'astro'
import satori from 'satori'
import { allPosts, type Post } from '../../../lib/posts'

// Card 1200×630 gerado no build: número da edição, título e o poster do vídeo.
export async function getStaticPaths() {
  const posts = await allPosts()
  return posts.map(post => ({ params: { lang: post.data.lang, slug: post.data.slug }, props: { post } }))
}

const fontFile = (weight: number) =>
  fs.readFile(path.resolve('node_modules/@fontsource/figtree/files', `figtree-latin-${weight}-normal.woff`))

const h = (type: string, style: Record<string, unknown>, children?: unknown) => ({ type, props: { style, children } })

export async function GET({ props }: APIContext) {
  const { post } = props as { post: Post }
  const { title, emphasis, number, poster } = post.data
  const folder = post.id.split(':')[0]

  let posterData: string | undefined
  if (poster) {
    const file = path.resolve('../posts', folder, 'post', poster)
    posterData = `data:image/jpeg;base64,${(await fs.readFile(file)).toString('base64')}`
  }

  // Satori não faz texto inline misto: cada palavra vira um item flex.
  const cut = emphasis ? title.indexOf(emphasis) : -1
  const segments: [string, boolean][] =
    cut >= 0 && emphasis
      ? [[title.slice(0, cut), false], [emphasis, true], [title.slice(cut + emphasis.length), false]]
      : [[title, false]]
  const titleParts = segments.flatMap(([text, em]) =>
    text.split(/\s+/).filter(Boolean).map(word => h('span', { marginRight: 14, color: em ? '#6f2f3a' : '#1e1b18' }, word)),
  )

  const tree = h(
    'div',
    { width: 1200, height: 630, display: 'flex', background: '#fdfcfc', padding: '64px 72px', fontFamily: 'Figtree' },
    [
      h('div', { display: 'flex', flexDirection: 'column', flex: 1, paddingRight: posterData ? 56 : 0 }, [
        h('div', { display: 'flex', alignItems: 'flex-start', color: '#1e1b18', fontSize: 150, fontWeight: 300, lineHeight: 0.8, letterSpacing: -6 }, [
          h('span', { color: '#6f2f3a', fontSize: 22, fontWeight: 500, marginTop: 14, marginRight: 8, letterSpacing: 1 }, 'Nº'),
          number,
        ]),
        h('div', { display: 'flex', flexWrap: 'wrap', marginTop: 36, color: '#1e1b18', fontSize: 54, fontWeight: 300, lineHeight: 1.06, letterSpacing: -1.5 }, titleParts),
        h('div', { display: 'flex', alignItems: 'center', marginTop: 'auto', color: '#6f6962', fontSize: 22, fontWeight: 500 }, [
          h('div', { width: 12, height: 12, borderRadius: 6, background: '#d48a46', marginRight: 14 }),
          'Evidence Lab · lab.synko.digital',
        ]),
      ]),
      posterData
        ? h('img', { width: 402, height: 502, objectFit: 'cover', borderRadius: 14, border: '1px solid #ebe8e4' }, undefined)
        : null,
    ].filter(Boolean),
  )
  if (posterData) (tree.props.children as any[])[1].props.src = posterData

  const svg = await satori(tree as any, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Figtree', data: await fontFile(300), weight: 300, style: 'normal' },
      { name: 'Figtree', data: await fontFile(500), weight: 500, style: 'normal' },
    ],
  })
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng()
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } })
}
