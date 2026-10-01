import rss from '@astrojs/rss'
import type { APIContext } from 'astro'
import { LANGS, t, type Lang } from '../../lib/i18n'
import { postPath, postsFor } from '../../lib/posts'

export function getStaticPaths() {
  return LANGS.map(lang => ({ params: { lang } }))
}

export async function GET(context: APIContext) {
  const lang = context.params.lang as Lang
  const posts = await postsFor(lang)
  return rss({
    title: 'Evidence Lab · Synko',
    description: t(lang).siteDescription,
    site: context.site!,
    items: posts.map(post => ({
      title: `Nº ${post.data.number} · ${post.data.title}`,
      description: post.data.description,
      pubDate: post.data.date,
      link: postPath(post.data.lang as Lang, post.data.slug),
      categories: post.data.tags,
    })),
    customData: `<language>${lang === 'en' ? 'en-us' : 'pt-br'}</language>`,
  })
}
