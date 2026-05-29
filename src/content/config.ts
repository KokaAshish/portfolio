import { defineCollection, z } from 'astro:content';

const projects = defineCollection({
  type: 'content',
  schema: z.object({
    title:    z.string(),
    summary:  z.string(),
    year:     z.number(),
    tags:     z.array(z.string()),
    problem:  z.string(),
    outcome:  z.string(),
    lessons:  z.string(),
    link:     z.string().url().optional(),
    github:   z.string().url().optional(),
    featured: z.boolean().default(false),
    hidden:   z.boolean().default(false),
  }),
});

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title:    z.string(),
    excerpt:  z.string(),
    date:     z.date(),
    category: z.string(),
    tags:     z.array(z.string()).optional(),
    draft:    z.boolean().default(false),
  }),
});

expor