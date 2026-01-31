import { defineCollection, z } from 'astro:content';

const projectsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.string(),
    image: z.string().optional(),
    tags: z.array(z.string()).optional(),
    github: z.string().url().optional(),
    demo: z.string().url().optional(),
  }),
});

export const collections = {
  'projects': projectsCollection,
};
