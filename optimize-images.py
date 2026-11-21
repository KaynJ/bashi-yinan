"""Reduce the published PNG copies. Original artwork stays in the author project."""
import sys
from pathlib import Path
from PIL import Image

for path in Path(sys.argv[1]).rglob("*.png"):
    if path.stat().st_size < 24000:
        continue
    with Image.open(path) as original:
        image = original.convert("RGBA")
    if path.name.startswith("guardian-bust"):
        image.thumbnail((540, 700), Image.Resampling.LANCZOS)
    if image.getchannel("A").getextrema() == (255, 255):
        image = image.convert("RGB")
    indexed = image.quantize(colors=256)
    from io import BytesIO
    output = BytesIO()
    indexed.save(output, format="PNG", optimize=True)
    if output.tell() < path.stat().st_size:
        path.write_bytes(output.getvalue())
