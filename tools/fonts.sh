#!/usr/bin/env bash
# Cut the web and share-card faces from the originals in assets/fonts/.
#
#   tools/fonts.sh
#
# The originals are licensed desktop fonts and are deliberately NOT under
# public/ — anything there is served at a public URL, and the whole family was
# sitting at /fonts/MRSEAV~8.TTF. Only the subsets below are served, and each is
# cut to a deliberate superset of the strings the page actually sets, so editing
# content/invitation.ts cannot break the page by needing a glyph that was cut.
#
# Two things worth knowing:
#
#  - Parfumerie is a *connecting* copperplate and its joins live in the
#    positional features init/fina/fin2/fin3, not in calt (it has none). Cut
#    without them it sets as detached letters. They cost ~9 KB.
#  - next/font preloads every face in a family, so a face that is cut and
#    declared but never set still takes critical-path bytes. Mrs Eaves' italic
#    and bold were doing exactly that; they are cut here only on request.
set -euo pipefail
cd "$(dirname "$0")/.."

SRC=assets/fonts
WEB=public/fonts
OG=assets/og-fonts

# Basic Latin plus the typographic marks and currency the copy might reach for.
U='U+0020-007E,U+00A0,U+00A9,U+00AB,U+00BB,U+00E0-00FF,U+2010-2015,U+2018-201D,U+2026,U+2030,U+2039,U+203A,U+2044,U+20B9,U+2122'
# Satori reads the share card's own strings only, so it can be cut harder.
U_OG='U+0020-007E,U+00A0,U+2010-2015,U+2018-201D,U+2026'

cut () { # src out unicodes features [flavor]
  pyftsubset "$1" --output-file="$2" --unicodes="$3" --layout-features="$4" \
    ${5:+--flavor="$5"} --no-hinting --desubroutinize --drop-tables+=DSIG 2>/dev/null
  printf '  %-38s %6.1f KB\n' "$2" "$(echo "scale=1; $(stat -c%s "$2")/1024" | bc)"
}

PARF='kern,liga,init,fina,fin2,fin3'

echo "web (served):"
cut "$SRC/ParfumerieScriptRegular.otf" "$WEB/parfumerie-script-400.woff2" "$U" "$PARF" woff2
cut "$SRC/MrsEavesRoman.ttf"           "$WEB/mrs-eaves-roman.woff2"       "$U" 'kern,liga' woff2
cut "$SRC/MrsEavesSmallCaps.ttf"       "$WEB/mrs-eaves-smallcaps.woff2"   "$U" 'kern,liga' woff2

# Cut these back in alongside an entry in app/layout.tsx if something sets them.
# cut "$SRC/MrsEaves-Italic.ttf" "$WEB/mrs-eaves-italic.woff2" "$U" 'kern,liga' woff2
# cut "$SRC/MrsEaves-Bold.ttf"   "$WEB/mrs-eaves-bold.woff2"   "$U" 'kern,liga' woff2

echo "share card (build-time only, never served):"
cut "$SRC/ParfumerieScriptRegular.otf" "$OG/parfumerie-og.ttf" "$U_OG" "$PARF"
cut "$SRC/MrsEavesRoman.ttf"           "$OG/eaves-og.ttf"      "$U_OG" 'kern,liga'
cut "$SRC/MrsEavesSmallCaps.ttf"       "$OG/eaves-sc-og.ttf"   "$U_OG" 'kern,liga'
