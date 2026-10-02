import { composeGuards, createGuard, type GuardedResult } from './guards'

type Article = {
  id: string
  authorId: string
}

type PublishReceipt = {
  articleId: string
  publishedAt: string
}

type Dependencies = {
  currentUserId: string
  publish: (article: Article) => Promise<PublishReceipt>
  trackBlock: (guard: string, reason?: unknown) => void
}

export function createPublishArticle(dependencies: Dependencies) {
  return composeGuards(dependencies.publish, [
    createGuard<[Article]>({
      name: 'permission',
      condition: (article) =>
        article.authorId === dependencies.currentUserId
          ? true
          : { allow: false, reason: 'not-author' },
    }),
  ])
}

// Caso 1: um evento de UI não precisa consumir o resultado.
export function publishFromClick(
  publishArticle: ReturnType<typeof createPublishArticle>,
  article: Article,
  reportError: (error: unknown) => void,
) {
  return () => {
    void publishArticle(article).catch(reportError)
  }
}

// Caso 2: um fluxo programático usa o valor retornado pela ação.
export async function publishAndReadReceipt(
  publishArticle: ReturnType<typeof createPublishArticle>,
  article: Article,
): Promise<string | undefined> {
  const result = await publishArticle(article)

  if (result.status === 'blocked') {
    return undefined
  }

  return result.value.publishedAt
}

// Caso 3: telemetria pode observar qual política bloqueou a ação.
export async function publishWithBlockTracking(
  publishArticle: ReturnType<typeof createPublishArticle>,
  article: Article,
  trackBlock: Dependencies['trackBlock'],
): Promise<GuardedResult<PublishReceipt>> {
  const result = await publishArticle(article)

  if (result.status === 'blocked') {
    trackBlock(result.guard, result.reason)
  }

  return result
}
