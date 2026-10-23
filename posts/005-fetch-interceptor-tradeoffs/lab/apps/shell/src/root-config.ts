import { createAuthFetch } from "@shop-lab/auth-fetch";
import { lab as getLab } from "@shop-lab/lab-protocol";
import { registerApplication, start } from "single-spa";
import { mountPanel } from "./panel/mount";

const lab = getLab();

// Atrasos de carga determinísticos (mulberry32): a mesma seed reproduz a mesma ordem.
let s = lab.seed >>> 0;
const rand = () => {
  s = (s + 0x6d2b79f5) >>> 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const delay = (max: number) => new Promise((r) => setTimeout(r, rand() * max));

function installPatch() {
  if (lab.variant === "patch")
    window.fetch = createAuthFetch({ bffUrl: lab.bffUrl, storageKey: lab.storageKey, baseFetch: window.fetch.bind(window), onExpired: lab.onExpired });
  lab.patchInstalledAt = performance.now();
}

if (lab.variant.startsWith("patch")) {
  if (lab.load === "root") installPatch();
  else
    // O interceptor como se fosse um MFE: instalado quando o single-spa terminar de carregá-lo.
    registerApplication({
      name: "@shop/interceptor",
      app: async () => {
        await delay(600);
        return { bootstrap: async () => {}, mount: async () => installPatch(), unmount: async () => {} };
      },
      activeWhen: () => true,
    });
}

// O catálogo vive em todas as páginas (lista e detalhe). O carrinho lateral só existe na home:
// ao voltar do detalhe, os dois MFEs consultam o servidor ao mesmo tempo.
const routes: Record<string, (location: Location) => boolean> = {
  catalog: () => true,
  cart: (location) => location.pathname === "/",
};
for (const name of ["catalog", "cart"]) {
  registerApplication({
    name: `@shop/${name}`,
    app: async () => {
      await delay(lab.mfeDelay);
      return import(/* @vite-ignore */ `@shop/${name}`);
    },
    activeWhen: routes[name],
  });
}

mountPanel(document.getElementById("panel")!);
start();
