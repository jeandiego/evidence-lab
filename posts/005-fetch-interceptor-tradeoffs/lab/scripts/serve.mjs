// Servidor estático único (origem http://localhost:4180): shell, MFEs e o utility module auth-fetch.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const PORT = Number(process.env.WEB_PORT ?? process.env.PORT ?? 4180);
const mounts = [
  ["/mfe/catalog/", "apps/catalog/dist"],
  ["/mfe/cart/", "apps/cart/dist"],
  ["/pkg/auth-fetch.js", "packages/auth-fetch/dist/index.js"],
  ["/", "apps/shell/dist"],
];
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".map": "application/json" };

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const [prefix, dir] = mounts.find(([p]) => path.startsWith(p));
  const rel = prefix.endsWith(".js") ? "" : path.slice(prefix.length) || "index.html";
  const file = normalize(join(root, dir, rel));
  if (!file.startsWith(join(root, dir))) return void res.writeHead(403).end();
  try {
    const body = await readFile(file);
    res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream", "cache-control": "no-store" });
    res.end(body);
  } catch {
    // Rotas do shell (/produto/p1) caem no index.html; arquivos com extensão que não existem continuam 404.
    if (prefix === "/" && !extname(path)) {
      res.writeHead(200, { "content-type": "text/html", "cache-control": "no-store" });
      return void res.end(await readFile(join(root, dir, "index.html")));
    }
    res.writeHead(404).end("not found");
  }
}).listen(PORT, () => console.log(`lab on http://localhost:${PORT}/?variant=baseline`));
