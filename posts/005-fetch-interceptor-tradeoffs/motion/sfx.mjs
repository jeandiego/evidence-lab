// Trilha sintetizada (WAV 48 kHz estéreo) sincronizada à mesma linha do tempo do vídeo: cliques e requests caem
// nos instantes gravados. Nada de sample externo: osciladores, ruído filtrado e um reverb simples.
import { writeFileSync } from "node:fs";
import { story } from "./story.mjs";

const SR = 48000;

export function writeSfx(path) {
  const N = Math.ceil(story.duration * SR);
  const L = new Float32Array(N), R = new Float32Array(N);
  const sendL = new Float32Array(N), sendR = new Float32Array(N); // bus do reverb
  let seed = 1;
  const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;

  // Soma `fn(t local)` a partir de `at`, por `dur` s, com pan (-1..1), ganho e envio ao reverb.
  const add = (at, dur, fn, { pan = 0, gain = 1, verb = 0.2 } = {}) => {
    const i0 = Math.max(0, Math.round(at * SR)), n = Math.round(dur * SR);
    const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4), gr = gain * Math.sin(((pan + 1) * Math.PI) / 4);
    for (let k = 0; k < n && i0 + k < N; k++) {
      const v = fn(k / SR, k / n);
      L[i0 + k] += v * gl; R[i0 + k] += v * gr;
      sendL[i0 + k] += v * gl * verb; sendR[i0 + k] += v * gr * verb;
    }
  };
  const sine = (f, t) => Math.sin(2 * Math.PI * f * t);
  const saw = (f, t) => 2 * ((f * t) % 1) - 1;

  // Ruído filtrado com corte variável: base de whooshes e risers.
  const swept = (at, dur, f0, f1, opts) => {
    let lp = 0, lp2 = 0;
    add(at, dur, (t, u) => {
      const f = f0 * Math.pow(f1 / f0, u), a = 1 - Math.exp((-2 * Math.PI * f) / SR);
      lp += a * (noise() - lp); lp2 += a * (lp - lp2);
      return lp2 * Math.sin(Math.PI * u) ** 1.5 * 2.2;
    }, opts);
  };
  const whoosh = (at, dur, up = true, gain = 0.5, pan = 0) => swept(at - dur / 2, dur, up ? 260 : 5200, up ? 5200 : 260, { gain, pan, verb: 0.35 });
  const boom = (at, gain = 0.9, f0 = 95) => add(at, 1.1, (t) => {
    const f = 38 + (f0 - 38) * Math.exp(-t * 9);
    return Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 4.2) + 0.25 * noise() * Math.exp(-t * 40);
  }, { gain, verb: 0.25 });
  const click = (at, pan = 0) => add(at, 0.05, (t) => (noise() * 0.6 + sine(2400, t)) * Math.exp(-t * 160), { gain: 0.35, pan, verb: 0.15 });
  const ping = (at, f, pan = 0, gain = 0.22) => add(at, 0.6, (t) => (sine(f, t) + 0.35 * sine(f * 2.01, t)) * Math.exp(-t * 9), { gain, pan, verb: 0.45 });
  const chime = (at, notes, gain = 0.2, spread = 0.045) => notes.forEach((f, i) => ping(at + i * spread, f, (i - (notes.length - 1) / 2) * 0.35, gain));
  const buzz = (at, dur = 0.42, gain = 0.32, pan = 0.4) => add(at, dur, (t, u) => {
    const crush = Math.round((saw(97, t) + saw(103.5, t) + 0.6 * noise()) * 4) / 4;
    return crush * (1 - u) ** 1.4 * (t < 0.005 ? t / 0.005 : 1);
  }, { gain, pan, verb: 0.2 });
  const tick = (at, gain = 0.05) => add(at, 0.012, (t) => sine(3600, t) * Math.exp(-t * 500), { gain, verb: 0 });
  const pad = (a, b, notes, gain) => add(a, b - a, (t, u) => {
    const env = Math.min(1, t / 0.8) * Math.min(1, (b - a - t) / 0.9);
    return env * notes.reduce((s, f, i) => s + Math.sin(2 * Math.PI * f * t + Math.sin(t * (0.3 + i * 0.13)) * 0.6), 0) / notes.length;
  }, { gain, verb: 0.5 });

  const tl = story, net = (take) => tl.takes[take].net;
  const bRef = net("baseline").filter((r) => r.op === "refreshToken");
  const bad = bRef.find((r) => r.status >= 400), ok = bRef.find((r) => r.status < 400);
  const pRef = net("patch").find((r) => r.op === "refreshToken");

  // Cama harmônica: tensa até o patch, abre em maior quando os dois MFEs voltam.
  pad(0, 6.05, [55, 82.4, 110, 130.8], 0.09);
  pad(6.0, 9.4, [55, 82.4, 110, 123.5, 164.8], 0.08);
  pad(9.15, 14.9, [55, 110, 138.6, 164.8, 220, 277.2], 0.085);

  // Ato 1
  whoosh(0.45, 1.0, true, 0.55);
  boom(0.95, 0.7);
  for (const c of tl.clicks) click(c.t, (c.at.x / 1280) * 1.2 - 0.6);
  whoosh(2.12, 0.32, true, 0.4);
  buzz(tl.clicks.find((c) => c.name === "expireToken").t + 0.04, 0.22, 0.18, 0.3);

  // Ato 2: câmera lenta. Catálogo à esquerda, carrinho à direita.
  whoosh(3.12, 0.34, false, 0.35);
  whoosh(3.66, 0.3, true, 0.3);
  for (let ms = 0; ms <= tl.slowMs; ms += 20) tick(tl.slow.baseline.from + (ms / tl.slowMs) * (tl.slow.baseline.to - tl.slow.baseline.from));
  ping(ok.vStart, 1318.5, -0.6);
  ping(bad.vStart + 0.012, 1318.5, 0.6);
  swept(ok.vStart, ok.vEnd - ok.vStart, 180, 2400, { gain: 0.28, verb: 0.3 });
  chime(ok.vEnd, [1318.5, 1975.5], 0.12);
  buzz(bad.vEnd, 0.42, 0.34, 0.5);
  boom(bad.vEnd, 0.85, 70);
  const prod = net("baseline").find((r) => r.op === "products");
  ping(prod.vStart, 1568, -0.6, 0.15);
  ping(prod.vEnd, 1975.5, -0.6, 0.15);
  whoosh(5.32, 0.36, true, 0.35);
  buzz(5.44, 0.3, 0.2, 0);

  // Transição e ato 3
  whoosh(5.9, 0.24, false, 0.6);
  boom(6.0, 0.8, 120);
  swept(6.0, 0.5, 9000, 900, { gain: 0.3, verb: 0.4 });
  chime(6.62, [880, 1318.5, 1760], 0.1, 0.06);
  for (let k = 0; k < 7; k++) tick(6.32 + k * 0.093, 0.07); // as linhas do código entrando
  whoosh(7.18, 0.3, false, 0.35);
  whoosh(7.62, 0.3, true, 0.3);
  for (let ms = 0; ms <= tl.slowMs; ms += 20) tick(tl.slow.patch.from + (ms / tl.slowMs) * (tl.slow.patch.to - tl.slow.patch.from));
  ping(tl.slow.patch.from + 0.08, 1318.5, -0.6, 0.16);
  ping(tl.slow.patch.from + 0.09, 1318.5, 0.6, 0.16);
  ping(pRef.vStart, 1760, 0, 0.24);
  // Riser enquanto o único refresh está em voo; resolve quando o token novo volta.
  swept(pRef.vStart, pRef.vEnd - pRef.vStart, 150, 7000, { gain: 0.36, verb: 0.35 });
  add(pRef.vStart, pRef.vEnd - pRef.vStart, (t, u) => sine(220 * Math.pow(4, u), t) * u * u * 0.5, { gain: 0.16, verb: 0.3 });
  boom(pRef.vEnd, 1, 110);
  chime(pRef.vEnd, [880, 1108.7, 1318.5, 1760, 2217.5], 0.16, 0.035);
  for (const r of net("patch").filter((x) => x.op !== "refreshToken")) {
    const pan = r.op === "cart" ? 0.6 : -0.6;
    ping(r.vStart, 1760, pan, 0.14);
    ping(r.vEnd, 2217.5, pan, 0.14);
  }
  whoosh(10.08, 0.32, true, 0.35);
  chime(10.3, [1318.5, 1760], 0.12);

  // Ato 4 e cartela
  whoosh(11.22, 0.45, false, 0.4);
  chime(11.6, [659.3, 880], 0.1, 0.12);
  whoosh(12.85, 0.7, false, 0.45);
  boom(12.97, 0.9, 80);
  boom(13.12, 0.95, 100);
  chime(13.56, [440, 554.4, 659.3], 0.12, 0.05);
  boom(13.72, 0.8, 70);
  chime(13.72, [880, 1108.7, 1318.5, 1760, 2217.5, 2637], 0.13, 0.04);

  // Reverb: combs paralelos no bus de envio, um pouco diferentes por canal.
  const comb = (src, out, delays, fb) => {
    for (const d of delays) {
      const n = Math.round(d * SR), buf = new Float32Array(n);
      let p = 0, lp = 0;
      for (let i = 0; i < N; i++) {
        const y = buf[p];
        lp = 0.7 * lp + 0.3 * y;
        buf[p] = src[i] + lp * fb;
        out[i] += y * (0.9 / delays.length);
        p = (p + 1) % n;
      }
    }
  };
  comb(sendL, L, [0.0297, 0.0371, 0.0411, 0.0437, 0.0533], 0.84);
  comb(sendR, R, [0.0313, 0.0359, 0.0423, 0.0449, 0.0571], 0.84);

  // Master: saturação suave e normalização em -1 dBFS; fade de 30 ms nas pontas.
  let peak = 0;
  for (let i = 0; i < N; i++) {
    L[i] = Math.tanh(L[i] * 1.2); R[i] = Math.tanh(R[i] * 1.2);
    peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  }
  const g = 0.89 / peak, fade = 0.03 * SR;
  const pcm = Buffer.alloc(44 + N * 4);
  pcm.write("RIFF", 0); pcm.writeUInt32LE(36 + N * 4, 4); pcm.write("WAVE", 8); pcm.write("fmt ", 12);
  pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(2, 22); pcm.writeUInt32LE(SR, 24);
  pcm.writeUInt32LE(SR * 4, 28); pcm.writeUInt16LE(4, 32); pcm.writeUInt16LE(16, 34); pcm.write("data", 36); pcm.writeUInt32LE(N * 4, 40);
  for (let i = 0; i < N; i++) {
    const e = Math.min(1, i / fade, (N - i) / fade) * g;
    pcm.writeInt16LE(Math.round(clamp1(L[i] * e) * 32767), 44 + i * 4);
    pcm.writeInt16LE(Math.round(clamp1(R[i] * e) * 32767), 46 + i * 4);
  }
  writeFileSync(path, pcm);
}
const clamp1 = (v) => Math.max(-1, Math.min(1, v));
