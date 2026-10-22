import { buildSchema, graphql, Kind, parse, type OperationDefinitionNode } from "graphql";
import { addToCart, cartOf, PRODUCTS, USERS } from "./data.ts";
import { AuthError, authenticate, issueTokens, refresh } from "./auth.ts";
import { config, record, stats } from "./state.ts";

const schema = buildSchema(/* GraphQL */ `
  type Product { id: ID!, name: String!, priceCents: Int! }
  type CartItem { productId: ID!, qty: Int! }
  type Tokens { access_token: String!, refresh_token: String! }
  type Query { products: [Product!]!, cart: [CartItem!]! }
  type Mutation {
    login(user: String!, password: String!): Tokens!
    refreshToken(token: String!): Tokens!
    addToCart(productId: ID!): [CartItem!]!
  }
`);

type Ctx = { user: string };

const rootValue = {
  products: () => PRODUCTS,
  cart: (_: unknown, ctx: Ctx) => cartOf(ctx.user),
  addToCart: ({ productId }: { productId: string }, ctx: Ctx) => addToCart(ctx.user, productId),
  login: ({ user, password }: { user: string; password: string }) => {
    if (USERS[user] !== password) throw new AuthError(401, "BAD_CREDENTIALS");
    return issueTokens(user);
  },
  refreshToken: ({ token }: { token: string }) => refresh(token),
};

const PUBLIC_FIELDS = new Set(["login", "refreshToken"]);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type GraphqlBody = { query?: unknown; variables?: Record<string, unknown>; operationName?: string };

export async function handleGraphql(body: GraphqlBody, authHeader: string | undefined) {
  if (typeof body.query !== "string") return { status: 400, body: { errors: [{ message: "query required" }] } };
  let doc;
  try {
    doc = parse(body.query);
  } catch (e) {
    return { status: 400, body: { errors: [{ message: (e as Error).message }] } };
  }
  const operation = doc.definitions.find(
    (d): d is OperationDefinitionNode => d.kind === Kind.OPERATION_DEFINITION && (!body.operationName || d.name?.value === body.operationName),
  );
  const fields = (operation?.selectionSet.selections ?? []).flatMap((s) => (s.kind === Kind.FIELD ? [s.name.value] : []));
  const op = fields[0] ?? "unknown";
  stats.operations[op] = (stats.operations[op] ?? 0) + 1;

  let user = "";
  if (!fields.every((f) => PUBLIC_FIELDS.has(f))) {
    const auth = authenticate(authHeader);
    if ("error" in auth) {
      stats.unauthorized++;
      record("op", op, 401, auth.error);
      return { status: 401, body: { errors: [{ message: "UNAUTHENTICATED", extensions: { code: "UNAUTHENTICATED", reason: auth.error } }] } };
    }
    user = auth.user;
  }

  await sleep(PUBLIC_FIELDS.has(op) ? config.refreshLatencyMs : config.latencyMs);
  const result = await graphql({ schema, source: body.query, rootValue, contextValue: { user }, variableValues: body.variables, operationName: body.operationName });
  const authError = result.errors?.map((e) => e.originalError).find((e): e is AuthError => e instanceof AuthError);
  const status = authError?.status ?? 200;
  record(op === "refreshToken" ? "refresh" : "op", op, status, authError?.code);
  return { status, body: authError ? { errors: [{ message: authError.code, extensions: { code: authError.code } }], data: null } : result };
}
