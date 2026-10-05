import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { pool } from "./client.js"

const sqlPath = fileURLToPath(new URL("../../sql/001-schema.sql", import.meta.url))
await pool.query(await readFile(sqlPath, "utf8"))
await pool.end()
console.log("Migration aplicada.")
