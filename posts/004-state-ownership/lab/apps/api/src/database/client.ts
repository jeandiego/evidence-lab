import pg from "pg"

export const databaseUrl = process.env.DATABASE_URL ?? "postgres://pet_lab:pet_lab@localhost:5438/pet_lab"

export const pool = new pg.Pool({ connectionString: databaseUrl })
