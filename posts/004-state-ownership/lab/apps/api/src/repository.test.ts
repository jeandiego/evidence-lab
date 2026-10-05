import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createYoga } from "graphql-yoga"
import { pool } from "./database/client.js"
import { LabRepository } from "./repository.js"
import { schema } from "./schema.js"

const repository = new LabRepository(pool)
const sessionId = "repository-test"

beforeAll(async () => {
  await repository.reset(sessionId)
})

afterAll(async () => {
  await pool.end()
})

describe("LabRepository com PostgreSQL real", () => {
  it("restaura o cenário coberto e gratuito", async () => {
    const state = await repository.reset(sessionId)
    expect(state.pet.id).toBe("luna")
    expect(state.coverage.kind).toBe("PLAN")
    expect(state.totalCents).toBe(0)
    expect(state.revision).toBe(1)
  })

  it("troca o PET e recalcula cobertura e preço atomicamente", async () => {
    const state = await repository.selectPet(sessionId, "thor")
    expect(state.pet.id).toBe("thor")
    expect(state.coverage.kind).toBe("PRIVATE")
    expect(state.items[0]?.priceCents).toBe(14000)
    expect(state.subtotalCents).toBe(14000)
    expect(state.discountCents).toBe(2000)
    expect(state.totalCents).toBe(12000)
    expect(state.revision).toBe(2)
  })

  it("expõe o mesmo recálculo pelo resolver GraphQL", async () => {
    const yoga = createYoga({ schema, context: () => ({ repository }) })
    await repository.reset("graphql-test")
    const response = await yoga.fetch("http://pet-lab.local/graphql", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query: `mutation SelectPet($sessionId: ID!, $petId: ID!) {
          selectPet(sessionId: $sessionId, petId: $petId) {
            pet { id }
            coverage { kind }
            totalCents
            revision
          }
        }`,
        variables: { sessionId: "graphql-test", petId: "nina" },
      }),
    })
    const payload = (await response.json()) as {
      data: { selectPet: { pet: { id: string }; coverage: { kind: string }; totalCents: number; revision: number } }
    }
    expect(payload.data.selectPet).toEqual({
      pet: { id: "nina" },
      coverage: { kind: "PARTNERSHIP" },
      totalCents: 4500,
      revision: 2,
    })
  })
})
