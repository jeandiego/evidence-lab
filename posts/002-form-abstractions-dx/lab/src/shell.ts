type StrategyId = 'react-abstracted' | 'react-uncontrolled' | 'react-rhf' | 'react-state' | 'vue' | 'angular'
type InspectionId = 'code' | 'dependencies' | 'diagram' | 'behavior'
type Pair = [string, string]

interface Strategy {
  title: string; layer: string; description: string; file: string
  facts: Pair[]; verdict: string; code: string; dependencies: Pair[]; diagram: string[]; behavior: string[]
}

const strategies: Record<StrategyId, Strategy> = {
  'react-abstracted': {
    title: 'React · abstraído · Controller', layer: 'Camada · abstração local', file: 'App.tsx · 21 LOC',
    description: 'A aplicação declara intenção; os wrappers controlam valor e estado de cada campo.',
    facts: [['Dependências', 'React · RHF · Zod'], ['Estado', 'RHF · Controller'], ['Renders/cenário', '73 · localizados'], ['CPU mediana', '49,523 ms'], ['Bundle gzip', '107.389 B'], ['Custo', '21 + 42 + 8 LOC']],
    verdict: 'Menor superfície de consumo. O custo migra para a plataforma interna e só se paga com repetição.',
    code: `const { Form, Field } = useCreateForm(accountSchema, defaults)\n\nreturn (\n  <Form onSubmit={setResult}>\n    <Field.Text name="name" label="Nome" />\n    <Field.Text name="email" label="E-mail" type="email" />\n    <Field.Select name="role" label="Papel" options={roles} />\n    <Field.Textarea name="bio" label="Bio" />\n    <Field.Checkbox name="terms" label="Aceito os termos" />\n  </Form>\n)`,
    dependencies: [['React', 'renderização e estado local'], ['React Hook Form', 'useController, estado e submissão'], ['Zod', 'contrato e transformação'], ['useCreateForm', 'interface local e convenções visuais']],
    diagram: ['Schema Zod', 'useCreateForm', 'Field.*', 'Formulário'],
    behavior: ['Nome de campo validado pelo TypeScript', 'Cada campo assina valor e estado via useController', 'Digitação renderiza apenas o wrapper afetado', 'Schema transforma entrada antes do submit'],
  },
  'react-uncontrolled': {
    title: 'React · abstraído · uncontrolled', layer: 'Camada · abstração local', file: 'App.tsx · 21 LOC',
    description: 'A mesma interface local preserva o estado dos inputs nativos no DOM com register.',
    facts: [['Dependências', 'React · RHF · Zod'], ['Estado', 'RHF + DOM'], ['Renders/cenário', '11 · localizados'], ['CPU mediana', '33,061 ms'], ['Bundle gzip', '106.257 B'], ['Custo', '21 + 43 + 8 LOC']],
    verdict: 'Mesma superfície de consumo; a escolha interna de binding muda o perfil de renderização.',
    code: `const { Form, Field } = useCreateForm(accountSchema, defaults)\n\nreturn (\n  <Form onSubmit={setResult}>\n    <Field.Text name="name" label="Nome" />\n    <Field.Text name="email" label="E-mail" type="email" />\n    <Field.Select name="role" label="Papel" options={roles} />\n    <Field.Textarea name="bio" label="Bio" />\n    <Field.Checkbox name="terms" label="Aceito os termos" />\n  </Form>\n)`,
    dependencies: [['React', 'renderização e estado local'], ['React Hook Form', 'register, erros e submissão'], ['Zod', 'contrato e transformação'], ['useCreateForm', 'interface local e convenções visuais']],
    diagram: ['Schema Zod', 'useCreateForm', 'register + Field.*', 'Formulário'],
    behavior: ['Nome de campo validado pelo TypeScript', 'Valores permanecem nos elementos do DOM', 'Wrapper assina apenas o erro do próprio campo', 'Schema transforma entrada antes do submit'],
  },
  'react-rhf': {
    title: 'React · RHF + Zod', layer: 'Camada · ecossistema direto', file: 'App.tsx + schema · 34 LOC',
    description: 'A aplicação usa as bibliotecas diretamente e repete a apresentação de cada estado de erro.',
    facts: [['Dependências', 'React · RHF · Zod'], ['Estado', 'React Hook Form'], ['Renders/cenário', '2'], ['CPU mediana', '32,703 ms'], ['Bundle gzip', '105.541 B'], ['Custo', '26 + 8 LOC']],
    verdict: 'Pouco código e pouca infraestrutura própria. Convenções visuais permanecem distribuídas nos consumidores.',
    code: `const { register, handleSubmit, formState: { errors } } =\n  useForm({ resolver: zodResolver(accountSchema) })\n\nreturn (\n  <form onSubmit={handleSubmit(setResult)}>\n    <label>Nome<input {...register('name')} /></label>\n    <p>{errors.name?.message}</p>\n    <label>E-mail<input {...register('email')} /></label>\n    <p>{errors.email?.message}</p>\n  </form>\n)`,
    dependencies: [['React', 'renderização e estado do resultado'], ['React Hook Form', 'registro e form state'], ['Zod', 'contrato e mensagens'], ['zodResolver', 'adaptação entre schema e formulário']],
    diagram: ['Schema Zod', 'Resolver', 'useForm', 'JSX do formulário'],
    behavior: ['Registro por ref reduz wiring manual', 'Erros lidos diretamente de formState', 'Schema continua tipando a submissão', 'Markup de label e erro se repete por campo'],
  },
  'react-state': {
    title: 'React · useState', layer: 'Camada · somente React', file: 'App.tsx · 37 LOC',
    description: 'O componente possui valores, handlers, validação e normalização. Nada fica escondido.',
    facts: [['Dependências', 'React'], ['Estado', 'useState'], ['Renders/cenário', '63 · App inteiro'], ['CPU mediana', '71,190 ms'], ['Bundle gzip', '69.763 B'], ['Custo', '37 LOC']],
    verdict: 'Transparência máxima e dependência mínima. O custo cresce com estados, regras e interações do formulário.',
    code: `const [model, setModel] = useState(initialModel)\nconst [errors, setErrors] = useState({})\n\nfunction submit(event) {\n  event.preventDefault()\n  const nextErrors = validate(model)\n  setErrors(nextErrors)\n}\n\n<input\n  value={model.name}\n  onChange={event => update('name', event.target.value)}\n/>`,
    dependencies: [['React', 'renderização, estado e eventos'], ['Browser', 'semântica nativa do form'], ['Função validate', 'regras e mensagens locais'], ['Aplicação', 'binding, touched e normalização']],
    diagram: ['Input controlado', 'useState', 'validate()', 'Resultado'],
    behavior: ['Cada alteração atualiza o estado React', 'Submit impede navegação nativa', 'Validação e normalização são explícitas', 'Touched, dirty e async precisam ser modelados'],
  },
  vue: {
    title: 'Vue', layer: 'Camada · progressive framework', file: 'App.vue · 27 LOC',
    description: 'v-model resolve o binding bidirecional; validação e mensagens continuam na aplicação.',
    facts: [['Dependências', 'Vue'], ['Estado', 'reactive()'], ['Validação', 'Função local'], ['Inputs', 'v-model'], ['Autoria', 'SFC'], ['Custo', '27 LOC']],
    verdict: 'Binding muito conciso sem resolver o domínio de formulários por completo. Progressive é a palavra importante.',
    code: `const model = reactive(initialModel)\nconst errors = reactive({})\n\nfunction submit() {\n  errors.name = model.name.trim().length >= 2\n    ? ''\n    : 'Use pelo menos 2 caracteres.'\n}\n\n<input v-model="model.name" />\n<p>{{ errors.name }}</p>`,
    dependencies: [['Vue', 'renderização, reatividade e binding'], ['v-model', 'property + event por tipo de input'], ['Função submit', 'validação e transformação'], ['Aplicação', 'contrato e mensagens']],
    diagram: ['Template', 'v-model', 'reactive()', 'submit()'],
    behavior: ['Binding escolhe property e evento corretos', 'Estado reativo vive no SFC', 'Validação é manual neste recorte', 'Bibliotecas podem aprofundar o módulo'],
  },
  angular: {
    title: 'AngularJS', layer: 'Camada · framework legado', file: 'template.html + main.ts · 43 LOC',
    description: 'Diretivas ligam modelo, validade e estado do campo ao form controller do framework.',
    facts: [['Dependências', 'AngularJS'], ['Estado', 'Controller'], ['Validação', 'Diretivas'], ['Inputs', 'ngModel'], ['Autoria', 'Template + JS'], ['Custo', '43 LOC']],
    verdict: 'Mais decisões embutidas no framework. Menos montagem, mais semântica proprietária — e uma stack encerrada.',
    code: `<form name="accountForm" ng-submit="vm.submit(accountForm)">\n  <label>\n    Nome\n    <input name="name" ng-model="vm.model.name"\n      required ng-minlength="2" />\n  </label>\n  <p ng-if="accountForm.name.$touched &&\n    accountForm.name.$invalid">\n    Use pelo menos 2 caracteres.\n  </p>\n</form>`,
    dependencies: [['AngularJS', 'template compiler, DI e form state'], ['ngModel', 'binding bidirecional'], ['FormController', 'validade, dirty e touched'], ['Diretivas HTML', 'regras declarativas']],
    diagram: ['Diretivas HTML', 'ngModel', 'FormController', 'Controller'],
    behavior: ['Form controller descobre campos pelo name', 'Validade é agregada automaticamente', 'Touched e dirty vêm no framework', 'Regras customizadas pedem novas diretivas'],
  },
}

let activeStrategy: StrategyId = 'react-abstracted'
let activeInspection: InspectionId = 'code'
const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
const escapeHtml = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

function renderInspection() {
  const strategy = strategies[activeStrategy]
  const target = byId('inspection-content')
  if (activeInspection === 'code') target.innerHTML = `<div class="code-window"><div class="code-window__bar"><span>${strategy.file.split(' · ')[0]}</span><span>TypeScript</span></div><pre><code>${escapeHtml(strategy.code)}</code></pre></div>`
  if (activeInspection === 'dependencies') target.innerHTML = `<div class="dependency-list">${strategy.dependencies.map(([name, role], index) => `<div><span>${String(index + 1).padStart(2, '0')}</span><strong>${name}</strong><p>${role}</p></div>`).join('')}</div>`
  if (activeInspection === 'diagram') target.innerHTML = `<div class="flow-diagram" aria-label="Fluxo de implementação">${strategy.diagram.map((node, index) => `<div><span>${String(index + 1).padStart(2, '0')}</span><strong>${node}</strong></div>${index < strategy.diagram.length - 1 ? '<i aria-hidden="true"></i>' : ''}`).join('')}</div>`
  if (activeInspection === 'behavior') target.innerHTML = `<ol class="behavior-list">${strategy.behavior.map(item => `<li>${item}</li>`).join('')}</ol>`
}

function renderStrategy() {
  const strategy = strategies[activeStrategy]
  document.querySelectorAll<HTMLElement>('[data-panel]').forEach(panel => { panel.hidden = panel.dataset.panel !== activeStrategy })
  document.querySelectorAll<HTMLButtonElement>('[data-strategy]').forEach(button => {
    const selected = button.dataset.strategy === activeStrategy
    button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1
  })
  byId('active-layer').textContent = strategy.layer
  byId('active-title').textContent = strategy.title
  byId('active-description').textContent = strategy.description
  byId('active-file').textContent = strategy.file
  byId('strategy-verdict').textContent = strategy.verdict
  byId('strategy-facts').innerHTML = strategy.facts.map(([term, value]) => `<div><dt>${term}</dt><dd>${value}</dd></div>`).join('')
  renderInspection()
  const preview = byId('strategy-preview'); preview.classList.remove('is-changing'); requestAnimationFrame(() => preview.classList.add('is-changing'))
}

document.querySelectorAll<HTMLButtonElement>('[data-strategy]').forEach(button => {
  button.addEventListener('click', () => { activeStrategy = button.dataset.strategy as StrategyId; renderStrategy() })
  button.addEventListener('keydown', event => {
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return
    event.preventDefault()
    const items = [...document.querySelectorAll<HTMLButtonElement>('[data-strategy]')]
    const next = (items.indexOf(button) + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
    items[next].click(); items[next].focus()
  })
})

document.querySelectorAll<HTMLButtonElement>('[data-inspection]').forEach(button => button.addEventListener('click', () => {
  activeInspection = button.dataset.inspection as InspectionId
  document.querySelectorAll<HTMLButtonElement>('[data-inspection]').forEach(item => {
    const selected = item === button; item.setAttribute('aria-selected', String(selected)); item.tabIndex = selected ? 0 : -1
  })
  renderInspection()
}))

renderStrategy()
