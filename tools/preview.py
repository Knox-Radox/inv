"""Render an SVG snippet to a standalone file for visual inspection."""
import sys, subprocess, os
def write(name, inner, w=100, h=100, bg="#FBF7F0", scale=6, extra=""):
    out=f"/tmp/preview-{name}.svg"
    svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="{w*scale}" height="{h*scale}" viewBox="-4 -4 {w}+8 {h}+8">
<rect width="{w}" height="{h}" fill="{bg}"/>{extra}{inner}</svg>'''
    open(out,"w").write(svg)
    return out
