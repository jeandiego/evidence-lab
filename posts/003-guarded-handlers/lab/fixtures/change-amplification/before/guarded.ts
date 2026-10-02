import { composeGuards, createGuard, type Guard } from '../guards'
import type { ActionHandlers, Article, ArticleAction, Dependencies } from './domain'

type Args = [article: Article]

function policy(
  deps: Dependencies,
  name: string,
  condition: (article: Article) => boolean,
): Guard<Args> {
  return createGuard<Args>({
    name,
    condition,
    onBlocked: () => deps.recordBlocked(name),
  })
}

export function createGuardedHandlers(deps: Dependencies): ActionHandlers {
  const online = policy(deps, 'online', deps.isOnline)
  const permission = (action: ArticleAction) =>
    policy(deps, 'permission', (article) => deps.canPerform(action, article))
  const content = policy(deps, 'content', deps.isContentValid)
  const confirmation = (action: ArticleAction) =>
    policy(deps, 'confirmation', (article) => deps.isConfirmed(action, article))
  const execute = (action: ArticleAction) => (article: Article) => deps.execute(action, article)

  return {
    publish: composeGuards(execute('publish'), [
      online,
      permission('publish'),
      content,
      confirmation('publish'),
    ]),
    archive: composeGuards(execute('archive'), [online, permission('archive')]),
    delete: composeGuards(execute('delete'), [
      online,
      permission('delete'),
      confirmation('delete'),
    ]),
  }
}
