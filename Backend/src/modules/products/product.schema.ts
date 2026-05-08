import { z } from 'zod';

export const createProductSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(100),
    description: z.string().min(10),
    price: z.preprocess((val) => Number(val), z.number().int().min(0)), // Paisa/Cents
    condition: z.enum(['new', 'like_new', 'good', 'fair', 'poor']),
    category: z.enum(['clothing', 'shoes', 'accessories', 'bags', 'other']),
    stock: z.preprocess((val) => (val ? Number(val) : 1), z.number().int().min(0)).optional(),
    tags: z.preprocess((val) => (typeof val === 'string' ? val.split(',') : val), z.array(z.string())).optional(),
  }),
});

export const updateProductSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(100).optional(),
    description: z.string().min(10).optional(),
    price: z.preprocess((val) => Number(val), z.number().int().min(0)).optional(),
    condition: z.enum(['new', 'like_new', 'good', 'fair', 'poor']).optional(),
    category: z.enum(['clothing', 'shoes', 'accessories', 'bags', 'other']).optional(),
    stock: z.preprocess((val) => Number(val), z.number().int().min(0)).optional(),
    isAvailable: z.boolean().optional(),
    tags: z.preprocess((val) => (typeof val === 'string' ? val.split(',') : val), z.array(z.string())).optional(),
  }),
});

export const productQuerySchema = z.object({
  query: z.object({
    page: z.string().optional().transform((v) => (v ? parseInt(v) : 1)),
    limit: z.string().optional().transform((v) => (v ? parseInt(v) : 20)),
    search: z.string().optional(),
    category: z.enum(['clothing', 'shoes', 'accessories', 'bags', 'other']).optional(),
    condition: z.enum(['new', 'like_new', 'good', 'fair', 'poor']).optional(),
    minPrice: z.string().optional().transform((v) => (v ? parseInt(v) : undefined)),
    maxPrice: z.string().optional().transform((v) => (v ? parseInt(v) : undefined)),
    sort: z.enum(['price_asc', 'price_desc', 'newest', 'popular']).optional().default('newest'),
  }),
});
