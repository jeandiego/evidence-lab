import { createContext, use, type PropsWithChildren } from "react"
import type { PetLab } from "./pet-lab"

const PetLabContext = createContext<PetLab | null>(null)

export function PetLabProvider({ lab, children }: PropsWithChildren<{ lab: PetLab }>) {
  return <PetLabContext value={lab}>{children}</PetLabContext>
}

export function usePetLab() {
  const lab = use(PetLabContext)
  if (!lab) throw new Error("usePetLab precisa estar dentro de PetLabProvider")
  return lab
}
