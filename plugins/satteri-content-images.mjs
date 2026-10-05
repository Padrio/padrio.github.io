import { closeSync, openSync, readSync } from 'node:fs';

// A Sätteri hast plugin: every <img> that the markdown of a project renders gets
// loading="lazy" plus the intrinsic width/height of the file it points at. Both halves have
// to ship together, and the reason is not CLS — a CLS contribution was explicitly looked for
// on /projects/konteo-panel/ and not reproduced (0,0007 in every configuration, no IMG among
// the shift sources, because the six body images sit 3,2-6,4 viewport heights below the
// fold). The two reasons that do hold:
//
//   loading="lazy"  Payload and LCP. /projects/konteo-panel/ fetched all seven of its images
//                   eagerly. The claim that holds in every configuration measured — five
//                   viewports unthrottled, four emulated latencies and a 400 kbit/s series,
//                   on both detail pages — is the weak one: requests and bytes at first paint
//                   are never higher than before, and strictly lower everywhere except on
//                   /projects/konteo-provision/ from 390 px up over a fast line. "lazy always
//                   saves something" would be false.
//                   Exact counts hold only per configuration, because Chromium's distance
//                   threshold for lazy loading depends on its network estimate, which depends
//                   on the emulated latency — so every figure here names its setup. At 390 px,
//                   400 kbit/s, 50 ms latency, cold cache, no scroll: 7 requests / 921,4 KiB
//                   become 1 request / 122,9 KiB, only the above-the-fold hero. At the same
//                   bandwidth with latency 0 the same build fetches 3 / 382,7 KiB — a property
//                   of the emulated connection, not of this diff. LCP at 390 px / 400 kbit/s
//                   falls from 19,1 s to 7,66 s (-60 %) at 50 ms and to 9,2 s (-51,8 %) at
//                   latency 0, three runs each, spread under 90 ms; the LCP element is the
//                   hero IMG in both variants. Whoever re-measures: state your latency, or
//                   your deviation reads as a regression. It did to the QA auditor, and to me.
//   width/height    A not-yet-loaded image has no height of its own: with the response held
//                   back it measures 28,9-86,6 px (its alt-text box, depending on viewport)
//                   where the loaded image is 200-522 px tall. lazy is exactly what keeps
//                   these images unloaded at first paint, so without the attributes the
//                   document is shorter than it will be. Two things on the detail page read
//                   document geometry: the TOC scroll-spy and the reading-progress bar,
//                   whose width comes from scroll progress. Measured on the same page: with
//                   the attributes, scrollHeight is already its settled 9328 px at first
//                   paint with none of the six images loaded; with lazy but no dimensions it
//                   starts at 7772 px and has to grow by 1556 px — 20,0 % of where it starts,
//                   16,7 % of where it ends — as they arrive. So lazy without dimensions is
//                   the worse variant, not the smaller one. Confirmed on a second path by
//                   blocking the image responses instead of stripping the attributes: 8090 ->
//                   9328 px at 390 px, the same settled number, and with the attributes the
//                   first-paint scrollHeight already equals the settled one at all five
//                   viewports on both pages.
//
// The attributes barely touch the layout of a *loaded* image, because Tailwind's preflight
// already sets `img,video{max-width:100%;height:auto}` and the height keeps following the
// column width; what they add is the UA aspect-ratio, which is what reserves the box before
// the file arrives. "Barely" and not "not at all": measured at 320/390/700/768/1280 px, the
// rendered height, offsetWidth, clientWidth and the document's scrollHeight are identical to
// the bit, and the rendered *width* grows by exactly one Chromium LayoutUnit (1/64 px =
// 0,015625) at every one of the five. The direction is the right way round — with the
// attributes the image fills its column exactly (288/358/644/712/720 px), without them it
// fell one LayoutUnit short. It has no observable consequence in the raster either: clipped
// screenshots of the loaded image are byte-identical between the two variants.
//
// The hero image of a detail page is out of reach here by construction: it comes from the
// frontmatter and is rendered by src/pages/projects/[slug].astro, not by the markdown
// pipeline. It is above the fold and has to stay eager.
const PUBLIC_DIR = new URL('../public/', import.meta.url);

// Extended WebP (VP8X) carries the canvas size in its RIFF header: `width-1` as a 24-bit
// little-endian int at byte 24, `height-1` at byte 27. All 13 files in
// public/images/projects/ are VP8X today. Reading the header rather than adding a dimension
// library keeps rule 8 intact, and it means the emitted attributes cannot drift from the
// file the way hand-written numbers in the markdown would.
//
// The two other WebP chunk types (`VP8 ` lossy, `VP8L` lossless) are rejected instead of
// parsed. Their bit layouts differ, and an untested parse that emits a *wrong* aspect-ratio
// is worse than a build that stops: a wrong ratio is a real layout bug and no gate in this
// repository would see it, whereas the throw below names the file and the chunk it found.
// Re-encode to VP8X or teach this function that chunk, deliberately.
//
// That stop is reachable rather than theoretical, and the next author should expect it:
// sharp — the tool CLAUDE.md's rule 6 points at — writes VP8X only when the source carries
// metadata. From a metadata-free source `{quality:80}` yields `VP8 ` and `{lossless:true}`
// yields `VP8L` (measured by the code auditor on konteo-login.webp). A re-encode done the
// documented way can therefore land here; teaching this function those two layouts is then
// the fix, not working around the throw.
export function webpCanvasSize(path) {
  const header = Buffer.alloc(30);
  const fd = openSync(path, 'r');
  let read;
  try {
    read = readSync(fd, header, 0, header.length, 0);
  } finally {
    closeSync(fd);
  }
  if (read < header.length) {
    throw new Error(`[satteri-content-images] ${path}: too short to be a WebP file`);
  }

  if (header.subarray(0, 4).toString('latin1') !== 'RIFF' ||
      header.subarray(8, 12).toString('latin1') !== 'WEBP') {
    throw new Error(`[satteri-content-images] ${path}: not a RIFF/WEBP file (rule 6)`);
  }

  const chunk = header.subarray(12, 16).toString('latin1');
  if (chunk !== 'VP8X') {
    throw new Error(
      `[satteri-content-images] ${path}: WebP chunk "${chunk}" is not supported, only VP8X. ` +
      'Re-encode the image, or add that chunk layout to webpCanvasSize().'
    );
  }

  return {
    width: header.readUIntLE(24, 3) + 1,
    height: header.readUIntLE(27, 3) + 1,
  };
}

// One read per distinct file for the whole build, not per page render. Never invalidated,
// which is right for a build (one process, one pass) but not for `astro dev`: a long-lived
// dev server keeps the dimensions of a file that has since been replaced until it restarts.
// Not a shipping risk — the gate reads the real files on every build.
const sizeCache = new Map();

// Resolution lives here and only here, so the gate cannot compute it a second, slightly
// different way (CLAUDE.md, rule 9 in the small). The two call sites share this code but not
// their base: the attributes that actually ship come from the visitor below, which calls this
// without a second argument and therefore on the hardcoded PUBLIC_DIR; the gate passes Astro's
// resolved `config.publicDir`, which governs the gate's comparison and nothing else. Today the
// two are the same directory because astro.config.mjs sets no `publicDir`, and if they ever
// diverged the gate would report a mismatch — fail-closed, and the signal to plumb the resolved
// directory into this plugin as well.
export function canvasSizeFor(src, publicDir = PUBLIC_DIR) {
  // src is site-root-relative, so it maps onto public/ one-to-one. The leading slash has to
  // go, or the URL constructor would resolve it against the filesystem root instead of
  // against publicDir. The cache is keyed on the resolved path, not on src, so two different
  // publicDirs cannot collide on one entry.
  const path = new URL(src.replace(/^\/+/, ''), publicDir);
  if (!sizeCache.has(path.href)) sizeCache.set(path.href, webpCanvasSize(path));
  return sizeCache.get(path.href);
}

export default {
  name: 'content-images',
  element: {
    filter: ['img'],
    visit(node, ctx) {
      const src = node.properties?.src;

      // Anything not served out of public/ is left exactly as written: a remote image has no
      // file here to measure, and emitting only the lazy half is the combination this plugin
      // exists to avoid. No such image exists in src/content today — this branch is what
      // keeps one from slipping through half-done.
      //
      // The case actually reachable from markdown is not the remote one but a path relative to
      // the .md: instrumented, the visitor sees `src=./colocated.webp` with loading, width and
      // height all undefined, because Astro resolves its own images *after* the hast pipeline.
      // Returning is also the right answer there, and for a better reason — that pipeline then
      // emits a hashed path with loading="lazy", decoding="async" and both dimensions already
      // set, i.e. it does this plugin's job and a little more. So this is at once the answer to
      // "why does this plugin not handle relative paths" and the cause of the hashed-path
      // branch in the gate.
      //
      // `startsWith('//')` is the second half of that test and not redundant: a
      // protocol-relative `//host/x.webp` is remote, but it *starts* with a slash, so the
      // leading-slash test alone took it for a public/ path. Measured, the visitor then
      // resolved it to public/host/x.webp, canvasSizeFor threw ENOENT, the glob-loader
      // swallowed the throw, and the page shipped with an empty body while the gate reported
      // three missing images — two of them innocent. Fail-closed, but naming the wrong cause,
      // which is the one failure class this change fights in three other places. Excluding the
      // shape here is also what makes the gate's ABSOLUTE_URL branch reachable for it rather
      // than dead code.
      //
      // The one thing the guard takes away, named rather than glossed: `//images/x.webp` with
      // the file actually present in public/ used to get the attributes, because canvasSizeFor
      // strips leading slashes and resolved it anyway. It no longer does. That is the right
      // trade — a browser reads `//images/…` as host `images`, so the image is broken there
      // whether or not it carries a width — and it ends a disagreement rather than starting
      // one: the gate already classified that same src as remote-unmeasurable via ABSOLUTE_URL
      // while this visitor was measuring it. Measured at both heads, the build stays green
      // either way; what changes is that the emitted tag loses loading/width/height.
      if (typeof src !== 'string' || !src.startsWith('/') || src.startsWith('//')) return;

      // An author-set attribute wins. Both guards below are unreachable from a .md today, and
      // the claim that once stood here — that a raw <img> in a .md is their escape hatch —
      // was wrong: measured, raw HTML in a .md never reaches this visitor at all. Such a tag
      // ships verbatim, without loading and without dimensions, and the gate does not see it
      // either; that is the one fail-open gap in this change, and it is written up in the
      // gate's own header. Markdown's ![](...) syntax cannot carry these attributes, so from
      // markdown the guards always pass. What they do guard against is another hast plugin,
      // or a future non-markdown source, having set them before this one runs.
      if (node.properties.loading === undefined) {
        ctx.setProperty(node, 'loading', 'lazy');
      }
      // Both-or-neither, deliberately: one dimension alone gives the UA no aspect ratio, so
      // completing the missing half would be a guess about intent. The consequence is that a
      // node arriving with exactly one of them set gets lazy without a reserved box — the
      // combination this header calls the worse variant. Unreachable from markdown for the
      // reason above; if some source ever reaches it, fix it there rather than guessing here.
      if (node.properties.width === undefined && node.properties.height === undefined) {
        const { width, height } = canvasSizeFor(src);
        ctx.setProperty(node, 'width', width);
        ctx.setProperty(node, 'height', height);
      }
    },
  },
};
