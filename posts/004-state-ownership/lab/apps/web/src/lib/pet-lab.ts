import type { LabSnapshot, PetOption, TimelineEvent } from "@pet-lab/contracts"

type GraphQLResponse<T> = { data?: T; errors?: { message: string }[] }

export type PetLabGateway = {
  getState(sessionId: string): Promise<LabSnapshot>
  listPets(): Promise<PetOption[]>
  selectPet(sessionId: string, petId: string): Promise<LabSnapshot>
  reset(sessionId: string): Promise<LabSnapshot>
}

export type LabLogger = {
  log(event: Omit<TimelineEvent, "id" | "at">): void
  clear(): void
  subscribe(listener: () => void): () => void
  getSnapshot(): TimelineEvent[]
}

export type PetLab = {
  gateway: PetLabGateway
  logger: LabLogger
  clock: () => Date
}

const SNAPSHOT_FIELDS = `
  sessionId pet { id name species } coverage { kind label }
  items { id name priceCents } subtotalCents discountCents totalCents revision updatedAt
`

function createLogger(clock: () => Date): LabLogger {
  let events: TimelineEvent[] = []
  const listeners = new Set<() => void>()
  return {
    log(event) {
      events = [
        { ...event, id: `${clock().getTime()}-${events.length}`, at: clock().toISOString() },
        ...events,
      ].slice(0, 30)
      listeners.forEach((listener) => listener())
    },
    clear() {
      events = []
      listeners.forEach((listener) => listener())
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getSnapshot: () => events,
  }
}

export function createPetLab({
  endpoint = "/graphql",
  clock = () => new Date(),
}: { endpoint?: string; clock?: () => Date } = {}): PetLab {
  const logger = createLogger(clock)

  async function request<T>(operation: string, query: string, variables: Record<string, string>): Promise<T> {
    logger.log({ source: "graphql", label: `${operation} → request`, detail: JSON.stringify(variables) })
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ operationName: operation, query, variables }),
    })
    const payload = (await response.json()) as GraphQLResponse<T>
    if (!response.ok || payload.errors?.length || !payload.data) {
      const message = payload.errors?.map((error) => error.message).join("; ") ?? `HTTP ${response.status}`
      logger.log({ source: "graphql", label: `${operation} → erro`, detail: message })
      throw new Error(message)
    }
    logger.log({ source: "graphql", label: `${operation} → sucesso`, detail: "Snapshot canônico recebido" })
    return payload.data
  }

  return {
    clock,
    logger,
    gateway: {
      async getState(sessionId) {
        const data = await request<{ labState: LabSnapshot }>(
          "LabState",
          `query LabState($sessionId: ID!) { labState(sessionId: $sessionId) { ${SNAPSHOT_FIELDS} } }`,
          { sessionId },
        )
        return data.labState
      },
      async listPets() {
        const data = await request<{ pets: PetOption[] }>(
          "Pets",
          `query Pets { pets { id name species kind label priceCents } }`,
          {},
        )
        return data.pets
      },
      async selectPet(sessionId, petId) {
        const data = await request<{ selectPet: LabSnapshot }>(
          "SelectPet",
          `mutation SelectPet($sessionId: ID!, $petId: ID!) { selectPet(sessionId: $sessionId, petId: $petId) { ${SNAPSHOT_FIELDS} } }`,
          { sessionId, petId },
        )
        return data.selectPet
      },
      async reset(sessionId) {
        const data = await request<{ resetScenario: LabSnapshot }>(
          "ResetScenario",
          `mutation ResetScenario($sessionId: ID!) { resetScenario(sessionId: $sessionId) { ${SNAPSHOT_FIELDS} } }`,
          { sessionId },
        )
        return data.resetScenario
      },
    },
  }
}
