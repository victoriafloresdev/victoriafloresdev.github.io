import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    kind: z.enum(['production', 'research']),
    label: z.string(), // short badge text, e.g. "In production", "First author"
    org: z.string(),
    orgNote: z.string().optional(),
    role: z.string(),
    period: z.string(),
    summary: z.string(), // one sentence for cards and meta description
    metrics: z
      .array(z.object({ value: z.string(), label: z.string(), estimate: z.boolean().default(false) }))
      .default([]),
    stack: z.array(z.string()).default([]),
    links: z.array(z.object({ label: z.string(), href: z.string() })).default([]),
    note: z.string().optional(), // e.g. confidentiality disclaimer
    order: z.number(),
    featured: z.boolean().default(false),
  }),
});

export const collections = { projects };
