import { readdirSync, readFileSync } from 'node:fs';
import { webpCanvasSize } from './satteri-content-images.mjs';

// The gate for satteri-content-images.mjs, and the reason it exists is worth writing down:
// a throw inside the markdown plugin does NOT fail the build. Astro's glob-loader catches
// it, logs `[ERROR] [glob-loader] Error rendering <file>` and carries on to exit 0 — and the
// page it shipped had an empty `.prose-project` (measured: /projects/konteo-provision/ went
// from 26.332 to 16.532 bytes with no body at all). This repository has no tests and no
// linter, so `npm run build` and the Tailwind-3 grep are the only two gates there are
// (CLAUDE.md, rule 3); a failure mode that logs an error and still exits 0 passes both.
//
// A throw in `astro:build:done` does exit 1 (verified in this worktree), so the check runs
// here, against the emitted HTML rather than against the render. It asserts the acceptance
// criteria of PRI-126 directly:
//
//   1. every image the markdown of a project references is present in that project's page
//      and carries loading="lazy" plus width/height matching the file on disk;
//   2. the hero image from the frontmatter carries no `loading` at all — it is above the
//      fold and has to stay eager.
//
// Expectations come from the filesystem, not from state the markdown plugin leaves behind,
// so a cached render cannot make this check pass by doing nothing. Point 1 is deliberately
// phrased over the images the markdown names: an assertion of the form "every img that has
// the attributes has them correctly" would be vacuously true on exactly the empty-body page
// this check exists to catch.
//
// One trap for whoever verifies this locally: the content layer caches rendered markdown in
// `node_modules/.astro/data-store.json`, and editing the markdown plugin does NOT invalidate
// it — `rm -rf dist .astro` does not either, because that store is under node_modules. A
// plugin edit then has no effect on dist at all and this check passes on the previous
// render. Clear `node_modules/.astro` when testing a change to the pipeline. CI never sees
// it: `npm ci` starts without that directory.
const CONTENT_SUBDIR = 'content/projects';
const IMAGE_IN_MARKDOWN = /!\[[^\]]*\]\(\s*([^)\s]+)/g;
const FRONTMATTER_IMAGE = /^image:\s*["']?([^"'\n]+)["']?\s*$/m;
const IMG_TAG = /<img\b[^>]*>/g;
const ATTR = /([a-zA-Z-]+)(?:="([^"]*)")?/g;

function attrsOf(tag) {
  const out = {};
  // Skip the tag name itself, which the attribute pattern would otherwise read as a
  // valueless attribute.
  for (const m of tag.slice(4).matchAll(ATTR)) out[m[1]] = m[2] ?? '';
  return out;
}

// Fenced code blocks hold no real images. There is none in src/content today; stripping them
// keeps the expectation list right if one ever shows an ![...]() as an example.
function stripFences(md) {
  let inFence = false;
  return md.split('\n').filter((line) => {
    if (line.trimStart().startsWith('```')) { inFence = !inFence; return false; }
    return !inFence;
  }).join('\n');
}

export default function assertContentImages() {
  // astro:build:done is handed only { pages, routes, dir, logger } — the resolved config has
  // to be kept from the earlier hook rather than read off its parameters.
  let config;
  return {
    name: 'assert-content-images',
    hooks: {
      'astro:config:done': (options) => { config = options.config; },
      'astro:build:done': ({ dir, logger }) => {
        const contentDir = new URL(CONTENT_SUBDIR + '/', config.srcDir);
        const publicDir = config.publicDir;
        const problems = [];
        let checked = 0;

        const entries = readdirSync(contentDir).filter((f) => f.endsWith('.md'));
        if (entries.length === 0) {
          throw new Error(`[assert-content-images] no .md files under ${contentDir}`);
        }

        for (const file of entries) {
          const slug = file.replace(/\.md$/, '');
          const md = readFileSync(new URL(file, contentDir), 'utf8');
          const expected = [...stripFences(md).matchAll(IMAGE_IN_MARKDOWN)].map((m) => m[1]);
          const hero = md.match(FRONTMATTER_IMAGE)?.[1];
          if (expected.length === 0 && !hero) continue;

          const pageURL = new URL(`projects/${slug}/index.html`, dir);
          let html;
          try {
            html = readFileSync(pageURL, 'utf8');
          } catch (err) {
            problems.push(`${slug}: cannot read ${pageURL.pathname} (${err.code ?? err.message})`);
            continue;
          }
          const tags = [...html.matchAll(IMG_TAG)].map((m) => attrsOf(m[0]));

          for (const src of expected) {
            const hits = tags.filter((t) => t.src === src);
            if (hits.length !== 1) {
              problems.push(`${slug}: expected exactly one <img src="${src}">, found ${hits.length}`);
              continue;
            }
            const [img] = hits;
            checked += 1;
            if (img.loading !== 'lazy') {
              problems.push(`${slug}: ${src} has loading="${img.loading ?? '<none>'}", expected "lazy"`);
            }
            const { width, height } = webpCanvasSize(new URL(src.replace(/^\/+/, ''), publicDir));
            if (img.width !== String(width) || img.height !== String(height)) {
              problems.push(`${slug}: ${src} has width/height ${img.width ?? '<none>'}x`
                + `${img.height ?? '<none>'}, the file is ${width}x${height}`);
            }
          }

          if (hero) {
            const heroTag = tags.find((t) => t.src === hero && t.loading === undefined);
            if (!heroTag) {
              const lazyHero = tags.find((t) => t.src === hero);
              problems.push(lazyHero
                ? `${slug}: hero ${hero} carries loading="${lazyHero.loading}"; it is above the fold and must stay eager`
                : `${slug}: hero ${hero} is not rendered without a loading attribute`);
            }
          }
        }

        if (problems.length > 0) {
          throw new Error('[assert-content-images] ' + problems.length + ' problem(s):\n  '
            + problems.join('\n  '));
        }
        logger.info(`${checked} markdown image(s) carry loading="lazy" and their file's `
          + 'width/height; every hero is eager');
      },
    },
  };
}
