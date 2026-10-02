import { createDependencies, article, scenarios, type ArticleAction } from './domain'
import { createEarlyReturnHandlers } from './early-return'
import { createGuardedHandlers } from './guarded'
import { createMonolithicHandlers } from './monolithic'

const factories = {
  guarded: createGuardedHandlers,
  earlyReturn: createEarlyReturnHandlers,
  monolithic: createMonolithicHandlers,
}

const applicableScenarios: Record<ArticleAction, (keyof typeof scenarios)[]> = {
  publish: ['success', 'offline', 'editorialLocked', 'unauthorized', 'invalidContent', 'unconfirmed', 'actionError'],
  archive: ['success', 'offline', 'editorialLocked', 'unauthorized', 'actionError'],
  delete: ['success', 'offline', 'editorialLocked', 'unauthorized', 'unconfirmed', 'actionError'],
}

describe('benchmark variants', () => {
  it.each(Object.entries(factories))(
    'short-circuits editorial-lock before permission in %s',
    async (_variant, factory) => {
      const deps = createDependencies(scenarios.editorialLocked)

      await expect(factory(deps).publish(article)).resolves.toEqual({
        status: 'blocked',
        guard: 'editorial-lock',
      })
      expect(deps.trace).toEqual([
        'check:online',
        'check:editorial-lock',
        'blocked:editorial-lock',
      ])
    },
  )

  it.each(Object.entries(applicableScenarios))(
    'preserves result, trace and errors for %s',
    async (actionName, scenarioNames) => {
      const action = actionName as ArticleAction

      for (const scenarioName of scenarioNames) {
        const observations = await Promise.all(
          Object.entries(factories).map(async ([variant, factory]) => {
            const deps = createDependencies(scenarios[scenarioName])

            try {
              const result = await factory(deps)[action](article)
              return { variant, result, trace: deps.trace, error: null }
            } catch (error) {
              return {
                variant,
                result: null,
                trace: deps.trace,
                error: error instanceof Error ? error.message : String(error),
              }
            }
          }),
        )

        const [, ...comparisons] = observations
        for (const observation of comparisons) {
          expect(observation, `${action}/${scenarioName}/${observation.variant}`).toEqual({
            ...observations[0],
            variant: observation.variant,
          })
        }
      }
    },
  )
})
