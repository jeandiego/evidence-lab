import type { LabSnapshot } from "@pet-lab/contracts"

export type DiffStatus = "synced" | "diverged" | "pending"
export type DiffRow = {
  field: "pet" | "coverage.kind" | "service.price" | "subtotal" | "discount" | "total" | "revision"
  server: string
  client: string
  status: DiffStatus
}

const show = (value: unknown) => (value === undefined ? "—" : String(value))

export function compareSnapshots(server?: LabSnapshot, client?: LabSnapshot): DiffRow[] {
  const pairs = [
    ["pet", server?.pet.name, client?.pet.name],
    ["coverage.kind", server?.coverage.kind, client?.coverage.kind],
    ["service.price", server?.items[0]?.priceCents, client?.items[0]?.priceCents],
    ["subtotal", server?.subtotalCents, client?.subtotalCents],
    ["discount", server?.discountCents, client?.discountCents],
    ["total", server?.totalCents, client?.totalCents],
    ["revision", server?.revision, client?.revision],
  ] as const

  return pairs.map(([field, serverValue, clientValue]) => ({
    field,
    server: show(serverValue),
    client: show(clientValue),
    status: serverValue === undefined || clientValue === undefined ? "pending" : serverValue === clientValue ? "synced" : "diverged",
  }))
}
