import type { GuardedResult } from '../guards'

export type ArticleAction = 'publish' | 'archive' | 'delete'

export type Article = {
  id: string
  title: string
}

export type Receipt = {
  action: ArticleAction
  articleId: string
}

export type Scenario = {
  online: boolean
  authorized: boolean
  confirmed: boolean
  contentValid: boolean
  actionFails?: boolean
}

export type TraceEvent =
  | `check:${'online' | 'permission' | 'content' | 'confirmation'}`
  | `blocked:${string}`
  | `execute:${ArticleAction}`

export type Dependencies = {
  trace: TraceEvent[]
  isOnline: () => boolean
  canPerform: (action: ArticleAction, article: Article) => boolean
  isContentValid: (article: Article) => boolean
  isConfirmed: (action: ArticleAction, article: Article) => boolean
  recordBlocked: (guard: string) => void
  execute: (action: ArticleAction, article: Article) => Receipt
}

export type ActionHandlers = Record<
  ArticleAction,
  (article: Article) => Promise<GuardedResult<Receipt>>
>

export const article: Article = { id: 'article-003', title: 'Guards no frontend' }

export function createDependencies(scenario: Scenario): Dependencies {
  const trace: TraceEvent[] = []

  return {
    trace,
    isOnline: () => {
      trace.push('check:online')
      return scenario.online
    },
    canPerform: () => {
      trace.push('check:permission')
      return scenario.authorized
    },
    isContentValid: () => {
      trace.push('check:content')
      return scenario.contentValid
    },
    isConfirmed: () => {
      trace.push('check:confirmation')
      return scenario.confirmed
    },
    recordBlocked: (guard) => trace.push(`blocked:${guard}`),
    execute: (action, currentArticle) => {
      trace.push(`execute:${action}`)

      if (scenario.actionFails) {
        throw new Error('action failed')
      }

      return { action, articleId: currentArticle.id }
    },
  }
}

export const scenarios = {
  success: { online: true, authorized: true, confirmed: true, contentValid: true },
  offline: { online: false, authorized: true, confirmed: true, contentValid: true },
  unauthorized: { online: true, authorized: false, confirmed: true, contentValid: true },
  unconfirmed: { online: true, authorized: true, confirmed: false, contentValid: true },
  invalidContent: { online: true, authorized: true, confirmed: true, contentValid: false },
  actionError: {
    online: true,
    authorized: true,
    confirmed: true,
    contentValid: true,
    actionFails: true,
  },
} satisfies Record<string, Scenario>
