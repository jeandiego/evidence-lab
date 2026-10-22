import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client/core";
import { authFetch } from "@shop-lab/auth-fetch";
import { lab } from "@shop-lab/lab-protocol";

export const createClient = () =>
  new ApolloClient({ link: new HttpLink({ uri: lab().bffUrl, fetch: authFetch }), cache: new InMemoryCache() });
