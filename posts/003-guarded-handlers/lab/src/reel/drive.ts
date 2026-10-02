// Lab Reel · drive — helpers for Story.page.apply: put the lab page into a state, deterministically.
// Everything here goes through the page's own UI (clicks, inputs), never through its internals.

export function el<E extends HTMLElement = HTMLElement>(doc: Document, sel: string): E {
  const found = doc.querySelector<E>(sel)
  if (!found) throw new Error(`drive: ${sel} não encontrado`)
  return found
}

export const click = (doc: Document, sel: string) => el(doc, sel).click()

/** Set a checkbox/switch through a real click, so framework handlers run. */
export function check(doc: Document, sel: string, value: boolean) {
  const input = el<HTMLInputElement>(doc, sel)
  if (input.checked !== value) input.click()
}

/** Set an input/range/select value the way a user would (works with React controlled inputs). */
export function input(doc: Document, sel: string, value: string) {
  const field = el<HTMLInputElement>(doc, sel)
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(field), 'value')?.set
  setter ? setter.call(field, value) : (field.value = value)
  field.dispatchEvent(new Event('input', { bubbles: true }))
  field.dispatchEvent(new Event('change', { bubbles: true }))
}

/** Wait until a condition holds in the page (e.g. a demo finished running). */
export async function until(doc: Document, test: () => boolean, label: string, timeout = 8000) {
  const win = doc.defaultView!, started = performance.now()
  while (!test()) {
    if (performance.now() - started > timeout) throw new Error(`drive: tempo esgotado esperando ${label}`)
    await new Promise(resolve => win.setTimeout(resolve, 20))
  }
}

export const text = (doc: Document, sel: string) => el(doc, sel).textContent?.trim() ?? ''
