import { type FormEvent, useState } from 'react'
import { markRender } from '../render-meter'

type Model = { name: string; email: string; role: string; bio: string; terms: boolean }
type Errors = Partial<Record<keyof Model, string>>
const initialModel: Model = { name: '', email: '', role: '', bio: '', terms: false }

function validate(model: Model): Errors {
  return {
    name: model.name.trim().length >= 2 ? '' : 'Use pelo menos 2 caracteres.',
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(model.email) ? '' : 'Informe um e-mail válido.',
    role: model.role ? '' : 'Selecione um papel.',
    bio: model.bio.trim().length <= 120 ? '' : 'Use no máximo 120 caracteres.',
    terms: model.terms ? '' : 'Aceite os termos.',
  }
}

export function App() {
  if (import.meta.env.DEV) markRender('App')
  const [model, setModel] = useState(initialModel)
  const [errors, setErrors] = useState<Errors>({})
  const [result, setResult] = useState<Model>()
  const update = <K extends keyof Model>(key: K, value: Model[K]) => setModel(current => ({ ...current, [key]: value }))

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validate(model)
    setErrors(nextErrors)
    if (!Object.values(nextErrors).some(Boolean)) setResult({ ...model, name: model.name.trim(), bio: model.bio.trim() })
  }

  return <>
    <header className="implementation-header"><span className="badge">Somente React</span><h2>React · useState</h2><p>Inputs controlados e validação mantidos pela aplicação.</p></header>
    <form onSubmit={submit} noValidate>
      <label>Nome<input name="name" value={model.name} onChange={event => update('name', event.target.value)} /></label><p className="error">{errors.name ?? ''}</p>
      <label>E-mail<input name="email" value={model.email} onChange={event => update('email', event.target.value)} type="email" /></label><p className="error">{errors.email ?? ''}</p>
      <label>Papel<select name="role" value={model.role} onChange={event => update('role', event.target.value)}><option value="">Selecione</option><option value="dev">Developer</option><option value="lead">Tech Lead</option><option value="manager">Engineering Manager</option></select></label><p className="error">{errors.role ?? ''}</p>
      <label>Bio<textarea name="bio" value={model.bio} onChange={event => update('bio', event.target.value)} /></label><p className="error">{errors.bio ?? ''}</p>
      <label className="check"><input name="terms" checked={model.terms} onChange={event => update('terms', event.target.checked)} type="checkbox" /> Aceito os termos</label><p className="error">{errors.terms ?? ''}</p>
      <button type="submit">Criar conta</button>
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </form>
  </>
}
