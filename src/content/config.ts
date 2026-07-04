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
    // Shown in the "Selected Works" grid on the home page (detail page always exists)
    featured: z.boolean().default(true),
    // Highlights the card with a FLAGSHIP badge
    flagship: z.boolean().default(false),
  }),
});

export const collections = {
  'projects': projectsCollection,
};
