export type CoverageKind = "PLAN" | "PARTNERSHIP" | "PRIVATE"

export type Pet = {
  id: string
  name: string
  species: string
}

export type Coverage = {
  kind: CoverageKind
  label: string
}

export type ServiceItem = {
  id: string
  name: string
  priceCents: number
}

export type LabSnapshot = {
  sessionId: string
  pet: Pet
  coverage: Coverage
  items: ServiceItem[]
  subtotalCents: number
  discountCents: number
  totalCents: number
  revision: number
  updatedAt: string
}

export type PetOption = Pet & Coverage & { priceCents: number }

export type TimelineEvent = {
  id: string
  at: string
  source: "graphql" | "zustand" | "query-cache" | "scenario"
  label: string
  detail: string
}
