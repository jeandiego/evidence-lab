import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'

// Lê apenas post/post.md e post/post.<lang>.md de cada post (docs/conventions.md).
const posts = defineCollection({
  loader: glob({
    pattern: '*/post/post{,.*}.md',
    base: '../posts',
    generateId: ({ entry, data }) => `${entry.split('/')[0]}:${data.lang}`,
  }),
  schema: z.object({
    title: z.string(),
    emphasis: z.string().optional(),
    description: z.string(),
    number: z.string(),
    slug: z.string(),
    lang: z.enum(['pt-br', 'en']),
    date: z.coerce.date(),
    status: z.enum(['draft', 'review', 'published']),
    thesis: z.string(),
    tags: z.array(z.string()).default([]),
    video: z.string().optional(),
    poster: z.string().optional(),
    demo: z.object({ kind: z.enum(['live', 'video', 'terminal', 'none']) }).optional(),
    evidence: z.array(z.string()).default([]),
    repo: z.string().url(),
  }),
})

export const collections = { posts }
