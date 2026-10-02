import type { ActionHandlers, Dependencies } from './domain'

export function createMonolithicHandlers(deps: Dependencies): ActionHandlers {
  return {
    publish: async (article) => {
      if (deps.isOnline()) {
        if (!deps.isEditorialLocked(article)) {
          if (deps.canPerform('publish', article)) {
            if (deps.isContentValid(article)) {
              if (deps.isConfirmed('publish', article)) {
                return { status: 'executed', value: deps.execute('publish', article) }
              }
              deps.recordBlocked('confirmation')
              return { status: 'blocked', guard: 'confirmation' }
            }
            deps.recordBlocked('content')
            return { status: 'blocked', guard: 'content' }
          }
          deps.recordBlocked('permission')
          return { status: 'blocked', guard: 'permission' }
        }
        deps.recordBlocked('editorial-lock')
        return { status: 'blocked', guard: 'editorial-lock' }
      }
      deps.recordBlocked('online')
      return { status: 'blocked', guard: 'online' }
    },
    archive: async (article) => {
      if (deps.isOnline()) {
        if (!deps.isEditorialLocked(article)) {
          if (deps.canPerform('archive', article)) {
            return { status: 'executed', value: deps.execute('archive', article) }
          }
          deps.recordBlocked('permission')
          return { status: 'blocked', guard: 'permission' }
        }
        deps.recordBlocked('editorial-lock')
        return { status: 'blocked', guard: 'editorial-lock' }
      }
      deps.recordBlocked('online')
      return { status: 'blocked', guard: 'online' }
    },
    delete: async (article) => {
      if (deps.isOnline()) {
        if (!deps.isEditorialLocked(article)) {
          if (deps.canPerform('delete', article)) {
            if (deps.isConfirmed('delete', article)) {
              return { status: 'executed', value: deps.execute('delete', article) }
            }
            deps.recordBlocked('confirmation')
            return { status: 'blocked', guard: 'confirmation' }
          }
          deps.recordBlocked('permission')
          return { status: 'blocked', guard: 'permission' }
        }
        deps.recordBlocked('editorial-lock')
        return { status: 'blocked', guard: 'editorial-lock' }
      }
      deps.recordBlocked('online')
      return { status: 'blocked', guard: 'online' }
    },
  }
}
