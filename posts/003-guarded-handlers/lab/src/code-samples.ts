export type CodeSample = {
  id: string
  title: string
  filename: string
  description: string
  code: string
}

export const comparisonSamples: CodeSample[] = [
  {
    id: 'guarded',
    title: 'Guard composável',
    filename: 'publish-with-guards.ts',
    description: 'Políticas reutilizáveis; a ação conhece apenas a publicação.',
    code: `const guardedPublish = composeGuards(
  publishArticle,
  [
    requireOnline(),
    requireAuthorPermission(session),
    requireConfirmation({
      title: 'Publicar artigo?',
    }),
  ],
)

const result = await guardedPublish(article)

if (result.status === 'blocked') {
  handleBlock(result)
  return
}

showReceipt(result.value)`,
  },
  {
    id: 'early-return',
    title: 'Tradicional legível',
    filename: 'publish-with-returns.ts',
    description: 'Early returns mantêm o fluxo local claro, mas repetem políticas.',
    code: `async function handlePublish(article: Article) {
  if (!navigator.onLine) {
    handleBlock({
      status: 'blocked',
      guard: 'online',
      reason: 'offline',
    })
    return
  }

  if (!session.canPublish(article)) {
    handleBlock({
      status: 'blocked',
      guard: 'permission',
      reason: 'not-authorized',
    })
    return
  }

  const confirmed = await confirmPublish(article)
  if (!confirmed) {
    handleBlock({
      status: 'blocked',
      guard: 'confirmation',
      reason: 'cancelled',
    })
    return
  }

  const receipt = await publishArticle(article)
  showReceipt(receipt)
}`,
  },
  {
    id: 'monolith',
    title: 'Monolítico direto',
    filename: 'publish-monolith.ts',
    description: 'A ação, as políticas e o feedback ficam presos ao mesmo handler.',
    code: `async function handlePublish(article: Article) {
  if (navigator.onLine) {
    if (session.canPublish(article)) {
      const confirmed = await confirmPublish(article)

      if (confirmed) {
        const receipt = await publishArticle(article)
        showReceipt(receipt)
      } else {
        handleBlock({
          status: 'blocked',
          guard: 'confirmation',
          reason: 'cancelled',
        })
      }
    } else {
      handleBlock({
        status: 'blocked',
        guard: 'permission',
        reason: 'not-authorized',
      })
    }
  } else {
    handleBlock({
      status: 'blocked',
      guard: 'online',
      reason: 'offline',
    })
  }
}`,
  },
]

export const frameworkSamples: CodeSample[] = [
  {
    id: 'react',
    title: 'React',
    filename: 'PublishButton.tsx',
    description: 'O hook recompõe guards que fecham sobre o estado do render atual.',
    code: `function PublishButton({ article }: Props) {
  const { session } = useSession()

  const guards = useMemo(() => [
    requireOnline(),
    requireAuthorPermission(session),
    requireConfirmation({ title: 'Publicar artigo?' }),
  ], [session])

  const publish = useGuardedHandler(
    publishArticle,
    guards,
  )

  const handlePublish = () => {
    void publish(article).catch(reportError)
  }

  return (
    <button onClick={handlePublish}>
      Publicar
    </button>
  )
}`,
  },
  {
    id: 'angular',
    title: 'Angular',
    filename: 'publish-button.component.ts',
    description: 'Signals são lidos pela condição quando o handler é executado.',
    code: `@Component({
  selector: 'publish-button',
  template: '<button (click)="handlePublish()">Publicar</button>',
})
export class PublishButton {
  article = input.required<Article>()
  session = inject(SessionService).session
  private api = inject(ArticlesApi)

  publish = composeGuards(
    (article: Article) => this.api.publish(article),
    [
      requireOnline(),
      createGuard({
        name: 'permission',
        condition: (article) =>
          this.session().canPublish(article),
      }),
      requireConfirmation({ title: 'Publicar artigo?' }),
    ],
  )

  handlePublish() {
    void this.publish(this.article()).catch(reportError)
  }
}`,
  },
  {
    id: 'vue',
    title: 'Vue',
    filename: 'PublishButton.vue',
    description: 'Refs do setup são consultadas pela mesma composição TypeScript.',
    code: `<script setup lang="ts">
const props = defineProps<{ article: Article }>()
const session = useSession()

const publish = composeGuards(
  publishArticle,
  [
    requireOnline(),
    createGuard<[Article]>({
      name: 'permission',
      condition: (article) =>
        session.value.canPublish(article),
    }),
    requireConfirmation({ title: 'Publicar artigo?' }),
  ],
)

function handlePublish() {
  void publish(props.article).catch(reportError)
}
</script>

<template>
  <button @click="handlePublish">Publicar</button>
</template>`,
  },
]
