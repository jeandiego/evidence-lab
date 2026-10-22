import type { ApolloClient } from "@apollo/client/core";
import { lab } from "@shop-lab/lab-protocol";

// Cada variante troca só este arquivo de client; o resto do MFE é idêntico.
const clients = import.meta.glob<{ createClient: () => ApolloClient<unknown> }>("./apollo/client.*.ts");
const file = { baseline: "baseline", patch: "plain", utility: "utility" } as const;

let client: Promise<ApolloClient<unknown>> | undefined;
export const getClient = () => (client ??= clients[`./apollo/client.${file[lab().variant]}.ts`]().then((m) => m.createClient()));
