---
title: "Formulários React com uma API declarativa: quem mantém a abstração?"
emphasis: "quem mantém a abstração?"
description: "Uma API local reduz o wiring nas telas e centraliza tipos, erros e binding. O lab mede o custo dessa escolha em código, execução e manutenção."
number: "002"
slug: 002-form-abstractions-dx
lang: pt-br
date: 2026-09-30
status: review
thesis: "Uma abstração local pode dar aos formulários React uma API declarativa e consistente. Essa DX transfere tipos, binding e convenções das telas para uma infraestrutura mantida pela equipe."
tags: [react, react-hook-form, zod, vue, angularjs, forms, dx]
video: ./assets/reel-002.mp4
poster: ./assets/reel-002-poster.jpg
demo:
  kind: video
evidence:
  - ../evidence/metrics.json
  - ../evidence/react-performance.json
repo: https://github.com/jeandiego/evidence-lab/tree/main/posts/002-form-abstractions-dx
---

React resolve a camada de UI. Para um formulário, sobram decisões que ele não toma: como registrar campos, validar, exibir erros, acompanhar `dirty` e `touched` e transformar os valores antes do envio. Essas decisões ficam na aplicação, em bibliotecas ou em uma abstração interna.

Muitas equipes escolhem a abstração interna: um `useCreateForm` que esconde React Hook Form, Zod e o markup dos campos atrás de uma API curta. Este lab mede o que essa escolha entrega e o que ela custa.

## O experimento

O mesmo formulário de criação de conta foi implementado seis vezes, com o mesmo contrato: cinco campos (`name`, `email`, `role`, `bio`, `terms`), as mesmas regras e mensagens, envio bloqueado quando inválido e normalização de `name` e `bio`.

| # | Estratégia | O que decide o binding e a validação |
|---|---|---|
| 1 | React · abstração com Controller | `useCreateForm` + `Field.*` sobre `useController` |
| 2 | React · abstração uncontrolled | a mesma API pública, sobre `register` |
| 3 | React · RHF + Zod direto | as bibliotecas usadas na própria tela |
| 4 | React · `useState` | a aplicação, sem bibliotecas de formulário |
| 5 | Vue | `v-model` do núcleo; validação na aplicação |
| 6 | AngularJS | `ng-model` e o form controller do framework |

Três coisas foram medidas separadamente: linhas de código por camada, chamadas de render e tempo de CPU no navegador, e tamanho do bundle de produção. Nenhuma delas mede produtividade. Juntas, mostram onde o código fica e quanto ele custa em execução.

## O contrato

As três versões com Zod compartilham o mesmo schema:

```ts title="src/react/schema.ts"
import { z } from 'zod'

export const accountSchema = z.object({
  name: z.string().trim().min(2, 'Use pelo menos 2 caracteres.'),
  email: z.email('Informe um e-mail válido.'),
  role: z.string().min(1, 'Selecione um papel.'),
  bio: z.string().trim().max(120, 'Use no máximo 120 caracteres.'),
  terms: z.boolean().refine(Boolean, 'Aceite os termos.'),
})
```

O `.trim()` faz o valor digitado (`z.input`) ser diferente do valor enviado (`z.output`). A abstração precisa respeitar essa diferença nos tipos.

## A tela, com e sem abstração

Com React Hook Form e Zod direto, a tela conhece `register`, `handleSubmit`, `formState.errors` e o markup de cada campo:

```tsx title="src/react-rhf/App.tsx"
type Input = z.input<typeof accountSchema>
type Output = z.output<typeof accountSchema>

export function App() {
  const [result, setResult] = useState<Output>()
  const { register, handleSubmit, formState: { errors } } = useForm<Input, unknown, Output>({
    defaultValues: { name: '', email: '', role: '', bio: '', terms: false },
    resolver: zodResolver(accountSchema),
  })

  return (
    <form onSubmit={handleSubmit(setResult)} noValidate>
      <label>Nome<input {...register('name')} /></label>
      <p className="error">{errors.name?.message ?? ''}</p>

      <label>E-mail<input {...register('email')} type="email" /></label>
      <p className="error">{errors.email?.message ?? ''}</p>

      <label>
        Papel
        <select {...register('role')}>
          <option value="">Selecione</option>
          <option value="dev">Developer</option>
          <option value="lead">Tech Lead</option>
          <option value="manager">Engineering Manager</option>
        </select>
      </label>
      <p className="error">{errors.role?.message ?? ''}</p>

      <label>Bio<textarea {...register('bio')} /></label>
      <p className="error">{errors.bio?.message ?? ''}</p>

      <label className="check"><input {...register('terms')} type="checkbox" /> Aceito os termos</label>
      <p className="error">{errors.terms?.message ?? ''}</p>

      <button type="submit">Criar conta</button>
    </form>
  )
}
```

Com a abstração, a tela declara os campos:

```tsx title="src/react/App.tsx"
const roles = [
  { value: 'dev', label: 'Developer' },
  { value: 'lead', label: 'Tech Lead' },
  { value: 'manager', label: 'Engineering Manager' },
]

export function App() {
  const [result, setResult] = useState<z.output<typeof accountSchema>>()
  const { Form, Field } = useCreateForm(accountSchema, {
    name: '', email: '', role: '', bio: '', terms: false,
  })

  return (
    <Form onSubmit={setResult}>
      <Field.Text name="name" label="Nome" />
      <Field.Text name="email" label="E-mail" type="email" />
      <Field.Select name="role" label="Papel" options={roles} />
      <Field.Textarea name="bio" label="Bio" />
      <Field.Checkbox name="terms" label="Aceito os termos" />
      <button type="submit">Criar conta</button>
    </Form>
  )
}
```

O `name` tem autocomplete a partir do schema, e um nome inexistente falha na compilação. Label e mensagem de erro seguem o mesmo markup em todas as telas. O `onSubmit` recebe o tipo de saída do schema sem que a tela repita genéricos. Este lab não implementa um contrato completo de acessibilidade para os campos.

As duas versões abstraídas têm exatamente este call site. A diferença entre elas está só na infraestrutura.

## Por dentro da abstração

O núcleo liga Zod, React Hook Form e o contexto do formulário:

```tsx title="src/react/create-form.tsx"
export function useCreateForm<S extends z.ZodType>(schema: S, defaultValues: z.input<S>) {
  type Values = z.input<S> & FieldValues
  type Output = z.output<S> & FieldValues

  const form = useForm<Values, unknown, Output>({
    defaultValues: defaultValues as DefaultValues<Values>,
    resolver: zodResolver(schema as never) as unknown as Resolver<Values, unknown, Output>,
  })

  const Form = ({ onSubmit, children }: { onSubmit: SubmitHandler<Output>; children: ReactNode }) => (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>{children}</form>
    </FormProvider>
  )

  return {
    form,
    Form,
    Field: FieldImpl as {
      Text: (p: TextProps<Values>) => ReactNode
      Select: (p: SelectProps<Values>) => ReactNode
      Textarea: (p: TextareaProps<Values>) => ReactNode
      Checkbox: (p: Common<Values>) => ReactNode
    },
  }
}
```

Os casts de `zodResolver` e de `FieldImpl` produzem a boa experiência de tipos na tela. O TypeScript não prova essas conversões; quem mantém o módulo precisa garantir que estão corretas.

### Variante 1: campos controlados com `useController`

```tsx title="src/react/create-form.tsx"
function useBoundField<T extends FieldValues>(name: FieldPath<T>) {
  const { control } = useFormContext<T>()
  return useController({ control, name })
}

function Text<T extends FieldValues>({ name, label, ...props }: TextProps<T>) {
  const { field, fieldState } = useBoundField<T>(name)
  return (
    <Shell label={label} error={fieldState.error?.message}>
      <input {...props} {...field} value={String(field.value ?? '')} />
    </Shell>
  )
}
```

Cada tecla passa por `field.onChange`, atualiza o valor no RHF e renderiza de novo o wrapper daquele campo. É o protocolo certo para componentes que só funcionam com `value` e `onChange`, como muitos date pickers e comboboxes. Um `<input>` nativo não precisa dele.

### Variante 2: inputs nativos uncontrolled com `register`

```tsx title="src/react-uncontrolled/create-form.tsx"
function useUncontrolledField<T extends FieldValues>(name: FieldPath<T>) {
  const { register, control } = useFormContext<T>()
  const { errors } = useFormState({ control, name, exact: true })
  return {
    registration: register(name),
    error: get(errors, name)?.message as string | undefined,
  }
}

function Text<T extends FieldValues>({ name, label, ...props }: TextProps<T>) {
  const { registration, error } = useUncontrolledField<T>(name)
  return (
    <Shell label={label} error={error}>
      <input {...props} {...registration} />
    </Shell>
  )
}
```

O valor fica no DOM, e o RHF o acompanha por `ref` e eventos. `useFormState` com `exact: true` faz cada wrapper assinar apenas o próprio erro. A tela continua escrevendo `<Field.Text name="email" label="E-mail" />`.

## Resultados: autoria

Linhas não vazias, sem comentários ([`evidence/metrics.json`](../evidence/metrics.json)):

| Estratégia | Tela | Infraestrutura | Schema | Primeiro formulário |
|---|---:|---:|---:|---:|
| Abstração · Controller | 21 | 42 | 8 | **71** |
| Abstração · uncontrolled | 21 | 43 | 8 | **72** |
| RHF + Zod direto | 26 | — | 8 | **34** |
| `useState` | 37 | — | — | **37** |
| Vue | 27 | — | — | **27** |
| AngularJS | 43 | — | — | **43** |

O primeiro formulário abstraído custa o dobro do uso direto. A partir do segundo, cada tela abstraída custa 21 linhas, contra 26 com RHF + Zod direto.

A economia de cinco linhas por formulário é pequena. O possível retorno está no que a contagem não captura: nomes verificados pelo compilador, markup de erro idêntico em todas as telas, um único lugar para evoluir os controles e menos conhecimento de RHF e Zod exigido para o caso comum. O lab demonstra essas propriedades no código, mas não mede quanto elas melhoram a produtividade do time.

## Resultados: execução

As quatro versões React passaram pelo mesmo cenário automatizado no Chrome: preencher `name`, `email` e `bio`, escolher `role`, marcar `terms` e enviar. Uma execução de aquecimento foi descartada e dez foram registradas ([`evidence/react-performance.json`](../evidence/react-performance.json)).

| Estratégia | Chamadas de render | CPU mediana | CPU p95 | Bundle gzip |
|---|---:|---:|---:|---:|
| Abstração · Controller | 73 | 49,523 ms | 53,259 ms | 107.389 B |
| Abstração · uncontrolled | 11 | 33,061 ms | 38,418 ms | 106.257 B |
| RHF + Zod direto | 2 | 32,703 ms | 37,544 ms | 105.541 B |
| `useState` | 63 | 71,190 ms | 89,850 ms | 69.763 B |

Ambiente: Apple M3 Pro, Chrome 143, Node 25.9, React 19.3, React Hook Form 7.89, Zod 4.6.5.

O que os números dizem:

- **Render count sem granularidade engana.** Na variante Controller, 72 das 73 chamadas são de wrappers de campo, e só uma é do `App`. Na versão `useState`, as 63 chamadas renderizam o formulário inteiro. Na uncontrolled, cada um dos cinco wrappers renderiza duas vezes, mais uma vez o `App`, o que dá 11.
- **O binding explica a maior diferença entre as duas abstrações neste cenário.** Com a mesma API pública, trocar `useController` por `register` levou a CPU mediana de 49,5 ms para 33,1 ms, a 0,4 ms do RHF direto.
- **O bundle quase não muda.** A abstração uncontrolled adiciona 716 B gzip sobre RHF direto, e a Controller, 1.848 B.
- **`useState` é o menor e o mais lento.** O bundle fica 35.778 B gzip menor porque dispensa RHF e Zod. Em troca, cada tecla renderiza o componente inteiro, e a CPU mediana é a mais alta.

Esses números provam um custo mensurável neste formulário. Não provam impacto perceptível para o usuário.

## Fora do React

Vue resolve o binding no núcleo. A validação, porém, continua na aplicação:

```vue title="src/vue/App.vue"
<script setup lang="ts">
import { reactive, ref } from 'vue'

type Model = { name: string; email: string; role: string; bio: string; terms: boolean }
const model = reactive<Model>({ name: '', email: '', role: '', bio: '', terms: false })
const errors = reactive<Partial<Record<keyof Model, string>>>({})
const result = ref<Model>()

function submit() {
  errors.name = model.name.trim().length >= 2 ? '' : 'Use pelo menos 2 caracteres.'
  errors.email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(model.email) ? '' : 'Informe um e-mail válido.'
  errors.role = model.role ? '' : 'Selecione um papel.'
  errors.bio = model.bio.trim().length <= 120 ? '' : 'Use no máximo 120 caracteres.'
  errors.terms = model.terms ? '' : 'Aceite os termos.'
  if (!Object.values(errors).some(Boolean)) {
    result.value = { ...model, name: model.name.trim(), bio: model.bio.trim() }
  }
}
</script>

<template>
  <form @submit.prevent="submit" novalidate>
    <label>Nome<input v-model="model.name" /></label>
    <p class="error">{{ errors.name }}</p>
    <!-- email, role, bio e terms seguem o mesmo padrão -->
    <button type="submit">Criar conta</button>
  </form>
</template>
```

AngularJS já traz no framework o binding, a descoberta de campos, a validade e os estados `$dirty` e `$touched`:

```html title="src/angular/template.html"
<form name="accountForm" ng-submit="vm.submit(accountForm)" novalidate>
  <label>Nome<input name="name" ng-model="vm.model.name" required ng-minlength="2" /></label>
  <p class="error" ng-if="accountForm.name.$touched && accountForm.name.$invalid">
    Use pelo menos 2 caracteres.
  </p>

  <label>E-mail<input name="email" type="email" ng-model="vm.model.email" required /></label>
  <p class="error" ng-if="accountForm.email.$touched && accountForm.email.$invalid">
    Informe um e-mail válido.
  </p>
  <!-- role, bio e terms seguem o mesmo padrão -->
  <button type="submit">Criar conta</button>
</form>
```

Isso reduz a montagem no caso básico e amarra a aplicação à semântica do framework. O AngularJS foi descontinuado e aparece aqui só como referência histórica.

A comparação mostra onde cada implementação coloca decisões sobre binding, validação e estado do campo. Em React, a abstração local padroniza uma parte desse trabalho. Isso não equivale à DX de um framework: o experimento cobre somente a autoria de um formulário simples e não avalia convenções de aplicação, roteamento, dados, lifecycle ou tooling.

## O custo de manutenção

Neste formulário, a performance não é um argumento forte contra a abstração. O custo relevante é outro: a equipe passa a manter uma infraestrutura de formulários.

- **Cada controle novo exige suporte.** Date picker, combobox, upload e listas dinâmicas pedem props, binding, `ref`, acessibilidade e uma entrada no namespace `Field`.
- **A segurança de tipos depende de casts.** O consumidor recebe autocomplete, mas a garantia depende de conversões que o compilador não verifica.
- **`name` é seguro; valor e props, não.** `Field.Text name="age"` compila mesmo que `age` seja número.
- **Zod está isolado só na importação.** A API pública depende de `z.input`, `z.output`, transforms e do formato das mensagens. Trocar a biblioteca de validação muda schemas, tipos e testes.
- **A complexidade de domínio vaza.** Campos dependentes, arrays e erros globais (`errors.root`) voltam a exigir `watch`, `setValue` e a API bruta do formulário.

Também não existe um binding único para todos os campos. Inputs nativos podem ser uncontrolled; um componente que só aceita `value` e `onChange` precisa de Controller. Uma extensão da abstração poderia esconder essa decisão da tela:

```tsx
<Field.Text name="email" label="E-mail" />                {/* implementado com register */}
<Field.DatePicker name="birthDate" label="Nascimento" />  {/* extensão hipotética com useController */}
```

Essa é uma razão plausível para centralizar a decisão na camada de campos, pois ela muda por componente. O lab não implementa nem mede o `DatePicker`; o exemplo mostra apenas como a interface poderia crescer.

## Conclusão

O lab demonstra uma API declarativa para um recorte específico: formulários React com campos comuns, schema Zod e estado no React Hook Form. A tela fica menor, tipada e consistente. Com binding uncontrolled, o overhead medido ficou próximo ao uso direto de RHF.

Isso ainda não demonstra uma "DX de framework". A abstração cobre o caminho comum do formulário e deixa casos como arrays, dependências entre campos e erros globais expostos à API bruta. Também não medimos produtividade, tempo de onboarding ou custo de evolução em uma base real.

A troca parece mais defensável quando o vocabulário de campos é estável e se repete em muitas telas. Se cada formulário exige exceções, a interface curta perde utilidade enquanto a equipe continua responsável pela infraestrutura.

## Limitações

- O formulário é pequeno. Não reproduz a acessibilidade nem os controles de um design system de produção.
- A validação em blur e change e os detalhes de `touched` não são idênticos entre as stacks.
- Vue e AngularJS também poderiam receber bibliotecas ou abstrações locais. O lab compara as escolhas feitas, não os limites de cada tecnologia.
- `TaskDuration` é tempo de CPU comparativo do cenário. Não é INP, latência percebida nem tempo exclusivo do React.
- A instrumentação conta chamadas de função de render, não commits do React. O benchmark roda sem `StrictMode`.
- Dez amostras em uma máquina bastam para este contraste local, não para generalizar entre dispositivos e aplicações.
- Linhas de código localizam o custo. Não medem dificuldade de tipos, familiaridade da equipe nem custo de upgrades.

## Reproduza

```bash
git clone https://github.com/jeandiego/evidence-lab.git
cd evidence-lab/posts/002-form-abstractions-dx/lab
npm install
npm run dev              # as seis implementações lado a lado
npm run measure          # regenera evidence/metrics.json
npm run benchmark:react  # regenera evidence/react-performance.json (requer Chrome)
```

A metodologia completa está em [`docs/methodology.md`](../docs/methodology.md), e a análise da abstração, em [`docs/abstraction-analysis.md`](../docs/abstraction-analysis.md).

## Referências

- [React Hook Form: `register`](https://react-hook-form.com/docs/useform/register)
- [React Hook Form: `useController`](https://react-hook-form.com/docs/usecontroller)
- [React Hook Form: `Controller`](https://react-hook-form.com/docs/usecontroller/controller)
- [React Hook Form: `useFormContext`](https://react-hook-form.com/docs/useformcontext)
- [React Hook Form: `useFormState`](https://react-hook-form.com/docs/useformstate)
- [React Hook Form: integração com componentes controlados](https://react-hook-form.com/get-started#IntegratingControlledInputs)
- [React Hook Form Resolvers: Zod](https://github.com/react-hook-form/resolvers#zod)
