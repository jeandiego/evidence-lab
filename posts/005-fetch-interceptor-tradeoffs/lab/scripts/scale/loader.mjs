// O Apollo 3 publica "@apollo/client/core" como diretório, que o ESM do Node não resolve. Os bundlers (Vite)
// resolvem; aqui apontamos para o index.js do diretório, para rodar os clients dos MFEs sem alterá-los.
export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@apollo/client/") && !specifier.endsWith(".js")) specifier += "/index.js";
  return next(specifier, context);
}
