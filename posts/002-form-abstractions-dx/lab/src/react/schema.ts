import { z } from 'zod'

export const accountSchema = z.object({
  name: z.string().trim().min(2, 'Use pelo menos 2 caracteres.'),
  email: z.email('Informe um e-mail válido.'),
  role: z.string().min(1, 'Selecione um papel.'),
  bio: z.string().trim().max(120, 'Use no máximo 120 caracteres.'),
  terms: z.boolean().refine(Boolean, 'Aceite os termos.'),
})
