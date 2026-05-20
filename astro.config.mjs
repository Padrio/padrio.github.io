import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import icon from 'astro-icon';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://pkrason.de',
  integrations: [
    tailwind(),
    icon(),
    sitemap()
  ],
  redirects: {
    '/projects/vendbridge-panel': {
      status: 301,
      destination: '/projects/konteo-panel'
    },
    '/projects/vendprovision': {
      status: 301,
      destination: '/projects/konteo-provision'
    }
  },
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: true
    }
  }
});
