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
  fs.readFile(path.resolve('node_modules/@fontsource/instrument-sans/files', `instrument-sans-latin-${weight}-normal.woff`))

const INK = '#141518'
// Símbolo Synko: dois quadrados que se tocam num único ponto (brand §3.2).
const square = (left: number, top: number) => h('div', { position: 'absolute', left, top, width: 13, height: 13, background: INK })

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
    text.split(/\s+/).filter(Boolean).map(word => h('span', { marginRight: 14, color: em ? '#b5653a' : INK }, word)),
  )

  const tree = h(
    'div',
    { width: 1200, height: 630, display: 'flex', background: '#f3f0e9', padding: '64px 72px', fontFamily: 'Instrument Sans' },
    [
      h('div', { display: 'flex', flexDirection: 'column', flex: 1, paddingRight: posterData ? 56 : 0 }, [
        h('div', { display: 'flex', color: '#66655f', fontSize: 24, fontWeight: 500, letterSpacing: 2 }, `Nº ${number}`),
        h('div', { display: 'flex', flexWrap: 'wrap', marginTop: 28, color: INK, fontSize: 60, fontWeight: 500, lineHeight: 1.06, letterSpacing: -1.5 }, titleParts),
        h('div', { display: 'flex', alignItems: 'center', marginTop: 'auto', color: '#66655f', fontSize: 22, fontWeight: 400 }, [
          h('div', { display: 'flex', position: 'relative', width: 26, height: 26, marginRight: 16 }, [square(0, 13), square(13, 0)]),
          'Synko Lab · lab.synko.digital',
        ]),
      ]),
      posterData
        ? h('img', { width: 402, height: 502, objectFit: 'cover' }, undefined)
        : null,
    ].filter(Boolean),
  )
  if (posterData) (tree.props.children as any[])[1].props.src = posterData

  const svg = await satori(tree as any, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Instrument Sans', data: await fontFile(400), weight: 400, style: 'normal' },
      { name: 'Instrument Sans', data: await fontFile(500), weight: 500, style: 'normal' },
    ],
  })
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng()
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } })
}
