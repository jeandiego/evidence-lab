import { composeGuards, createGuard, type GuardedResult } from './guards'

type Item = { id: string; ownerId: string }

type Dependencies = {
  currentUserId: string
  isOnline: () => boolean
  confirmDeletion: (item: Item) => Promise<boolean>
  showMessage: (message: string) => void
  deleteItem: (item: Item) => Promise<{ deletedId: string }>
}

export function createDirectDelete(dependencies: Dependencies) {
  return async (item: Item): Promise<{ deletedId: string } | undefined> => {
    if (!dependencies.isOnline()) {
      dependencies.showMessage('Sem conexão')
      return
    }

    if (item.ownerId !== dependencies.currentUserId) {
      dependencies.showMessage('Sem permissão')
      return
    }

    if (!(await dependencies.confirmDeletion(item))) {
      return
    }

    return dependencies.deleteItem(item)
  }
}

export function createGuardedDelete(
  dependencies: Dependencies,
): (item: Item) => Promise<GuardedResult<{ deletedId: string }>> {
  return composeGuards(dependencies.deleteItem, [
    createGuard<[Item]>({
      name: 'online',
      condition: dependencies.isOnline,
      onBlocked: () => dependencies.showMessage('Sem conexão'),
    }),
    createGuard<[Item]>({
      name: 'permission',
      condition: (item) =>
        item.ownerId === dependencies.currentUserId
          ? true
          : { allow: false, reason: 'not-owner' },
      onBlocked: () => dependencies.showMessage('Sem permissão'),
    }),
    createGuard<[Item]>({
      name: 'confirmation',
      condition: dependencies.confirmDeletion,
    }),
  ])
}
