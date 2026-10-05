import { readdirSync, readFileSync } from 'node:fs';
import { canvasSizeFor } from './satteri-content-images.mjs';

// The gate for satteri-content-images.mjs, and the reason it exists is worth writing down:
// a throw inside the markdown plugin does NOT fail the build. Astro's glob-loader catches
// it, logs `[ERROR] [glob-loader] Error rendering <file>` and carries on to exit 0 — and the
// page it shipped had an empty `.prose-project` (measured by injecting a throw into the hast
// visitor: /projects/konteo-provision/ fell from roughly 26,4 KB to roughly 16,5 KB with no
// body at all, the diff against the baseline a pure removal). Both ends are magnitudes on
// purpose. The left one drifts with whatever the stack tip does to that page; the right one
// also depends on which throw you inject — two independent reproductions landed on 16.547 and
// mine on 16.532. The load-bearing part, exit 0 with an eviscerated page, reproduces exactly
// and is the only thing here worth relying on. This repository
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
// A scheme (`https:`, `data:`) or a protocol-relative `//host/…`. Everything else without a
// leading slash is a path relative to the .md, which is a different case entirely — see
// `managedImageMatcher`.
const ABSOLUTE_URL = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;
// Quote-aware on purpose. `[^>]*` stops at the first `>` even inside an attribute value, and
// HTML does not require it to be escaped there — an alt text reading "tap > read" then cut
// the tag in half, and the gate reported the attributes it had just failed to parse as
// missing. That is the most expensive kind of false alarm: it names as the cause the one
// thing that is not wrong, and sends the next author into this file instead of the alt text.
const IMG_TAG = /<img\b(?:[^>"']|"[^"]*"|'[^']*')*>/g;
// Not an HTML parser, and the next author should not take it for one: ATTR understands a
// double-quoted value and nothing else, so an unquoted or single-quoted value degrades to a
// name with an empty value. Every such degradation reports a mismatch rather than a pass, and
// Astro emits double quotes exclusively — so the shortcut is safe here and fails closed if it
// ever stops being.
const ATTR = /([a-zA-Z-]+)(?:="([^"]*)")?/g;

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// A co-located image — `![x](./shot.webp)` next to the .md — never reaches the markdown plugin
// as a public/ path: Astro's own image pipeline takes it over and emits
// /<build.assets>/<name>.<hash>.<ext> (measured: `./colocated.webp` shipped as
// /_astro/colocated.y3Qi2GYa_ZLTRK5.webp, with loading="lazy", decoding="async" and both
// dimensions already set). Matching presence against that shape keeps the empty-page case
// caught for such an image, which demanding the literal src cannot: the literal never appears,
// so the gate used to report `no <img src="./colocated.webp">` for a page that was in fact
// correct — a permanently red build for the one authoring route that does not need this plugin
// at all. The attributes are deliberately not asserted on it: they are Astro's defaults, not
// this plugin's output, and a gate here would make the build red for something the pipeline
// cannot put right — the same reasoning as for a raw <img> in the header above.
//
// `assetsPrefix` would move those files onto another origin and break this match. It is not
// set, and if it ever is, this fails closed.
function managedImageMatcher(src, assetsDir) {
  const base = src.split(/[?#]/)[0].split('/').pop() ?? '';
  const dot = base.lastIndexOf('.');
  if (dot <= 0) return null;
  return new RegExp(`^/${escapeRe(assetsDir)}/${escapeRe(base.slice(0, dot))}`
    + `\\.[\\w-]+\\.${escapeRe(base.slice(dot + 1))}$`);
}

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
//
// The `^ {0,3}` is the load-bearing part of the fence pattern, and it is the same convention
// LINK_DEFINITION above already uses. CommonMark reads four or more leading spaces as an
// indented code block, not as a fence — so a `trimStart()` here opened a fence that CommonMark
// never opened, and since nothing ever closed it, every image in the rest of the file silently
// left the expectation list. That was the one fail-open hole in this scanner: with such a line
// in both image-bearing files, a plugin that had stopped setting the attributes still logged
// `0 markdown image(s) …` and exited 0 while dist shipped ten bare <img> tags. The floor under
// `checked` further down is the second half of that fix, and the one that does not depend on
// getting this pattern right.
//
// The opposite direction — a genuine indented code block that embeds `![alt](/x.webp)` — now
// makes that image a phantom expectation and the build red. That is the acceptable side to err
// on, and it is the same way the other fence edge cases fall (an overlong closing fence, a
// closing fence with an info string): red, with the src named, for an author who can see what
// they just wrote.
function stripCode(md) {
  let fence = null;
  const lines = md.split('\n').filter((line) => {
    const marker = line.match(/^ {0,3}(```+|~~~+)/)?.[1][0];
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
        const assetsDir = config.build.assets.replace(/^\/+|\/+$/g, '');
        const problems = [];
        let checked = 0;
        let unmeasured = 0;

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

          // The hero is resolved before the body loop and then kept out of it. Both checks see
          // the same tag list, and one src can legitimately hold both roles — the same
          // screenshot as the frontmatter hero and again in the body is in fact the only
          // duplicate use these five files can produce today, the very case the dedup above
          // was meant to allow. Matching the body by src alone made that loop measure the
          // *hero* tag, which is correctly eager and correctly carries no dimensions, and
          // report it as two attribute failures — the same class of false alarm that quote
          // awareness in IMG_TAG just removed, naming as the cause the one tag that is right.
          // Document order puts the hero first ([slug].astro renders it above the prose), so
          // `find` takes the hero and not a body copy whose loading attribute is missing: such
          // a copy stays in `hits` and still fails, which is the direction that has to hold.
          const heroTag = hero
            ? tags.find((t) => t.src === hero && t.loading === undefined)
            : undefined;

          for (const src of expected) {
            // Three kinds of src, and only the first of them can be measured here:
            //   /images/…      served straight out of public/, left where it is by the markdown
            //                  plugin, so the file on disk is the expectation;
            //   https:, //host remote — no file here, shipped verbatim;
            //   ./shot.webp    relative to the .md, so Astro's asset pipeline owns it and
            //                  emits a hashed path (see managedImageMatcher).
            const managed = !src.startsWith('/') && !ABSOLUTE_URL.test(src);
            const matcher = managed ? managedImageMatcher(src, assetsDir) : null;
            const hits = managed
              ? tags.filter((t) => typeof t.src === 'string' && matcher?.test(t.src))
              : tags.filter((t) => t.src === src && t !== heroTag);
            // Zero is the case this gate exists for: it is what the eviscerated page looks
            // like. More than one is fine — the same screenshot may legitimately appear
            // twice, and every copy is then checked.
            if (hits.length === 0) {
              problems.push(managed
                ? `${slug}: no <img> for the co-located ${src} in the emitted page`
                  + ` (expected /${assetsDir}/<name>.<hash>.<ext>)`
                : `${slug}: no <img src="${src}"> in the emitted page`);
              continue;
            }
            // Present but with nothing here to measure it against. Resolving such a src as a
            // path used to crash this hook with a bare `The URL must be of scheme file`, two
            // lines before the throw that prints the collected list — so the author saw no
            // file, no src and nothing to act on. Presence stays asserted either way, which is
            // what keeps the empty-page case caught.
            if (managed || ABSOLUTE_URL.test(src)) {
              unmeasured += hits.length;
              continue;
            }
            // The one filesystem read inside the problem-collecting loop. Unguarded it would
            // throw past the list and reproduce exactly the failure shape the paragraph above
            // describes; every route to a missing file goes through the markdown plugin first
            // today, where the glob-loader swallows it and this gate then reports the missing
            // <img> instead — so this is unreachable now, and three lines to keep it that way.
            let size;
            try {
              size = canvasSizeFor(src, publicDir);
            } catch (err) {
              problems.push(`${slug}: cannot measure ${src} (${err.message})`);
              continue;
            }
            for (const img of hits) {
              checked += 1;
              if (img.loading !== 'lazy') {
                problems.push(`${slug}: ${src} has loading="${img.loading ?? '<none>'}", expected "lazy"`);
              }
              if (img.width !== String(size.width) || img.height !== String(size.height)) {
                problems.push(`${slug}: ${src} has width/height ${img.width ?? '<none>'}x`
                  + `${img.height ?? '<none>'}, the file is ${size.width}x${size.height}`);
              }
            }
          }

          if (hero && !heroTag) {
            const lazyHero = tags.find((t) => t.src === hero);
            problems.push(lazyHero
              ? `${slug}: hero ${hero} carries loading="${lazyHero.loading}"; it is above the fold and must stay eager`
              : `${slug}: hero ${hero} is not rendered without a loading attribute`);
          }
        }

        // The floor, and the generalisation of the fence fix in stripCode: the strongest thing
        // this gate asserts is that its expectation list is not empty, and until now it checked
        // that per *file* (`entries.length`) and never per image. Any scanner bug that empties
        // the list therefore reported success — that is the mechanism behind the fail-open hole
        // the indented-fence case opened, and it is independent of which scanner bug opens it.
        // Today `checked` is 8, so this is live from the first build rather than theoretical.
        if (checked === 0 && unmeasured === 0) {
          problems.push('no markdown image was checked at all — the expectation scanner '
            + 'returned nothing, which it cannot legitimately do while src/content has images');
        }

        if (problems.length > 0) {
          throw new Error('[assert-content-images] ' + problems.length + ' problem(s):\n  '
            + problems.join('\n  '));
        }
        logger.info(`${checked} markdown image(s) carry loading="lazy" and their file's `
          + 'width/height; every hero is eager'
          + (unmeasured > 0
            ? `; ${unmeasured} image(s) present but not measured (remote, or owned by Astro's `
              + 'asset pipeline)'
            : ''));
      },
    },
  };
}
