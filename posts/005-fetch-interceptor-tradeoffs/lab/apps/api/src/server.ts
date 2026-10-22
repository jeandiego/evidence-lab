import { createServer } from "node:http";
import { handleLab } from "./lab-control.ts";
import { handleGraphql, type GraphqlBody } from "./schema.ts";

const PORT = Number(process.env.API_PORT ?? process.env.PORT ?? 4191);

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, content-type, client-name",
  "access-control-allow-methods": "GET, POST, OPTIONS",
};

async function readJson(req: import("node:http").IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const raw = Buffer.concat(chunks).toString();
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

createServer(async (req, res) => {
  const send = (status: number, body: unknown) => {
    res.writeHead(status, { ...CORS, "content-type": "application/json" });
    res.end(JSON.stringify(body));
  };
  const path = new URL(req.url ?? "/", "http://localhost").pathname;
  const method = req.method ?? "GET";

  if (method === "OPTIONS") {
    res.writeHead(204, CORS);
    return void res.end();
  }
  try {
    if (path === "/graphql" && method === "POST") {
      const out = await handleGraphql((await readJson(req)) as GraphqlBody, req.headers.authorization);
      return send(out.status, out.body);
    }
    if (path.startsWith("/__lab/")) {
      const out = handleLab(method, path, method === "POST" ? await readJson(req) : {});
      if (out) return send(out.status, out.body);
    }
    send(404, { errors: [{ message: "not found" }] });
  } catch (e) {
    send(500, { errors: [{ message: (e as Error).message }] });
  }
}).listen(PORT, () => console.log(`api on http://localhost:${PORT}/graphql`));
