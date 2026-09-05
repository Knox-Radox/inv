/**
 * The material system — revision 3.
 *
 * The client's reference is premium because of *material*: visible cotton
 * paper, blind-embossed relief lit from the top-left, wax with a dome and a
 * satin gloss, real shadows. None of that is drawing; all of it is lighting.
 * SVG has genuine lighting filters, so the materials are built here once and
 * referenced by id from anywhere in the document — including from HTML via
 * `filter: url(#mat-…)`.
 *
 * Rendered once, at the top of the body. Every id is prefixed `mat-` and there
 * is exactly one of these on the page.
 *
 * Light comes from the upper left (azimuth 225°), once, for the whole page.
 */
export function MaterialDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute" }}>
      <defs>
        {/* Cotton paper: long fibres at one scale, tooth at another, and a
            slow cloud of density. Multiplied onto whatever it is applied to,
            then composited into that element's own alpha so it never paints
            outside the shape. */}
        <filter id="mat-paper" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.02 0.055" numOctaves="4" seed="7" result="fib" />
          <feColorMatrix in="fib" type="saturate" values="0" result="f0" />
          <feComponentTransfer in="f0" result="f1">
            <feFuncR type="table" tableValues="0.94 1" />
            <feFuncG type="table" tableValues="0.93 1" />
            <feFuncB type="table" tableValues="0.9 0.985" />
            <feFuncA type="linear" slope="0" intercept="1" />
          </feComponentTransfer>
          <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="3" result="gr" />
          <feColorMatrix in="gr" type="saturate" values="0" result="g0" />
          <feComponentTransfer in="g0" result="g1">
            <feFuncR type="table" tableValues="0.95 1" />
            <feFuncG type="table" tableValues="0.95 1" />
            <feFuncB type="table" tableValues="0.93 1" />
            <feFuncA type="linear" slope="0" intercept="1" />
          </feComponentTransfer>
          <feBlend in="f1" in2="g1" mode="multiply" result="tex" />
          <feBlend in="SourceGraphic" in2="tex" mode="multiply" result="pp" />
          <feComposite in="pp" in2="SourceAlpha" operator="in" />
        </filter>

        {/* Blind embossing. The relief is drawn in white; its alpha, softened,
            is the height map. Lit from the upper left, and the flat baseline
            (sin 48° ≈ 0.743) is subtracted so lit slopes ADD light to the paper
            and shaded slopes SUBTRACT it — tone on tone, as a real emboss is. */}
        <filter id="mat-emboss" x="-8%" y="-8%" width="116%" height="116%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2.4" result="h" />
          <feDiffuseLighting in="h" surfaceScale="4" diffuseConstant="1" lightingColor="#fff" result="lit">
            <feDistantLight azimuth="225" elevation="48" />
          </feDiffuseLighting>
          <feColorMatrix in="lit" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 0.97  2.6 0 0 0 -1.93" result="hi" />
          <feColorMatrix in="lit" type="matrix" values="0 0 0 0 0.36  0 0 0 0 0.30  0 0 0 0 0.22  -2.2 0 0 0 1.63" result="sh" />
          <feGaussianBlur in="h" stdDeviation="1.2" result="h2" />
          <feComposite in="hi" in2="h2" operator="in" result="hiIn" />
          <feComposite in="sh" in2="h2" operator="in" result="shIn" />
          <feMerge>
            <feMergeNode in="shIn" />
            <feMergeNode in="hiIn" />
          </feMerge>
        </filter>

        {/* Wax. The body's softened alpha is a dome; diffuse lighting gives it
            form, a little ambient keeps the shaded side from going to mud, and
            a low-exponent specular gives the satin gloss of sealing wax rather
            than the mirror of plastic. Composited into the wax's own alpha. */}
        <filter id="mat-wax" x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceAlpha" stdDeviation="4.5" result="dome" />
          <feComposite in="dome" in2="SourceAlpha" operator="in" result="domeIn" />
          <feDiffuseLighting in="domeIn" surfaceScale="8" diffuseConstant="0.75" lightingColor="#fff" result="dif0">
            <feDistantLight azimuth="225" elevation="52" />
          </feDiffuseLighting>
          <feComponentTransfer in="dif0" result="dif">
            <feFuncR type="linear" slope="1" intercept="0.28" />
            <feFuncG type="linear" slope="1" intercept="0.28" />
            <feFuncB type="linear" slope="1" intercept="0.28" />
          </feComponentTransfer>
          <feSpecularLighting in="domeIn" surfaceScale="8" specularConstant="0.55" specularExponent="14" lightingColor="#fff" result="spec">
            <feDistantLight azimuth="225" elevation="52" />
          </feSpecularLighting>
          <feBlend in="SourceGraphic" in2="dif" mode="multiply" result="lit" />
          <feComposite in="spec" in2="lit" operator="arithmetic" k1="0" k2="0.7" k3="1" k4="0" result="waxed" />
          <feComposite in="waxed" in2="SourceAlpha" operator="in" />
        </filter>

        {/* The shadow the wax casts on the paper. Soft, warm, down and to the
            right of the light. */}
        <filter id="mat-wax-shadow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="b" />
          <feOffset in="b" dx="2.5" dy="6" result="o" />
          <feFlood floodColor="#4a4031" floodOpacity="0.38" />
          <feComposite in2="o" operator="in" />
        </filter>

        {/* The impression pressed into the wax: shadow banked on the inner
            upper-left wall, a light catch on the lower-right. */}
        <filter id="mat-deboss" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1" result="b" />
          <feOffset in="b" dx="1.3" dy="1.5" result="oD" />
          <feComposite in="oD" in2="SourceAlpha" operator="out" result="mD" />
          <feFlood floodColor="#3c4737" floodOpacity="0.72" result="cD" />
          <feComposite in="cD" in2="mD" operator="in" result="sD" />
          <feOffset in="b" dx="-1.1" dy="-1.3" result="oL" />
          <feComposite in="oL" in2="SourceAlpha" operator="out" result="mL" />
          <feFlood floodColor="#e4ebde" floodOpacity="0.85" result="cL" />
          <feComposite in="cL" in2="mL" operator="in" result="sL" />
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="sL" />
            <feMergeNode in="sD" />
          </feMerge>
        </filter>

        {/* A soft blur for the shadow a fold or a sheet edge casts. */}
        <filter id="mat-soft" x="-10%" y="-40%" width="120%" height="180%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
      </defs>
    </svg>
  );
}
