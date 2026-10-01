import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'
import { markRender } from '../render-meter'
import { accountSchema } from '../react/schema'

type Input = z.input<typeof accountSchema>
type Output = z.output<typeof accountSchema>

export function App() {
  if (import.meta.env.DEV) markRender('App')
  const [result, setResult] = useState<Output>()
  const { register, handleSubmit, formState: { errors } } = useForm<Input, unknown, Output>({
    defaultValues: { name: '', email: '', role: '', bio: '', terms: false },
    resolver: zodResolver(accountSchema),
  })

  return <>
    <header className="implementation-header"><span className="badge">Ecossistema direto</span><h2>React · RHF + Zod</h2><p>As bibliotecas são usadas sem o módulo <code>Field.*</code>.</p></header>
    <form onSubmit={handleSubmit(setResult)} noValidate>
      <label>Nome<input {...register('name')} /></label><p className="error">{errors.name?.message ?? ''}</p>
      <label>E-mail<input {...register('email')} type="email" /></label><p className="error">{errors.email?.message ?? ''}</p>
      <label>Papel<select {...register('role')}><option value="">Selecione</option><option value="dev">Developer</option><option value="lead">Tech Lead</option><option value="manager">Engineering Manager</option></select></label><p className="error">{errors.role?.message ?? ''}</p>
      <label>Bio<textarea {...register('bio')} /></label><p className="error">{errors.bio?.message ?? ''}</p>
      <label className="check"><input {...register('terms')} type="checkbox" /> Aceito os termos</label><p className="error">{errors.terms?.message ?? ''}</p>
      <button type="submit">Criar conta</button>
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </form>
  </>
}
