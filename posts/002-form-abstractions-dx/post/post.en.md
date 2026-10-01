---
title: "A declarative API for React forms: who maintains the abstraction?"
emphasis: "who maintains the abstraction?"
description: "A local API removes wiring from screens and centralizes types, errors and binding. The lab measures what that choice costs in code, runtime and maintenance."
number: "002"
slug: 002-form-abstractions-dx
lang: en
date: 2026-09-30
status: review
thesis: "A local abstraction can give React forms a consistent, declarative API. That DX moves types, binding and conventions from screens into infrastructure the team has to maintain."
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

React solves the UI layer. A form still needs decisions React does not make: how to register fields, validate, show errors, track `dirty` and `touched`, and transform values before submitting. Those decisions end up in the application, in libraries, or in an internal abstraction.

Many teams pick the internal abstraction: a `useCreateForm` that hides React Hook Form, Zod and the field markup behind a short API. This lab measures what that choice delivers and what it costs.

## The experiment

The same sign-up form was built six times against one contract: five fields (`name`, `email`, `role`, `bio`, `terms`), the same rules and messages, submission blocked while invalid, and `name` and `bio` normalized on submit.

| # | Strategy | What decides binding and validation |
|---|---|---|
| 1 | React · abstraction with Controller | `useCreateForm` + `Field.*` on top of `useController` |
| 2 | React · uncontrolled abstraction | the same public API, on top of `register` |
| 3 | React · RHF + Zod directly | the libraries used in the screen itself |
| 4 | React · `useState` | the application, with no form libraries |
| 5 | Vue | core `v-model`; validation in the application |
| 6 | AngularJS | `ng-model` and the framework's form controller |

Three things were measured separately: lines of code per layer, render calls and CPU time in the browser, and production bundle size. None of them measures productivity. Together, they show where the code lives and what it costs at runtime.

The code below is the lab's actual source, so validation messages and labels stay in Portuguese.

## The contract

The three Zod versions share the same schema:

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

`.trim()` makes the typed value (`z.input`) differ from the submitted value (`z.output`). The abstraction has to respect that difference in its types.

## The screen, with and without the abstraction

With React Hook Form and Zod used directly, the screen knows about `register`, `handleSubmit`, `formState.errors` and every field's markup:

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

With the abstraction, the screen declares the fields:

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

`name` autocompletes from the schema, and a field that does not exist fails to compile. Labels and error messages use the same markup on every screen. `onSubmit` receives the schema's output type without the screen repeating generics. This lab does not implement a complete accessibility contract for its fields.

Both abstracted versions have exactly this call site. The only difference between them is in the infrastructure.

## Inside the abstraction

The core wires Zod, React Hook Form and the form context together:

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

The casts on `zodResolver` and `FieldImpl` are what produce the good type experience in the screen. TypeScript does not prove those conversions; whoever maintains the module has to keep them correct.

### Variant 1: controlled fields with `useController`

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

Every keystroke goes through `field.onChange`, updates the value in RHF and re-renders that field's wrapper. It is the right protocol for components that only work with `value` and `onChange`, such as many date pickers and comboboxes. A native `<input>` does not need it.

### Variant 2: uncontrolled native inputs with `register`

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

The value stays in the DOM, and RHF tracks it through `ref` and events. `useFormState` with `exact: true` makes each wrapper subscribe only to its own error. The screen still writes `<Field.Text name="email" label="E-mail" />`.

## Results: authoring

Non-empty lines, comments excluded ([`evidence/metrics.json`](../evidence/metrics.json)):

| Strategy | Screen | Infrastructure | Schema | First form |
|---|---:|---:|---:|---:|
| Abstraction · Controller | 21 | 42 | 8 | **71** |
| Abstraction · uncontrolled | 21 | 43 | 8 | **72** |
| RHF + Zod directly | 26 | — | 8 | **34** |
| `useState` | 37 | — | — | **37** |
| Vue | 27 | — | — | **27** |
| AngularJS | 43 | — | — | **43** |

The first abstracted form costs twice as much as direct use. From the second one on, each abstracted screen costs 21 lines, against 26 with RHF + Zod directly.

Five lines per form is a small saving. The possible return lies in what the count does not capture: names checked by the compiler, identical error markup on every screen, a single place to evolve the controls, and less RHF and Zod knowledge needed for the common case. The lab demonstrates those properties in code, but it does not measure how much they improve team productivity.

## Results: runtime

The four React versions ran the same automated scenario in Chrome: fill in `name`, `email` and `bio`, pick `role`, check `terms` and submit. One warm-up run was discarded and ten were recorded ([`evidence/react-performance.json`](../evidence/react-performance.json)).

| Strategy | Render calls | Median CPU | p95 CPU | Bundle gzip |
|---|---:|---:|---:|---:|
| Abstraction · Controller | 73 | 49.523 ms | 53.259 ms | 107,389 B |
| Abstraction · uncontrolled | 11 | 33.061 ms | 38.418 ms | 106,257 B |
| RHF + Zod directly | 2 | 32.703 ms | 37.544 ms | 105,541 B |
| `useState` | 63 | 71.190 ms | 89.850 ms | 69,763 B |

Environment: Apple M3 Pro, Chrome 143, Node 25.9, React 19.3, React Hook Form 7.89, Zod 4.6.5.

What the numbers say:

- **Render counts without granularity mislead.** In the Controller variant, 72 of the 73 calls come from field wrappers and only one from `App`. In the `useState` version, all 63 calls render the whole form. In the uncontrolled variant, each of the five wrappers renders twice, plus `App` once, for 11.
- **Binding explains most of the difference between the two abstractions in this scenario.** With the same public API, swapping `useController` for `register` took median CPU from 49.5 ms to 33.1 ms, 0.4 ms away from direct RHF.
- **The bundle barely moves.** The uncontrolled abstraction adds 716 B gzip over direct RHF, and the Controller one adds 1,848 B.
- **`useState` is the smallest and the slowest.** Its bundle is 35,778 B gzip smaller because it skips RHF and Zod. In exchange, every keystroke renders the whole component, and its median CPU is the highest.

These numbers show a measurable cost on this form. They do not show an impact users would notice.

## Outside React

Vue handles binding in its core. Validation, however, stays in the application:

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
    <!-- email, role, bio and terms follow the same pattern -->
    <button type="submit">Criar conta</button>
  </form>
</template>
```

AngularJS ships binding, field discovery, validity and the `$dirty` and `$touched` states in the framework:

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
  <!-- role, bio and terms follow the same pattern -->
  <button type="submit">Criar conta</button>
</form>
```

That cuts the wiring in the basic case and ties the application to the framework's semantics. AngularJS is discontinued and appears here only as a historical reference.

The comparison shows where each implementation places decisions about binding, validation and field state. In React, the local abstraction standardizes part of that work. This is not equivalent to framework DX: the experiment covers only the authoring of one simple form and does not evaluate application conventions, routing, data, lifecycle or tooling.

## Maintenance cost

On this form, performance is not a strong argument against the abstraction. The cost that matters is a different one: the team now maintains form infrastructure.

- **Every new control needs support.** Date pickers, comboboxes, uploads and dynamic lists need props, binding, `ref`, accessibility and an entry in the `Field` namespace.
- **Type safety depends on casts.** The consumer gets autocomplete, but the guarantee rests on conversions the compiler does not check.
- **`name` is safe; value and props are not.** `Field.Text name="age"` compiles even if `age` is a number.
- **Zod is isolated only at the import.** The public API depends on `z.input`, `z.output`, transforms and the message format. Swapping the validation library changes schemas, types and tests.
- **Domain complexity leaks.** Dependent fields, arrays and form-level errors (`errors.root`) bring back `watch`, `setValue` and the raw form API.

There is also no single binding for every field. Native inputs can stay uncontrolled; a component that only accepts `value` and `onChange` needs Controller. An extension of the abstraction could hide that decision from the screen:

```tsx
<Field.Text name="email" label="E-mail" />                {/* implemented with register */}
<Field.DatePicker name="birthDate" label="Nascimento" />  {/* hypothetical useController extension */}
```

That is a plausible reason to keep the decision in the field layer, since it changes per component. The lab does not implement or measure the `DatePicker`; the example only shows how the interface could grow.

## Conclusion

The lab demonstrates a declarative API for a narrow scope: React forms with common fields, a Zod schema and state managed by React Hook Form. The screen gets smaller, typed and consistent. With uncontrolled binding, the measured overhead stayed close to direct RHF usage.

This does not establish "framework-like DX." The abstraction covers the common form path while arrays, field dependencies and form-level errors still expose the raw API. We also did not measure productivity, onboarding time or evolution cost in a real codebase.

The trade looks more defensible when the field vocabulary is stable and repeats across many screens. If every form needs exceptions, the short interface loses value while the team remains responsible for the infrastructure.

## Limitations

- The form is small. It does not reproduce the accessibility or the controls of a production design system.
- Blur and change validation and `touched` details are not identical across stacks.
- Vue and AngularJS could also get libraries or local abstractions. The lab compares the choices that were made, not the limits of each technology.
- `TaskDuration` is comparative CPU time for the scenario. It is not INP, perceived latency or React-only time.
- The instrumentation counts render-function calls, not React commits. The benchmark runs without `StrictMode`.
- Ten samples on one machine are enough for this local contrast, not for generalizing across devices and applications.
- Lines of code locate the cost. They do not measure type difficulty, team familiarity or upgrade cost.

## Reproduce it

```bash
git clone https://github.com/jeandiego/evidence-lab.git
cd evidence-lab/posts/002-form-abstractions-dx/lab
npm install
npm run dev              # the six implementations side by side
npm run measure          # regenerates evidence/metrics.json
npm run benchmark:react  # regenerates evidence/react-performance.json (requires Chrome)
```

The full methodology is in [`docs/methodology.md`](../docs/methodology.md), and the analysis of the abstraction is in [`docs/abstraction-analysis.md`](../docs/abstraction-analysis.md). Both are in Portuguese.

## References

- [React Hook Form: `register`](https://react-hook-form.com/docs/useform/register)
- [React Hook Form: `useController`](https://react-hook-form.com/docs/usecontroller)
- [React Hook Form: `Controller`](https://react-hook-form.com/docs/usecontroller/controller)
- [React Hook Form: `useFormContext`](https://react-hook-form.com/docs/useformcontext)
- [React Hook Form: `useFormState`](https://react-hook-form.com/docs/useformstate)
- [React Hook Form: integrating controlled inputs](https://react-hook-form.com/get-started#IntegratingControlledInputs)
- [React Hook Form Resolvers: Zod](https://github.com/react-hook-form/resolvers#zod)
