import { useState } from 'react'
import type { z } from 'zod'
import { markRender } from '../render-meter'
import { useCreateForm } from './create-form'
import { accountSchema } from './schema'

const roles = [{ value: 'dev', label: 'Developer' }, { value: 'lead', label: 'Tech Lead' }, { value: 'manager', label: 'Engineering Manager' }]

export function App() {
  if (import.meta.env.DEV) markRender('App')
  const [result, setResult] = useState<z.output<typeof accountSchema>>()
  const { Form, Field } = useCreateForm(accountSchema, { name: '', email: '', role: '', bio: '', terms: false })
  return <>
    <header className="implementation-header"><span className="badge">Abstração · Controller</span><h2>React · abstraído</h2><p>Os wrappers usam campos controlados com <code>useController</code>.</p></header>
    <Form onSubmit={setResult}>
      <Field.Text name="name" label="Nome" />
      <Field.Text name="email" label="E-mail" type="email" />
      <Field.Select name="role" label="Papel" options={roles} />
      <Field.Textarea name="bio" label="Bio" />
      <Field.Checkbox name="terms" label="Aceito os termos" />
      <button type="submit">Criar conta</button>
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </Form>
  </>
}
