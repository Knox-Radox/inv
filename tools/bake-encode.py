"""Second half of the bake: PNG -> WebP. Run after `node tools/bake.js`."""
import os, tempfile
from PIL import Image
TMP = os.path.join(tempfile.gettempdir(), "as-bake")
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "paper")
for name in ("envelope", "card"):
    im = Image.open(os.path.join(TMP, f"{name}.png")).convert("RGB")
    out = os.path.join(OUT, f"{name}-sheet.webp")
    im.save(out, "WEBP", quality=82, method=6)
    print(f"  {name}-sheet.webp  {im.size}  {os.path.getsize(out) // 1024} KB")
