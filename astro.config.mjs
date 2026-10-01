import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://pkrason.de',
  integrations: [
    icon(),
    sitemap()
  ],
  // Tailwind 4 kommt als Vite-Plugin; die Integration @astrojs/tailwind ist aufgegeben
  vite: {
    plugins: [tailwindcss()]
  },
  redirects: {
    '/projects/vendbridge-panel': {
      status: 301,
      destination: '/projects/konteo-panel'
    },
    '/projects/vendprovision': {
      status: 301,
      destination: '/projects/konteo-provision'
    },
    '/projects/toolstone-identity-tracker': {
      status: 301,
      destination: '/'
    },
    '/projects/toolstone-privacy-manager': {
      status: 301,
      destination: '/'
    }
  },
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: true
    }
  }
});
