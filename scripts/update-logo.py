"""
Generate all logo sizes from the new SI logo source image.
Outputs to public/ folder.
"""
from PIL import Image
import os

SOURCE = r"C:\Users\Legion\Downloads\photo_6077819426599277025_y.jpg"
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public")

# Open source
img = Image.open(SOURCE).convert("RGBA")

# Sizes to generate
SIZES = {
    "logo.png": 512,
    "logo-512.png": 512,
    "logo-192.png": 192,
    "logo-64.png": 64,
    "apple-touch-icon.png": 180,
}

for filename, size in SIZES.items():
    resized = img.resize((size, size), Image.LANCZOS)
    output_path = os.path.join(OUTPUT_DIR, filename)
    resized.save(output_path, "PNG", optimize=True)
    print(f"  Created: {filename} ({size}x{size})")

# Favicon ICO (multi-size)
ico_sizes = [16, 32, 48, 64]
ico_images = [img.resize((s, s), Image.LANCZOS) for s in ico_sizes]
ico_path = os.path.join(OUTPUT_DIR, "favicon.ico")
ico_images[0].save(ico_path, format="ICO", sizes=[(s, s) for s in ico_sizes], append_images=ico_images[1:])
print(f"  Created: favicon.ico (multi-size: {ico_sizes})")

print("\nDone! All logos updated.")
