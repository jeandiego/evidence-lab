import { beforeEach, describe, expect, it } from "vitest"
import type { LabSnapshot } from "@pet-lab/contracts"
import { resetA1Store, useA1Store } from "./a1-store"

const initial: LabSnapshot = {
  sessionId: "test",
  pet: { id: "luna", name: "Luna", species: "Gata" },
  coverage: { kind: "PLAN", label: "Plano" },
  items: [{ id: "vaccine", name: "Vacina", priceCents: 0 }],
  subtotalCents: 0,
  discountCents: 0,
  totalCents: 0,
  revision: 1,
  updatedAt: "2026-01-01T00:00:00.000Z",
}

beforeEach(resetA1Store)

describe("store A1", () => {
  it("reproduz a sincronização incompleta sem alterar o snapshot do servidor", () => {
    useA1Store.getState().hydrate(initial)
    const server = {
      ...initial,
      pet: { id: "thor", name: "Thor", species: "Cachorro" },
      coverage: { kind: "PRIVATE" as const, label: "Particular" },
      items: [{ ...initial.items[0]!, priceCents: 14000 }],
      subtotalCents: 14000,
      discountCents: 2000,
      totalCents: 12000,
      revision: 2,
    }
    useA1Store.getState().applyPetOnly(server)
    expect(server.totalCents).toBe(12000)
    expect(useA1Store.getState().snapshot).toMatchObject({
      pet: { id: "thor" },
      coverage: { kind: "PLAN" },
      subtotalCents: 0,
      discountCents: 0,
      totalCents: 0,
      revision: 1,
    })
  })
})
