import { useState } from 'react'
import type { z } from 'zod'
import { markRender } from '../render-meter'
import { accountSchema } from '../react/schema'
import { useCreateForm } from './create-form'

const roles = [{ value: 'dev', label: 'Developer' }, { value: 'lead', label: 'Tech Lead' }, { value: 'manager', label: 'Engineering Manager' }]

export function App() {
  if (import.meta.env.DEV) markRender('App')
  const [result, setResult] = useState<z.output<typeof accountSchema>>()
  const { Form, Field } = useCreateForm(accountSchema, { name: '', email: '', role: '', bio: '', terms: false })
  return <>
    <header className="implementation-header"><span className="badge">Abstração · uncontrolled</span><h2>React · abstraído</h2><p>Os wrappers preservam inputs nativos não controlados com <code>register</code>.</p></header>
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
