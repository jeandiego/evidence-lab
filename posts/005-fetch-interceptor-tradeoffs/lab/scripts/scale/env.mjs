// Ambiente de navegador por usuário simulado: cada usuário tem seu localStorage, sua window e seu objeto __LAB__.
// AsyncLocalStorage faz os globais que o código dos MFEs e dos pacotes de auth usam apontarem para o usuário
// da execução corrente, então milhares de usuários concorrentes rodam o código REAL no mesmo processo Node.
import { AsyncLocalStorage } from "node:async_hooks";

export const als = new AsyncLocalStorage();
export const realFetch = globalThis.fetch;

const current = (key) => als.getStore()?.[key];
const define = (name, getter) => Object.defineProperty(globalThis, name, { get: getter, configurable: true });
define("__LAB__", () => current("lab"));
define("localStorage", () => current("localStorage"));
define("window", () => current("window"));
define("location", () => current("window")?.location);
// O Node 24 já tem navigator.locks, mas é um lock do processo inteiro: usuários diferentes se bloqueariam entre si.
// Cada usuário recebe o seu próprio gerenciador de locks, como cada aba/origem num navegador.
const realNavigator = globalThis.navigator;
define("navigator", () => current("navigator") ?? realNavigator);
export function makeLocks() {
  const tails = new Map();
  return {
    request(name, run) {
      const result = (tails.get(name) ?? Promise.resolve()).then(() => run());
      tails.set(name, result.catch(() => {}));
      return result;
    },
  };
}
// O fetch global (usado pelo HttpLink e pelo código de refresh) vira o fetch da window do usuário corrente.
Object.defineProperty(globalThis, "fetch", {
  value: (...args) => (current("window")?.fetch ?? realFetch)(...args),
  writable: true,
  configurable: true,
});
