import { z } from 'zod';

export const newOrderSchema = z.object({
  mode: z.enum(['CATALOGO', 'IA']),
  productType: z.enum(['LLAVERO', 'IMAN_NEVERA', 'FIGURA']),
  description: z.string(),
  includeNFC: z.boolean().optional(),
  images: z.array(z.instanceof(File)).optional(),
  modelId: z.string().optional(),
  prompt: z.string().optional(),
  negativePrompt: z.string().optional(),
});
export type NewOrderInput = z.infer<typeof newOrderSchema>;
