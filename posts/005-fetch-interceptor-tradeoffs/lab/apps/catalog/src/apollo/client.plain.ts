import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client/core";
import { lab } from "@shop-lab/lab-protocol";

// Client padrão, sem lógica de auth: o patch em window.fetch (instalado no shell) cuida do token e do refresh.
export const createClient = () => new ApolloClient({ link: new HttpLink({ uri: lab().bffUrl }), cache: new InMemoryCache() });
