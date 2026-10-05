import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it } from "vitest"
import type { LabSnapshot } from "@pet-lab/contracts"
import { applyCanonicalSnapshot, labStateKey } from "./query"

describe("state ownership A2", () => {
  it("usa a resposta canônica como única cópia remota no Query Cache", () => {
    const queryClient = new QueryClient()
    const snapshot = { sessionId: "test", revision: 2 } as LabSnapshot
    applyCanonicalSnapshot(queryClient, snapshot)
    expect(queryClient.getQueryData(labStateKey)).toBe(snapshot)
  })
})
