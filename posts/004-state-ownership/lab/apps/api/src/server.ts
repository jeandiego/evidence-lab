import { createServer } from "node:http"
import { createYoga } from "graphql-yoga"
import { pool } from "./database/client.js"
import { LabRepository } from "./repository.js"
import { schema } from "./schema.js"

const repository = new LabRepository(pool)
const yoga = createYoga({
  schema,
  graphqlEndpoint: "/graphql",
  cors: { origin: ["http://localhost:4174", "http://127.0.0.1:4174"] },
  context: () => ({ repository }),
})

const port = Number(process.env.PORT ?? 4004)
const server = createServer(yoga)
server.listen(port, () => console.log(`GraphQL: http://localhost:${port}/graphql`))

const shutdown = () => server.close(() => pool.end().finally(() => process.exit(0)))
process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
