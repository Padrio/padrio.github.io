import { readdirSync, readFileSync } from 'node:fs';
import { canvasSizeFor } from './satteri-content-images.mjs';

// The gate for satteri-content-images.mjs, and the reason it exists is worth writing down:
// a throw inside the markdown plugin does NOT fail the build. Astro's glob-loader catches
// it, logs `[ERROR] [glob-loader] Error rendering <file>` and carries on to exit 0 — and the
// page it shipped had an empty `.prose-project` (measured by injecting a throw into the hast
// visitor: /projects/konteo-provision/ fell from 26.416 bytes to roughly 16,5 KB with no body
// at all, the diff against the baseline a pure removal). The byte count is given as a
// magnitude on purpose: it depends on which throw you inject and on where the stack tip
// stands — two independent reproductions landed on 16.547 and mine on 16.532. The
// load-bearing part, exit 0 with an eviscerated page, reproduces exactly. This repository
// has no tests and no linter, so `npm run build` and the Tailwind-3 grep are the only two
// gates there are (CLAUDE.md, rule 3); a failure mode that logs an error and still exits 0
// passes both.
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
// What this gate does NOT see, stated so nobody reads it as complete: a raw <img> written
// directly in a .md. Such a tag never reaches the hast visitor — measured, it ships verbatim,
// without loading and without dimensions — and the scanner below matches only ![...](...) and
// its reference forms, so nothing here flags it either. That is the one fail-open gap in this
// change; every other hole below fails closed. There is no such tag in src/content today, and
// the gate is deliberately not extended to cover it: the markdown plugin cannot fix a raw tag,
// so flagging one would make the build red for something the pipeline is unable to put right.
//
// One trap for whoever verifies this locally: the content layer caches rendered markdown in
// `node_modules/.astro/data-store.json`, and editing the markdown plugin does NOT invalidate
// it — `rm -rf dist .astro` does not either, because that store is under node_modules. A
// plugin edit then has no effect on dist at all and this check passes on the previous
// render. Clear `node_modules/.astro` when testing a change to the pipeline. CI never sees
// it: `npm ci` starts without that directory.
const CONTENT_SUBDIR = 'content/projects';
const IMAGE_INLINE = /!\[[^\]]*\]\(\s*([^)\s]+)/g;
// Reference images in all three CommonMark shapes: full `![alt][id]`, collapsed `![id][]`
// and shortcut `![id]`. The label is captured, LINK_DEFINITION resolves it to a target.
const IMAGE_REFERENCE = /!\[([^\]]*)\](?:\[([^\]]*)\])?(?!\()/g;
const LINK_DEFINITION = /^ {0,3}\[([^\]]+)\]:\s*<?([^\s>]+)>?/gm;
const FRONTMATTER_IMAGE = /^image:\s*(?:"([^"]*)"|'([^']*)'|([^\s"'][^\n]*?))\s*$/m;
// Quote-aware on purpose. `[^>]*` stops at the first `>` even inside an attribute value, and
// HTML does not require it to be escaped there — an alt text reading "tap > read" then cut
// the tag in half, and the gate reported the attributes it had just failed to parse as
// missing. That is the most expensive kind of false alarm: it names as the cause the one
// thing that is not wrong, and sends the next author into this file instead of the alt text.
const IMG_TAG = /<img\b(?:[^>"']|"[^"]*"|'[^']*')*>/g;
const ATTR = /([a-zA-Z-]+)(?:="([^"]*)")?/g;

function attrsOf(tag) {
  const out = {};
  // Skip the tag name itself, which the attribute pattern would otherwise read as a
  // valueless attribute.
  for (const m of tag.slice(4).matchAll(ATTR)) out[m[1]] = m[2] ?? '';
  return out;
}

// Code shows images as examples rather than embedding them. There is none in src/content
// today; stripping code keeps the expectation list right if one ever does, because an example
// otherwise becomes a phantom expectation and a red build. Both fence markers count, and
// inline spans go too — a single `![alt](/x.webp)` in backticks was enough to stop the build.
function stripCode(md) {
  let fence = null;
  const lines = md.split('\n').filter((line) => {
    const marker = line.trimStart().match(/^(```+|~~~+)/)?.[1][0];
    if (fence) {
      if (marker === fence) fence = null;
      return false;
    }
    if (marker) { fence = marker; return false; }
    return true;
  });
  return lines.join('\n').replace(/`[^`\n]*`/g, '');
}

// Every image src the markdown of one file references, deduplicated. Deduplication matters:
// using one screenshot twice is an ordinary thing for an author to do, and counting the same
// src twice used to report one problem twice and fail the build over a page that was correct.
function markdownImageSrcs(md) {
  const body = stripCode(md);
  const definitions = new Map();
  for (const m of body.matchAll(LINK_DEFINITION)) {
    definitions.set(m[1].trim().toLowerCase(), m[2]);
  }
  const srcs = [...body.matchAll(IMAGE_INLINE)].map((m) => m[1]);
  for (const m of body.matchAll(IMAGE_REFERENCE)) {
    // The full form carries its label in group 2; collapsed and shortcut reuse the alt text.
    const label = (m[2]?.trim() || m[1].trim()).toLowerCase();
    const target = definitions.get(label);
    if (target) srcs.push(target);
  }
  return [...new Set(srcs)];
}

// Only the frontmatter block, not the first `image:` line anywhere in the document. The
// pattern is anchored per line, so in a file without a frontmatter image a body line reading
// `image: ...` would otherwise be taken for the hero and fail the build. Unreachable today —
// all five project files carry one, and the first match is the frontmatter's — which makes
// this scoping rather than a bug fix.
function frontmatter(md) {
  return md.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
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
        let external = 0;

        const entries = readdirSync(contentDir).filter((f) => f.endsWith('.md'));
        if (entries.length === 0) {
          throw new Error(`[assert-content-images] no .md files under ${contentDir}`);
        }

        for (const file of entries) {
          const slug = file.replace(/\.md$/, '');
          const md = readFileSync(new URL(file, contentDir), 'utf8');
          const expected = markdownImageSrcs(md);
          const heroMatch = frontmatter(md).match(FRONTMATTER_IMAGE);
          const hero = heroMatch && (heroMatch[1] ?? heroMatch[2] ?? heroMatch[3]);
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
            // Zero is the case this gate exists for: it is what the eviscerated page looks
            // like. More than one is fine — the same screenshot may legitimately appear
            // twice, and every copy is then checked.
            if (hits.length === 0) {
              problems.push(`${slug}: no <img src="${src}"> in the emitted page`);
              continue;
            }
            // An image not served out of public/ has no file here to measure, and the markdown
            // plugin leaves it exactly as written for that reason; asserting the attributes on
            // it would contradict that. Resolving it as a path used to crash this hook with a
            // bare `The URL must be of scheme file`, two lines before the throw that prints the
            // collected list — so the author saw no file, no src and nothing to act on.
            // Presence is still asserted, which keeps the empty-page case caught.
            if (!src.startsWith('/')) {
              external += hits.length;
              continue;
            }
            const { width, height } = canvasSizeFor(src, publicDir);
            for (const img of hits) {
              checked += 1;
              if (img.loading !== 'lazy') {
                problems.push(`${slug}: ${src} has loading="${img.loading ?? '<none>'}", expected "lazy"`);
              }
              if (img.width !== String(width) || img.height !== String(height)) {
                problems.push(`${slug}: ${src} has width/height ${img.width ?? '<none>'}x`
                  + `${img.height ?? '<none>'}, the file is ${width}x${height}`);
              }
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
          + 'width/height; every hero is eager'
          + (external > 0 ? `; ${external} external image(s) present but not measured` : ''));
      },
    },
  };
}
