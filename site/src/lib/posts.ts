import { getCollection, type CollectionEntry } from 'astro:content'
import { DEFAULT_LANG, LANGS, type Lang } from './i18n'
import { REPO_BRANCH, REPO_URL } from './repo'
import { url } from './url'

export type Post = CollectionEntry<'posts'>

// Assets dos posts (vídeo, poster) entram no build com hash, sem copiar arquivos.
const assets = import.meta.glob<string>('../../../posts/*/post/assets/*.{mp4,webm,jpg,jpeg,png,webp}', {
  query: '?url',
  import: 'default',
  eager: true,
})

const folderOf = (post: Post) => post.id.split(':')[0]

export function assetUrl(post: Post, relative?: string) {
  if (!relative) return undefined
  const key = `../../../posts/${folderOf(post)}/post/${relative.replace(/^\.\//, '')}`
  return assets[key]
}

export const evidenceUrl = (post: Post, relative: string) =>
  `${REPO_URL}/blob/${REPO_BRANCH}/posts/${folderOf(post)}/${relative.replace(/^\.\.\//, '')}`

const visible = (post: Post) => post.data.status !== 'draft'

export async function allPosts() {
  const posts = await getCollection('posts', visible)
  return posts.sort((a, b) => b.data.number.localeCompare(a.data.number))
}

/** Posts listados num idioma: a tradução quando existe, senão o original. */
export async function postsFor(lang: Lang) {
  const posts = await allPosts()
  const bySlug = new Map<string, Post>()
  for (const post of posts) {
    const current = bySlug.get(post.data.slug)
    if (post.data.lang === lang || (!current && post.data.lang === DEFAULT_LANG)) bySlug.set(post.data.slug, post)
  }
  return [...bySlug.values()].sort((a, b) => b.data.number.localeCompare(a.data.number))
}

export async function translationsOf(slug: string) {
  const posts = await allPosts()
  return LANGS.filter(lang => posts.some(p => p.data.slug === slug && p.data.lang === lang))
}

export function readingMinutes(post: Post) {
  const words = (post.body ?? '').split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 220))
}

export const postPath = (lang: Lang, slug: string) => url(`${lang}/${slug}`)
