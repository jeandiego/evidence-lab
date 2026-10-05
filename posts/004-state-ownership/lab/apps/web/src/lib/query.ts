import type { LabSnapshot } from "@pet-lab/contracts"
import type { QueryClient } from "@tanstack/react-query"

export const SESSION_ID = "guided-state-ownership"
export const labStateKey = ["lab-state", SESSION_ID] as const
export const petsKey = ["pets"] as const

export function applyCanonicalSnapshot(queryClient: QueryClient, snapshot: LabSnapshot) {
  queryClient.setQueryData(labStateKey, snapshot)
  return snapshot
}
