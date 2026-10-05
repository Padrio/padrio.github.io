import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';
import sitemap from '@astrojs/sitemap';
// Sätteri is Astro 7's default Markdown processor, and `satteri()` is the only way to reach
// its plugin pipeline — `markdown.rehypePlugins` is the legacy unified path and refuses to
// build without @astrojs/markdown-remark, which rule 8 would make a board question. This
// import is not a new dependency: @astrojs/markdown-satteri is a plain (not optional)
// dependency of astro, pinned at an exact version in package-lock.json, so npm ci always
// puts it in node_modules. It is deliberately not added to package.json — same footing as
// sharp in CLAUDE.md, rule 6: present and usable, not declared.
import { satteri } from '@astrojs/markdown-satteri';
import contentImages from './plugins/satteri-content-images.mjs';
import assertContentImages from './plugins/assert-content-images.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://pkrason.de',
  integrations: [
    icon(),
    sitemap(),
    // The gate for the plugin below. It has to sit here and not in the plugin itself: a
    // throw during the markdown render is swallowed by the glob-loader and the build still
    // exits 0, a throw in astro:build:done does not. Details in its own header.
    assertContentImages()
  ],
  // loading="lazy" plus the intrinsic width/height for every image the markdown of a project
  // renders. The sizes are read out of the WebP header at build time, so they cannot drift
  // from the file; why both attributes belong in one change is in the plugin's own header.
  // satteri() with no `features` keeps the processor's own defaults (gfm and smart
  // punctuation on), so this adds a plugin and changes nothing else about the rendering.
  markdown: {
    processor: satteri({ hastPlugins: [contentImages] })
  },
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
  }
});
