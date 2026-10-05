import type { LabSnapshot } from "@pet-lab/contracts"
import { create } from "zustand"
import { devtools } from "zustand/middleware"

type A1State = {
  snapshot?: LabSnapshot
  hydrate(snapshot: LabSnapshot): void
  applyPetOnly(serverSnapshot: LabSnapshot): void
  clear(): void
}

export const useA1Store = create<A1State>()(
  devtools(
    (set) => ({
      snapshot: undefined,
      hydrate: (snapshot) => set({ snapshot }, false, "scenario/hydrate-all"),
      applyPetOnly: (serverSnapshot) =>
        set(
          (state) => ({
            snapshot: state.snapshot ? { ...state.snapshot, pet: serverSnapshot.pet } : serverSnapshot,
          }),
          false,
          "scenario/apply-pet-only-intentional-bug",
        ),
      clear: () => set({ snapshot: undefined }, false, "scenario/clear"),
    }),
    { name: "pet-lab-a1" },
  ),
)

export const resetA1Store = () => useA1Store.getState().clear()
