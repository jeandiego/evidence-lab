import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { PetLabProvider } from "@/lib/lab-context"
import { createPetLab } from "@/lib/pet-lab"

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: 30_000 }, mutations: { retry: false } },
})
const lab = createPetLab()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="light" storageKey="pet-lab-theme">
      <QueryClientProvider client={queryClient}>
        <PetLabProvider lab={lab}>
          <App />
        </PetLabProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>
)
