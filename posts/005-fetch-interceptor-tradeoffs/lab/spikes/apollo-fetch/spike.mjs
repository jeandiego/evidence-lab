// Pergunta: o HttpLink do Apollo resolve o `fetch` global na criação do link ou a cada request?
// Método: troca globalThis.fetch em momentos diferentes e observa qual função recebe a chamada.
import { gql } from "graphql-tag";

const results = {};
const q = gql`query { ping }`;

function tracer(name, calls) {
  return async () => {
    calls.push(name);
    return new Response(JSON.stringify({ data: { ping: "pong" } }), { headers: { "content-type": "application/json" } });
  };
}

async function run(link, { ApolloClient, InMemoryCache }) {
  const client = new ApolloClient({ link, cache: new InMemoryCache() });
  await client.query({ query: q, fetchPolicy: "network-only" });
}

for (const pkg of ["apollo3", "apollo4"]) {
  const core = await import(`${pkg}/core/index.js`);
  const { HttpLink } = core;
  const version = (await import(`./node_modules/${pkg}/package.json`, { with: { type: "json" } })).default.version;
  const calls = [];
  const original = globalThis.fetch;

  // A: fetch "antigo" existe quando o link é criado; é trocado só depois, antes do 1º request
  globalThis.fetch = tracer("old", calls);
  const link = new HttpLink({ uri: "http://x.test/graphql" });
  globalThis.fetch = tracer("patched-before-first-request", calls);
  await run(link, core);

  // B: troca de novo depois do 1º request
  globalThis.fetch = tracer("patched-after-first-request", calls);
  await run(link, core);

  // C: patch ANTES de criar o link (caso do orquestrador)
  globalThis.fetch = tracer("patched-before-link", calls);
  const link2 = new HttpLink({ uri: "http://x.test/graphql" });
  await run(link2, core);

  globalThis.fetch = original;
  results[`${pkg}@${version}`] = calls;
}
import { writeFileSync, mkdirSync } from "node:fs";
import os from "node:os";
const evidence = {
  question: "O HttpLink resolve o fetch global na criação do link ou a cada request?",
  method: "troca globalThis.fetch por tracers em 3 momentos e registra qual recebeu a chamada",
  environment: { node: process.version, os: `${os.platform()} ${os.release()}`, arch: os.arch() },
  calls: results,
  conclusion: "ambas as versões leem o fetch global a cada request; um patch instalado depois de criar o client ainda vale",
};
mkdirSync("../../../evidence", { recursive: true });
writeFileSync("../../../evidence/spike-httplink-fetch.json", JSON.stringify(evidence, null, 2) + "\n");
console.log(JSON.stringify(evidence, null, 2));
