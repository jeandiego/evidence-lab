import { act, fireEvent, render, screen } from '@testing-library/react'

import { App } from './App'

describe('guarded handlers demo', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the remaining steps as skipped when permission blocks', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('tab', { name: /Execução/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /Permissão/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Executar pipeline' }))

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    expect(screen.getByText('execução bloqueada')).toBeTruthy()
    expect(screen.getByText('permission · not-authorized')).toBeTruthy()
    expect(screen.getAllByText('não executado')).toHaveLength(2)
    expect(screen.getByText('Pipeline interrompida: not-authorized.')).toBeTruthy()
  })

  it('shows handler failures as unexpected errors rather than blocks', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('tab', { name: /Execução/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /Ação principal/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Executar pipeline' }))

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    expect(screen.getByText('erro inesperado')).toBeTruthy()
    expect(screen.getByText('A API recusou a publicação.')).toBeTruthy()
    expect(screen.queryByText('execução bloqueada')).toBeNull()
  })

  it('keeps toggle inputs keyboard-focusable', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('tab', { name: /Execução/ }))
    const onlineToggle = screen.getByRole('checkbox', { name: /Conectividade/ })
    onlineToggle.focus()

    expect(document.activeElement).toBe(onlineToggle)
  })

  it('switches from the interactive pipeline to the three-way code comparison', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('tab', { name: /Código/ }))

    expect(screen.getByRole('heading', { name: 'Guard composável' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Tradicional legível' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Monolítico direto' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Executar pipeline' })).toBeNull()
  })

  it('keeps both controlled panels mounted and supports arrow-key navigation', () => {
    render(<App />)

    const anatomyTab = screen.getByRole('tab', { name: /Anatomia/ })
    fireEvent.keyDown(anatomyTab, { key: 'ArrowRight' })

    expect(screen.getByRole('tab', { name: /Execução/ }).getAttribute('aria-selected')).toBe('true')
    fireEvent.keyDown(screen.getByRole('tab', { name: /Execução/ }), { key: 'ArrowRight' })
    expect(screen.getByRole('tab', { name: /Código/ }).getAttribute('aria-selected')).toBe('true')
    expect(document.getElementById('panel-anatomy')).toBeTruthy()
    expect(document.getElementById('panel-execution')).toBeTruthy()
    expect(document.getElementById('panel-code')).toBeTruthy()
    expect(document.getElementById('panel-evidence')).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Três implementações do fluxo de publicação' }).tabIndex).toBe(0)
  })

  it('lets the reader inspect and restart every anatomy stage', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Um handler, cinco responsabilidades' })).toBeTruthy()

    fireEvent.change(screen.getByRole('slider', { name: /Etapa 1 de 5/ }), { target: { value: '4' } })

    expect(screen.getByRole('heading', { name: 'O contrato fica legível antes da execução' })).toBeTruthy()
    expect(screen.getByText(/composeGuards\(selectOption/)).toBeTruthy()
    expect(screen.getAllByText('extraído para guard')).toHaveLength(2)

    fireEvent.click(screen.getByRole('button', { name: 'Reiniciar anatomia' }))

    expect(screen.getByRole('heading', { name: 'Um handler, cinco responsabilidades' })).toBeTruthy()
  })

  it('presents benchmark methodology, structural metrics and results', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('tab', { name: /Evidências/ }))

    expect(screen.getByRole('heading', { name: 'Equivalência antes da comparação' })).toBeTruthy()
    expect(screen.getByRole('table', { name: 'Métricas estruturais por variante' })).toBeTruthy()
    expect(screen.getByText('18/18')).toBeTruthy()
    expect(screen.getByText(/centralizaram a tradução/)).toBeTruthy()
  })

  it('shows React first and allows inspecting the Angular and Vue adapters', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('tab', { name: /Código/ }))

    expect(screen.getByText('PublishButton.tsx', { selector: '.code-bar span' })).toBeTruthy()

    fireEvent.click(screen.getByRole('tab', { name: 'Angular' }))
    expect(screen.getByText('publish-button.component.ts', { selector: '.code-bar span' })).toBeTruthy()

    fireEvent.click(screen.getByRole('tab', { name: 'Vue' }))
    expect(screen.getByText('PublishButton.vue', { selector: '.code-bar span' })).toBeTruthy()
  })
})
