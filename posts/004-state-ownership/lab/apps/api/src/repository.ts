import type { LabSnapshot, PetOption } from "@pet-lab/contracts"
import type { Pool, PoolClient } from "pg"

type SnapshotRow = {
  session_id: string
  id: string
  name: string
  species: string
  coverage_kind: LabSnapshot["coverage"]["kind"]
  coverage_label: string
  service_price_cents: number
  discount_cents: number
  revision: number
  updated_at: Date
}

const DEFAULT_PET_ID = "luna"

export class LabRepository {
  constructor(private readonly pool: Pool) {}

  async listPets(): Promise<PetOption[]> {
    const result = await this.pool.query<SnapshotRow>(
      "select id, name, species, coverage_kind, coverage_label, service_price_cents, discount_cents from pets order by name",
    )
    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      species: row.species,
      kind: row.coverage_kind,
      label: row.coverage_label,
      priceCents: row.service_price_cents - row.discount_cents,
    }))
  }

  async getState(sessionId: string): Promise<LabSnapshot> {
    await this.ensureSession(sessionId)
    return this.readSnapshot(this.pool, sessionId)
  }

  async reset(sessionId: string): Promise<LabSnapshot> {
    await this.pool.query(
      `insert into lab_sessions (session_id, selected_pet_id, revision, updated_at)
       values ($1, $2, 1, now())
       on conflict (session_id) do update
       set selected_pet_id = excluded.selected_pet_id, revision = 1, updated_at = now()`,
      [sessionId, DEFAULT_PET_ID],
    )
    return this.readSnapshot(this.pool, sessionId)
  }

  async selectPet(sessionId: string, petId: string): Promise<LabSnapshot> {
    const client = await this.pool.connect()
    try {
      await client.query("begin")
      await this.ensureSession(sessionId, client)
      const pet = await client.query("select id from pets where id = $1", [petId])
      if (pet.rowCount === 0) throw new Error(`PET desconhecido: ${petId}`)
      await client.query(
        `update lab_sessions
         set selected_pet_id = $2, revision = revision + 1, updated_at = now()
         where session_id = $1`,
        [sessionId, petId],
      )
      const snapshot = await this.readSnapshot(client, sessionId)
      await client.query("commit")
      return snapshot
    } catch (error) {
      await client.query("rollback")
      throw error
    } finally {
      client.release()
    }
  }

  private async ensureSession(sessionId: string, client: Pool | PoolClient = this.pool) {
    await client.query(
      `insert into lab_sessions (session_id, selected_pet_id)
       values ($1, $2)
       on conflict (session_id) do nothing`,
      [sessionId, DEFAULT_PET_ID],
    )
  }

  private async readSnapshot(client: Pool | PoolClient, sessionId: string): Promise<LabSnapshot> {
    const result = await client.query<SnapshotRow>(
      `select s.session_id, s.revision, s.updated_at,
              p.id, p.name, p.species, p.coverage_kind, p.coverage_label, p.service_price_cents, p.discount_cents
       from lab_sessions s
       join pets p on p.id = s.selected_pet_id
       where s.session_id = $1`,
      [sessionId],
    )
    const row = result.rows[0]
    if (!row) throw new Error(`Sessão não encontrada: ${sessionId}`)
    return {
      sessionId: row.session_id,
      pet: { id: row.id, name: row.name, species: row.species },
      coverage: { kind: row.coverage_kind, label: row.coverage_label },
      items: [{ id: "annual-vaccine", name: "Vacina anual", priceCents: row.service_price_cents }],
      subtotalCents: row.service_price_cents,
      discountCents: row.discount_cents,
      totalCents: row.service_price_cents - row.discount_cents,
      revision: row.revision,
      updatedAt: row.updated_at.toISOString(),
    }
  }
}
