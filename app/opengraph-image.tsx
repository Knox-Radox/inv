import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { invitation } from "@/content/invitation";
import { dataUri, korvaiSvg, latticeSvg } from "@/lib/sealSvg";

/**
 * The share card — docs/design-plan.md § The share card.
 *
 * The first thing most guests see, so it is designed rather than left to the
 * build. It is the envelope **unopened**: the seal is intact and there is no
 * jasmine, because the thread has not been stitched yet. Centred, matching the
 * card — the left datum belongs to the editorial matter, none of which is here.
 *
 * Rendered through Satori, which supports neither CSS custom properties nor SVG
 * filters. So the palette is inlined, the paper grain is absent by necessity —
 * the lattice and the woven edge carry the texture instead — and the seal, the
 * lattice and the korvai band are each embedded as a pre-composed data URI.
 */
export const size = { width: 1200, height: 630 };
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
  // The photographed wax, cut by tools/cover.py from the same frame the cover
  // uses. The drawn one this replaces was sage and synthetic, next to a page
  // whose wax is bronze and real.
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
        {/* 162, not 128. The sprite is cut at 1.26 R (tools/seal.py) rather
            than tight to the wax, so it carries a transparent margin for the
            contact shadow — the wax itself is 79% of the box. Drawn at 128 the
            seal came out a fifth smaller on the share card than it used to be;
            162 puts the wax back at the 128 it was designed to read at. */}
        <img src={sealUri} width={162} height={162} alt="" />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: 22,
            fontFamily: "Parfumerie Script",
            color: "#46543F",
            lineHeight: 1.02,
          }}
        >
          <div style={{ fontSize: 112 }}>{couple.first}</div>
          <div style={{ fontSize: 40, lineHeight: 1.5 }}>{couple.conjunction}</div>
          <div style={{ fontSize: 112 }}>{couple.second}</div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: 24,
            color: "#2E2A24",
          }}
        >
          <div style={{ fontSize: 28, fontFamily: "Mrs Eaves Small Caps", letterSpacing: 1.4 }}>
            {day.fullDateDisplay}
          </div>
          <div style={{ fontSize: 24, marginTop: 4 }}>
            {`${day.venue.name}, ${day.venue.locality}`}
          </div>
        </div>

        {/* The same woven edge as the card's, so the image reads as the card,
            cropped — coarsened so it survives a 400px thumbnail. */}
        <div style={{ position: "absolute", bottom: 0, left: 0, display: "flex" }}>
            <img src={dataUri(korvaiSvg(size.width))} width={size.width} height={14} alt="" />
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
