import type { GuardedResult } from '../guards'
import type { ActionHandlers, Article, ArticleAction, Dependencies, Receipt } from './domain'

function blocked(deps: Dependencies, guard: string): GuardedResult<Receipt> {
  deps.recordBlocked(guard)
  return { status: 'blocked', guard }
}

function executed(deps: Dependencies, action: ArticleAction, article: Article): GuardedResult<Receipt> {
  return { status: 'executed', value: deps.execute(action, article) }
}

export function createEarlyReturnHandlers(deps: Dependencies): ActionHandlers {
  return {
    publish: async (article) => {
      if (!deps.isOnline()) return blocked(deps, 'online')
      if (!deps.canPerform('publish', article)) return blocked(deps, 'permission')
      if (!deps.isContentValid(article)) return blocked(deps, 'content')
      if (!deps.isConfirmed('publish', article)) return blocked(deps, 'confirmation')
      return executed(deps, 'publish', article)
    },
    archive: async (article) => {
      if (!deps.isOnline()) return blocked(deps, 'online')
      if (!deps.canPerform('archive', article)) return blocked(deps, 'permission')
      return executed(deps, 'archive', article)
    },
    delete: async (article) => {
      if (!deps.isOnline()) return blocked(deps, 'online')
      if (!deps.canPerform('delete', article)) return blocked(deps, 'permission')
      if (!deps.isConfirmed('delete', article)) return blocked(deps, 'confirmation')
      return executed(deps, 'delete', article)
    },
  }
}
