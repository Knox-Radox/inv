import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { invitation } from "@/content/invitation";
import { BORDER_TILE_H, BORDER_TILE_V } from "@/lib/borderTile";
import { dataUri, latticeSvg } from "@/lib/sealSvg";

/**
 * The share card — docs/design-plan.md § The share card.
 *
 * The first thing most guests see, so it is designed rather than left to the
 * build. It is the invitation **in miniature and unopened**: the card's own
 * mirror-work border round the edge, the seal intact above the names, and the
 * names on one line as the card sets them on a wide sheet.
 *
 * Until revision 9 the names were stacked with the script's own ampersand
 * between them at 40px — a hairline about seven pixels tall in a WhatsApp
 * thumbnail, and the weakest mark on the card it was supposed to sell. It is
 * Mrs Eaves' ampersand now, as it is on the card and on the cover.
 *
 * Rendered through Satori, which supports neither CSS custom properties nor SVG
 * filters. So the palette is inlined, the paper grain is absent by necessity —
 * the lattice carries the texture instead — and the seal, the lattice and the
 * border's tiles are each embedded as a data URI.
 */
export const size = { width: 1200, height: 630 };

/** The border: how far in from the card's edge, and one flower's size. */
const EDGE = 20;
const FLOWER = 30;
const RUN_X = size.width - EDGE * 2;
const RUN_Y = size.height - EDGE * 2 - FLOWER * 2;

/** One edge of the border. A tile is two flowers long, stretched by a per cent
 *  or two so that a whole number of them fills the run. */
function strip(box: Record<string, number>, axis: "x" | "y") {
  const run = axis === "x" ? RUN_X : RUN_Y;
  const tile = run / Math.round(run / (FLOWER * 2));
  return {
    position: "absolute" as const,
    display: "flex",
    ...box,
    backgroundImage: `url("${dataUri(axis === "x" ? BORDER_TILE_H : BORDER_TILE_V)}")`,
    backgroundSize: axis === "x" ? `${tile}px ${FLOWER}px` : `${FLOWER}px ${tile}px`,
    backgroundRepeat: axis === "x" ? ("repeat-x" as const) : ("repeat-y" as const),
  };
}
export const contentType = "image/png";
export const alt = invitation.share.imageAlt;

/**
 * Satori cannot read woff2, so the share card uses TTF subsets cut to just the
 * glyphs it sets. They live outside /public because they are build-time assets
 * and should never be served to a guest.
 */
async function font(file: string) {
  return readFile(path.join(process.cwd(), "assets", "og-fonts", file));
}

export default async function Image() {
  const { couple, day, share } = invitation;
  const [parfumerie, eaves, eavesSmallCaps, seal] = await Promise.all([
    font("parfumerie-og.ttf"),
    font("eaves-og.ttf"),
    font("eaves-sc-og.ttf"),
    readFile(path.join(process.cwd(), "assets", "og", "seal.png")),
  ]);
  // The painted wax — tools/paint.py writes it beside the cover's own, from
  // the same function, so the first thing anyone sees in WhatsApp is the same
  // object the cover shows.
  const sealUri = `data:image/png;base64,${seal.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FBF7F0",
          backgroundImage: `url("${dataUri(latticeSvg())}")`,
          backgroundSize: "34px 34px",
          position: "relative",
          fontFamily: "Mrs Eaves",
        }}
      >
        {/* The border, as four strips. Each tile is two flowers, and its
            drawn size is chosen so a whole number of tiles fits its edge —
            what `background-repeat: round` does on the page, done by hand,
            because Satori does not have it. */}
        <div style={strip({ top: EDGE, left: EDGE, width: RUN_X, height: FLOWER }, "x")} />
        <div style={strip({ bottom: EDGE, left: EDGE, width: RUN_X, height: FLOWER }, "x")} />
        <div style={strip({ top: EDGE + FLOWER, left: EDGE, width: FLOWER, height: RUN_Y }, "y")} />
        <div style={strip({ top: EDGE + FLOWER, right: EDGE, width: FLOWER, height: RUN_Y }, "y")} />

        {/* The sprite carries a transparent margin for its shadow — the wax
            itself is 81% of the box (tools/paint.py, SEAL_R) — so 168 draws
            the wax at about 136. */}
        <img src={sealUri} width={168} height={168} alt="" />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginTop: 6,
            fontFamily: "Parfumerie Script",
            color: "#3A5542",
            fontSize: 124,
            lineHeight: 1.1,
          }}
        >
          <div>{couple.first}</div>
          <div
            style={{
              fontFamily: "Mrs Eaves",
              fontSize: 40,
              margin: "0 30px 0 26px",
              // Optical: a roman ampersand centred on a copperplate's box
              // sits low, because the script's box is mostly ascender.
              marginTop: -22,
              opacity: 0.88,
            }}
          >
            {couple.conjunction}
          </div>
          <div>{couple.second}</div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: 26,
            color: "#2E2A24",
          }}
        >
          <div style={{ fontSize: 30, fontFamily: "Mrs Eaves Small Caps", letterSpacing: 1.5 }}>
            {day.fullDateDisplay}
          </div>
          <div style={{ fontSize: 25, marginTop: 6 }}>
            {`${day.venue.name}, ${day.venue.locality}`}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Parfumerie Script", data: parfumerie, weight: 400, style: "normal" },
        { name: "Mrs Eaves", data: eaves, weight: 400, style: "normal" },
        { name: "Mrs Eaves Small Caps", data: eavesSmallCaps, weight: 400, style: "normal" },
      ],
    },
  );
}
