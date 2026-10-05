import "@fontsource-variable/figtree"
import "@fontsource-variable/geist-mono"
import "./reel.css"

const root = document.querySelector<HTMLDivElement>("#reel")!

root.innerHTML = `
  <main class="reel">
    <header class="masthead">
      <span class="brand"><i></i>SYNKO LAB <b>·</b> 004</span>
      <div class="progress"><i></i></div>
      <span class="time">00:00</span>
    </header>

    <section class="scene cover" data-scene="cover">
      <p class="eyebrow">STATE OWNERSHIP</p>
      <h1>O servidor mudou.<br />A tela <em>percebeu?</em></h1>
      <p class="lede">O mesmo fluxo em duas arquiteturas.<br />Uma delas cria uma segunda fonte de verdade.</p>
      <div class="pipeline"><span>PostgreSQL</span><b>→</b><span>GraphQL</span><b>→</b><span>UI</span></div>
    </section>

    <section class="scene setup" data-scene="setup">
      <p class="eyebrow">A TROCA OBSERVADA</p>
      <h2>Troque Luna por Thor.<br />E acompanhe o preço.</h2>
      <div class="pet-flow">
        <article class="pet-card active">
          <small>ESTADO INICIAL</small><h3>Luna</h3>
          <dl><div><dt>Cobertura</dt><dd>Plano</dd></div><div><dt>Total</dt><dd>Grátis</dd></div></dl>
        </article>
        <div class="flow-arrow">→</div>
        <article class="pet-card">
          <small>TROCA SOLICITADA</small><h3>Thor</h3>
          <dl><div><dt>Cobertura</dt><dd>Particular</dd></div><div><dt>Total</dt><dd>R$ 120</dd></div></dl>
        </article>
      </div>
      <button class="demo-button">Trocar para Thor <span>→</span></button>
      <div class="cursor-dot"></div>
    </section>

    <section class="scene compare compare-a1" data-scene="a1">
      <div class="variant"><span class="bug">✣</span> A1 · ZUSTAND GLOBAL</div>
      <h2>O PET mudou.<br /><em>O resto ficou para trás.</em></h2>
      <div class="comparison">
        <article class="state-card server">
          <small>SERVIDOR · FONTE CANÔNICA</small><h3>Thor</h3>
          <dl><div><dt>Cobertura</dt><dd>PRIVATE</dd></div><div><dt>Desconto</dt><dd>R$ 20</dd></div><div><dt>Total</dt><dd>R$ 120</dd></div><div><dt>Revisão</dt><dd>#2</dd></div></dl>
        </article>
        <article class="state-card danger">
          <small>INTERFACE · ZUSTAND</small><h3>Thor</h3>
          <dl><div><dt>Cobertura</dt><dd>PLAN</dd></div><div><dt>Desconto</dt><dd>R$ 0</dd></div><div><dt>Total</dt><dd>Grátis</dd></div><div><dt>Revisão</dt><dd>#1</dd></div></dl>
        </article>
      </div>
      <div class="verdict bad"><span>!</span><p><strong>Divergiu</strong>A tela parece atualizada — mas combina dados de dois estados.</p></div>
    </section>

    <section class="scene internals" data-scene="internals">
      <p class="eyebrow">POR BAIXO DOS PANOS</p>
      <h2>A action descreve o botão.<br /><em>Não a transição do domínio.</em></h2>
      <div class="code-card">
        <div class="code-head"><span>apply-pet-only</span><b>action Zustand</b></div>
        <pre><code><span class="dim">snapshot: {</span>
  <mark>...state.snapshot,</mark>
  pet: serverSnapshot.pet
<span class="dim">}</span></code></pre>
      </div>
      <div class="omissions">
        <span>coverage</span><span>subtotal</span><span>discount</span><span>total</span><span>revision</span>
      </div>
      <p class="note">5 campos válidos. Uma combinação que nunca deveria existir.</p>
    </section>

    <section class="scene compare compare-a2" data-scene="a2">
      <div class="variant good"><span>◇</span> A2 · STATE OWNERSHIP</div>
      <h2>O snapshot canônico<br /><em>muda por inteiro.</em></h2>
      <div class="comparison">
        <article class="state-card server">
          <small>SERVIDOR · FONTE CANÔNICA</small><h3>Thor</h3>
          <dl><div><dt>Cobertura</dt><dd>PRIVATE</dd></div><div><dt>Desconto</dt><dd>R$ 20</dd></div><div><dt>Total</dt><dd>R$ 120</dd></div><div><dt>Revisão</dt><dd>#2</dd></div></dl>
        </article>
        <article class="state-card success">
          <small>INTERFACE · QUERY CACHE</small><h3>Thor</h3>
          <dl><div><dt>Cobertura</dt><dd>PRIVATE</dd></div><div><dt>Desconto</dt><dd>R$ 20</dd></div><div><dt>Total</dt><dd>R$ 120</dd></div><div><dt>Revisão</dt><dd>#2</dd></div></dl>
        </article>
      </div>
      <div class="verdict ok"><span>✓</span><p><strong>Sincronizado</strong>A resposta completa substitui a query que renderiza a UI.</p></div>
    </section>

    <section class="scene closing" data-scene="closing">
      <p class="eyebrow">A PERGUNTA QUE VEM ANTES DA STORE</p>
      <h2>Quem é o dono<br />deste estado?</h2>
      <p class="closing-copy">Se o servidor é a fonte canônica, cada cópia mutável no cliente exige um protocolo de coerência.</p>
      <div class="rule"></div>
      <p class="cta">Artigo, código e evidências<br /><strong>lab.synko.digital/pt-br/004-state-ownership</strong></p>
    </section>

    <footer><span>POSTGRESQL → GRAPHQL → UI</span><span>lab.synko.digital</span></footer>
  </main>
`

const duration = 31
const scenes = [
  { el: root.querySelector<HTMLElement>('[data-scene="cover"]')!, start: -0.4, end: 4.6 },
  { el: root.querySelector<HTMLElement>('[data-scene="setup"]')!, start: 4.1, end: 9.2 },
  { el: root.querySelector<HTMLElement>('[data-scene="a1"]')!, start: 8.7, end: 15.7 },
  { el: root.querySelector<HTMLElement>('[data-scene="internals"]')!, start: 15.2, end: 21.5 },
  { el: root.querySelector<HTMLElement>('[data-scene="a2"]')!, start: 21, end: 27.2 },
  { el: root.querySelector<HTMLElement>('[data-scene="closing"]')!, start: 26.7, end: 31 },
]

const clamp = (n: number) => Math.max(0, Math.min(1, n))
const ease = (n: number) => 1 - Math.pow(1 - clamp(n), 4)
const windowed = (t: number, start: number, end: number) => {
  const fade = 0.55
  return Math.min(ease((t - start) / fade), ease((end - t) / fade))
}

function seek(t: number) {
  const time = clamp(t / duration) * duration
  document.documentElement.style.setProperty("--progress", String(time / duration))
  const seconds = Math.floor(time)
  root.querySelector<HTMLElement>(".time")!.textContent = `00:${String(seconds).padStart(2, "0")}`

  for (const scene of scenes) {
    const opacity = windowed(time, scene.start, scene.end)
    const local = clamp((time - scene.start) / (scene.end - scene.start))
    scene.el.style.opacity = String(opacity)
    scene.el.style.visibility = opacity < 0.002 ? "hidden" : "visible"
    scene.el.style.transform = `translateY(${(1 - ease(local * 2.4)) * 26}px)`
    scene.el.style.setProperty("--local", String(local))
  }

  const setupLocal = clamp((time - 4.1) / 5.1)
  const cursor = root.querySelector<HTMLElement>(".cursor-dot")!
  const cursorK = ease(clamp((setupLocal - 0.45) / 0.24))
  cursor.style.opacity = String(setupLocal > 0.42 && setupLocal < 0.86 ? 1 : 0)
  cursor.style.transform = `translate(${740 - cursorK * 70}px, ${680 + cursorK * 85}px) scale(${setupLocal > 0.68 ? 0.82 : 1})`
  root.querySelector<HTMLElement>(".demo-button")!.classList.toggle("pressed", setupLocal > 0.67)

  const pills = [...root.querySelectorAll<HTMLElement>(".omissions span")]
  pills.forEach((pill, index) => {
    const k = ease(clamp((time - 17.1 - index * 0.18) / 0.55))
    pill.style.opacity = String(k)
    pill.style.transform = `translateY(${(1 - k) * 16}px)`
  })
}

declare global { interface Window { reel: { ready: boolean; length: number; poster: number; seek(t: number): void } } }
window.reel = { ready: true, length: duration, poster: 23.8, seek }
seek(0)

if (!new URLSearchParams(location.search).has("capture")) {
  const began = performance.now()
  const loop = (now: number) => { seek(((now - began) / 1000) % duration); requestAnimationFrame(loop) }
  requestAnimationFrame(loop)
}
