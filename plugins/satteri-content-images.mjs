import { closeSync, openSync, readSync } from 'node:fs';

// A Sätteri hast plugin: every <img> that the markdown of a project renders gets
// loading="lazy" plus the intrinsic width/height of the file it points at. Both halves have
// to ship together, and the reason is not CLS — a CLS contribution was explicitly looked for
// on /projects/konteo-panel/ and not reproduced (0,0007 in every configuration, no IMG among
// the shift sources, because the six body images sit 3,2-6,4 viewport heights below the
// fold). The two reasons that do hold:
//
//   loading="lazy"  Payload and LCP. /projects/konteo-panel/ fetched all seven of its images
//                   eagerly. Measured against the build on the stack tip, 390 px viewport,
//                   400 kbit/s, cold cache, no scroll: 7 requests / 921,4 KiB become 1
//                   request / 122,9 KiB — only the above-the-fold hero — and LCP drops from
//                   19,1 s to 7,66 s (-60 %, three runs each, spread under 70 ms).
//   width/height    A not-yet-loaded image has no height of its own: with the response held
//                   back it measures 28,9-86,6 px (its alt-text box, depending on viewport)
//                   where the loaded image is 200-522 px tall. lazy is exactly what keeps
//                   these images unloaded at first paint, so without the attributes the
//                   document is shorter than it will be. Two things on the detail page read
//                   document geometry: the TOC scroll-spy and the reading-progress bar,
//                   whose width comes from scroll progress. Measured on the same page: with
//                   the attributes, scrollHeight is already its settled 9328 px at first
//                   paint with none of the six images loaded; with lazy but no dimensions it
//                   starts at 7772 px and has to grow by 1556 px (16,7 %) as they arrive. So
//                   lazy without dimensions is the worse variant, not the smaller one.
//
// The attributes barely touch the layout of a *loaded* image, because Tailwind's preflight
// already sets `img,video{max-width:100%;height:auto}` and the height keeps following the
// column width; what they add is the UA aspect-ratio, which is what reserves the box before
// the file arrives. "Barely" and not "not at all": measured at 320/390/700/768/1280 px, the
// rendered height, offsetWidth, clientWidth and the document's scrollHeight are identical to
// the bit, and the rendered *width* grows by exactly one Chromium LayoutUnit (1/64 px =
// 0,015625) at every one of the five. The direction is the right way round — with the
// attributes the image fills its column exactly (288/358/644/712/720 px), without them it
// fell one LayoutUnit short.
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

// One read per distinct src for the whole build, not per page render.
const sizeCache = new Map();

function canvasSizeFor(src) {
  if (!sizeCache.has(src)) {
    // src is site-root-relative, so it maps onto public/ one-to-one. The leading slash has
    // to go, or the URL constructor would resolve it against the filesystem root instead of
    // against PUBLIC_DIR.
    sizeCache.set(src, webpCanvasSize(new URL(src.replace(/^\/+/, ''), PUBLIC_DIR)));
  }
  return sizeCache.get(src);
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
      if (typeof src !== 'string' || !src.startsWith('/')) return;

      // An author-set attribute wins. Markdown has no syntax for these, so this only
      // matters for a raw <img> in a .md file: the escape hatch for a case this plugin
      // would get wrong.
      if (node.properties.loading === undefined) {
        ctx.setProperty(node, 'loading', 'lazy');
      }
      if (node.properties.width === undefined && node.properties.height === undefined) {
        const { width, height } = canvasSizeFor(src);
        ctx.setProperty(node, 'width', width);
        ctx.setProperty(node, 'height', height);
      }
    },
  },
};
