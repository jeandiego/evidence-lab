// S7: custo estático de migração. Compara os arquivos de client de cada MFE (git diff --numstat) e mede o tamanho das camadas de auth.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const lab = fileURLToPath(new URL("..", import.meta.url));
const f = (p) => lab + p;

const numstat = (a, b) => {
  try {
    execFileSync("git", ["diff", "--no-index", "--numstat", a, b], { encoding: "utf8" });
    return { added: 0, removed: 0 };
  } catch (e) {
    const [added, removed] = e.stdout.trim().split(/\s+/).map(Number); // git diff sai com 1 quando há diferença
    return { added, removed };
  }
};
const loc = (p) => readFileSync(f(p), "utf8").split("\n").filter((l) => l.trim() && !l.trim().startsWith("//")).length;

export function migrationCost() {
  const perMfe = {};
  for (const mfe of ["catalog", "cart"]) {
    const dir = `apps/${mfe}/src/apollo/`;
    perMfe[mfe] = {
      "baseline -> plain (patch)": numstat(f(dir + "client.baseline.ts"), f(dir + "client.plain.ts")),
      "baseline -> utility": numstat(f(dir + "client.baseline.ts"), f(dir + "client.utility.ts")),
      clientLoc: { baseline: loc(dir + "client.baseline.ts"), plain: loc(dir + "client.plain.ts"), utility: loc(dir + "client.utility.ts") },
    };
  }
  const sum = (key) => Object.values(perMfe).reduce((s, m) => ({ added: s.added + m[key].added, removed: s.removed + m[key].removed }), { added: 0, removed: 0 });
  return {
    note: "Mede só os arquivos de client. Não inclui external no build, entrada no import map, testes, PR e deploy de cada MFE.",
    mfes: 2,
    perMfe,
    totalForTwoMfes: { "baseline -> plain (patch)": sum("baseline -> plain (patch)"), "baseline -> utility": sum("baseline -> utility") },
    authLayerLoc: { "auth-fetch (patch e utility)": loc("packages/auth-fetch/src/index.ts") },
    projection: "Para N MFEs com a mesma forma, o total cresce linearmente (N/2 vezes o total acima). É uma conta, não uma medição.",
  };
}
