import { describe, expect, it } from "vitest"
import type { LabSnapshot } from "@pet-lab/contracts"
import { compareSnapshots } from "./diff"

const snapshot: LabSnapshot = {
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

describe("compareSnapshots", () => {
  it("marca snapshots iguais como sincronizados", () => {
    expect(compareSnapshots(snapshot, structuredClone(snapshot)).every((row) => row.status === "synced")).toBe(true)
  })

  it("detecta campos ausentes", () => {
    expect(compareSnapshots(snapshot, undefined).every((row) => row.status === "pending")).toBe(true)
  })

  it("detecta divergências em arrays e valores monetários", () => {
    const client = { ...snapshot, items: [{ ...snapshot.items[0]!, priceCents: 12000 }], totalCents: 12000 }
    const rows = compareSnapshots(snapshot, client)
    expect(rows.find((row) => row.field === "service.price")?.status).toBe("diverged")
    expect(rows.find((row) => row.field === "total")?.status).toBe("diverged")
  })

  it("detecta um novo campo de contrato esquecido pela projeção cliente", () => {
    const client = { ...snapshot, discountCents: 0 }
    const server = { ...snapshot, subtotalCents: 14000, discountCents: 2000, totalCents: 12000 }
    const rows = compareSnapshots(server, client)
    expect(rows.find((row) => row.field === "discount")?.status).toBe("diverged")
  })
})
