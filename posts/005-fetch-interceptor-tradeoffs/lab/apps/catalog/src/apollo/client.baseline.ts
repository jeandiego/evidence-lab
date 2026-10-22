import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client/core";
import { setContext } from "@apollo/client/link/context";
import { lab } from "@shop-lab/lab-protocol";

// Como eram os MFEs: cada um com seu próprio authLink e sua própria lógica de refresh.
type Session = { token: string; refreshToken: string };
const read = () => JSON.parse(localStorage.getItem(lab().storageKey) ?? "null") as Session | null;
const expired = (jwt: string) => {
  try {
    return Date.now() >= JSON.parse(atob(jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).exp * 1000;
  } catch {
    return true;
  }
};

async function refresh() {
  const session = read();
  const res = await fetch(lab().bffUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: "mutation refreshToken($token: String!) { refreshToken(token: $token) { access_token refresh_token } }",
      variables: { token: session?.refreshToken },
    }),
  });
  const tokens = (await res.json())?.data?.refreshToken;
  if (!tokens) {
    localStorage.removeItem(lab().storageKey); // refresh falhou: derruba a sessão
    lab().onExpired();
    throw new Error("refresh failed");
  }
  localStorage.setItem(lab().storageKey, JSON.stringify({ token: tokens.access_token, refreshToken: tokens.refresh_token }));
}

export const createClient = () => {
  let refreshing: Promise<void> | undefined; // evita refresh duplicado só dentro deste MFE
  const authLink = setContext(async (_, { headers }) => {
    let session = read();
    if (session && expired(session.token)) {
      await (refreshing ??= refresh().finally(() => (refreshing = undefined)));
      session = read();
    }
    return { headers: { ...headers, authorization: session ? `Bearer ${session.token}` : "" } };
  });
  return new ApolloClient({ link: authLink.concat(new HttpLink({ uri: lab().bffUrl })), cache: new InMemoryCache() });
};
