export function markRender(label: string): void {
  window.__renderMeter?.mark(label)
}

declare global {
  interface Window {
    __renderMeter?: { mark: (label: string) => void }
  }
}
