import styles from "./Ornament.module.css";

/**
 * A watercolour wash, clipped to a shape — docs/revision-6-ornament.md
 * § How line-plus-wash is built, layers 1 to 3.
 *
 * Three things stacked, in the order a brush would put them down:
 *
 * 1. **A base.** The shape's palest tone, opaque. The sheets are patchy by
 *    design — a wash that covers evenly is a sticker — and without a base
 *    under them every shape is translucent and overlapping mango leaves show
 *    through one another like cellophane.
 * 2. **The sheet.** A region of one of the three baked sheets, clipped to the
 *    shape. `box` decides *which* region: it is the rectangle the sheet is
 *    scaled to cover, so pushing it around and resizing it lands different
 *    pigment inside the shape. No two ornaments sample the same square inch,
 *    which is what a real washed sheet cut up would look like.
 * 3. **The dried edge.** The silhouette stroked in a deeper tone, inside its
 *    own clip, so only the inner half of the stroke survives. That is the rim
 *    a wash leaves where it stopped, it follows the shape exactly, and it
 *    costs one path.
 *
 * `id` is required and must be unique in the document. These are server
 * components, so there is no `useId` to reach for, and a generated id would
 * differ between the server and client renders anyway.
 */
export type Sheet = "foliage" | "stone" | "brass";

/** The palest tone of each family — the paper the wash was laid on. */
const BASE: Record<Sheet, string> = {
  foliage: "#DCE0D2",
  // Deeper than it looks it should be. At #EDE6D8 the stone was within three
  // points of --ground-deep and the columns read as ghosts of themselves — a
  // shape has to separate from what it stands on before any amount of wash or
  // shading inside it can do anything.
  stone: "#E1DACA",
  brass: "#E4D3B4",
};

/** The tone a wash of each family dries to at its edge. */
const RIM: Record<Sheet, string> = {
  foliage: "#3A5542",
  stone: "#9A9A8A",
  brass: "#7E5F35",
};

export function Wash({
  id,
  d,
  sheet,
  box,
  rim = 0.3,
  rimWidth = 2.6,
  className,
  style,
}: {
  id: string;
  /** One closed silhouette, or several concatenated into one path. */
  d: string;
  sheet: Sheet;
  /** [x, y, width, height] the sheet is scaled to cover. Which pigment lands. */
  box: readonly [number, number, number, number];
  rim?: number;
  rimWidth?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [x, y, w, h] = box;
  return (
    <g className={`${styles.wash} ${className ?? ""}`} style={style}>
      {/*
       * The silhouette is written once and referenced three times.
       *
       * It is needed as a clip, as an opaque base, and as the rim stroke, and
       * emitting `d` three times put 199 KB of duplicated path data into a
       * 1.3 MB document — which Next then serialises a second time into the
       * RSC payload, so every wasted byte was paid for twice. Measured on the
       * built page: 1,218 paths, 730 distinct.
       */}
      <defs>
        <path id={`${id}-s`} d={d} />
        <clipPath id={`${id}-clip`}>
          <use href={`#${id}-s`} />
        </clipPath>
      </defs>
      <use href={`#${id}-s`} fill={BASE[sheet]} />
      <g clipPath={`url(#${id}-clip)`}>
        <image
          href={`/wash/${sheet}.webp`}
          x={x}
          y={y}
          width={w}
          height={h}
          preserveAspectRatio="xMidYMid slice"
          /*
           * No `fetchPriority` here. It is the right hint — these are
           * decorative, below the fold, and never the LCP element — but React
           * serialises it differently on the server and the client for SVG
           * `image`, and it produced a hydration mismatch on every ornament on
           * the page. The three sheets are 97 KB between them, shared by every
           * piece and cached after the first, so the hint was worth less than
           * the mismatch cost. LCP is measured instead, in tools/verify.
           */
        />
        <use href={`#${id}-s`} fill="none" stroke={RIM[sheet]} strokeWidth={rimWidth} opacity={rim} />
      </g>
    </g>
  );
}
