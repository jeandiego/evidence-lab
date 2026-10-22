import type { LabGlobals, VariantName } from "@shop-lab/lab-protocol";

const VARIANTS: VariantName[] = ["baseline", "patch", "utility"];

/** Lê ?variant= ?load= ?auth= ?seed= e monta o objeto global que shell, MFEs e benchmark compartilham. */
export function parseLab(): LabGlobals {
  const q = new URLSearchParams(location.search);
  const variant = VARIANTS.find((v) => v === q.get("variant")) ?? "baseline";
  const lab: LabGlobals = {
    variant,
    load: q.get("load") === "parcel" ? "parcel" : "root",
    auth: q.get("auth") === "bundled" ? "bundled" : "external",
    seed: Number(q.get("seed") ?? 1),
    mfeDelay: Number(q.get("delay") ?? 400),
    bffUrl: `${location.protocol}//${location.hostname}:${q.get("api") ?? 4191}/graphql`, // ?api= permite apontar para outra instância da API
    storageKey: "@shop/auth",
    results: [],
    mfe: {},
    sessionLost: false,
    onExpired: () => {
      lab.sessionLost = true;
    },
  };
  return lab;
}

/** Cada variante usa o mesmo conjunto de nomes; só o destino do cart e o utility module mudam. */
export function injectImportMap(lab: LabGlobals) {
  const cart = lab.variant === "utility" && lab.auth === "bundled" ? "cart.bundled.js" : "cart.js";
  const el = document.createElement("script");
  el.type = "importmap";
  el.textContent = JSON.stringify({
    imports: {
      "@shop/catalog": "/mfe/catalog/catalog.js",
      "@shop/cart": `/mfe/cart/${cart}`,
      "@shop-lab/auth-fetch": "/pkg/auth-fetch.js",
    },
  });
  document.head.appendChild(el);
}
