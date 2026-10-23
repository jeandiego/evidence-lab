// JWT HS256 feito à mão com node:crypto, mais a tabela de refresh tokens (com rotação opcional).
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { config, stats } from "./state.ts";

const SECRET = process.env.LAB_JWT_SECRET ?? "lab-005-not-a-secret";

export type Claims = { sub: string; typ: "access" | "refresh"; jti: string; iat: number; iatMs?: number; exp: number };
export type Tokens = { access_token: string; refresh_token: string };

const b64 = (v: string) => Buffer.from(v).toString("base64url");
const mac = (data: string) => createHmac("sha256", SECRET).update(data).digest("base64url");
const now = () => Math.floor(Date.now() / 1000);

function sign(claims: Claims): string {
  const head = `${b64(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${b64(JSON.stringify(claims))}`;
  return `${head}.${mac(head)}`;
}

export function verify(token: string): { claims: Claims } | { error: "malformed" | "signature" | "expired" } {
  const parts = token.split(".");
  if (parts.length !== 3) return { error: "malformed" };
  const expected = Buffer.from(mac(`${parts[0]}.${parts[1]}`));
  const given = Buffer.from(parts[2]);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { error: "signature" };
  try {
    const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString()) as Claims;
    return claims.exp <= now() ? { error: "expired" } : { claims };
  } catch {
    return { error: "malformed" };
  }
}

// jti do refresh token -> estado. Reiniciar o processo invalida todas as sessões.
const sessions = new Map<string, { user: string; used: boolean; usedAt: number }>();

export function resetSessions() {
  sessions.clear();
}

export function issueTokens(user: string, opts: { expiredAccess?: boolean } = {}): Tokens {
  const iat = now();
  const refreshJti = randomUUID();
  sessions.set(refreshJti, { user, used: false, usedAt: 0 });
  return {
    access_token: sign({ sub: user, typ: "access", jti: randomUUID(), iat, iatMs: Date.now(), exp: opts.expiredAccess ? iat - 1 : iat + config.accessTtlSec }),
    refresh_token: sign({ sub: user, typ: "refresh", jti: refreshJti, iat, exp: iat + config.refreshTtlSec }),
  };
}

/** Valida o access token do header Authorization. */
export function authenticate(header: string | undefined): { user: string } | { error: string } {
  const token = header?.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return { error: "missing token" };
  const result = verify(token);
  if ("error" in result) return { error: result.error };
  if (result.claims.typ !== "access") return { error: "wrong token type" };
  if ((result.claims.iatMs ?? 0) <= config.revokedBefore) return { error: "revoked" };
  return { user: result.claims.sub };
}

export class AuthError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

export function refresh(token: string): Tokens {
  stats.refresh.calls++;
  const fail = (status: number, code: string): never => {
    stats.refresh.failed++;
    throw new AuthError(status, code);
  };
  if (config.failRefresh || Math.random() < config.refreshFailRate) fail(503, "REFRESH_UNAVAILABLE");
  const result = verify(token);
  if ("error" in result || result.claims.typ !== "refresh") return fail(401, "REFRESH_INVALID");
  const session = sessions.get(result.claims.jti);
  if (!session) return fail(401, "REFRESH_INVALID");
  if (config.rotation && session.used) {
    // Dentro da tolerância o reuso é aceito e um novo par é emitido; fora dela, é reuso de verdade.
    const withinLeeway = config.rotationLeewaySec > 0 && Date.now() - session.usedAt <= config.rotationLeewaySec * 1000;
    if (!withinLeeway) {
      stats.refresh.reused++;
      return fail(401, "REFRESH_REUSED");
    }
    stats.refresh.overlapped++;
  }
  if (!session.used) session.usedAt = Date.now(); // a janela conta a partir do primeiro uso
  session.used = true;
  stats.refresh.ok++;
  return issueTokens(session.user);
}
