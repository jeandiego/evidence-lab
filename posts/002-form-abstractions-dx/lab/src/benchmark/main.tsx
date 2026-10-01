import { createRoot } from 'react-dom/client'
import '../styles.css'
import { App as AbstractedApp } from '../react/App'
import { App as UncontrolledApp } from '../react-uncontrolled/App'
import { App as RhfApp } from '../react-rhf/App'
import { App as StateApp } from '../react-state/App'

type StrategyId = 'react-abstracted' | 'react-uncontrolled' | 'react-rhf' | 'react-state'
const counts: Record<string, number> = {}

window.__renderMeter = {
  mark(label: string) { counts[label] = (counts[label] ?? 0) + 1 },
}

const apps: Array<[StrategyId, typeof AbstractedApp]> = [
  ['react-abstracted', AbstractedApp],
  ['react-uncontrolled', UncontrolledApp],
  ['react-rhf', RhfApp],
  ['react-state', StateApp],
]

for (const [id, App] of apps) createRoot(document.getElementById(`benchmark-${id}`)!).render(<App />)

window.__reactBenchmark = {
  reset() { for (const label of Object.keys(counts)) delete counts[label] },
  read() { return { ...counts } },
}

declare global {
  interface Window {
    __reactBenchmark: {
      reset: () => void
      read: () => Record<string, number>
    }
  }
}
