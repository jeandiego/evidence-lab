import pg from "pg"

const databaseUrl = process.env.DATABASE_URL ?? "postgres://pet_lab:pet_lab@localhost:5438/pet_lab"
const deadline = Date.now() + 30_000

while (Date.now() < deadline) {
  const client = new pg.Client({ connectionString: databaseUrl })
  try {
    await client.connect()
    await client.query("select 1")
    await client.end()
    console.log("PostgreSQL pronto.")
    process.exit(0)
  } catch {
    await client.end().catch(() => undefined)
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
}

console.error("PostgreSQL não ficou disponível em 30 segundos.")
process.exit(1)
