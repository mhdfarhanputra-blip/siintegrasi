from PIL import Image
import os

PUBLIC_DIR = r'd:\Ai\P2JN Terintegrasi\p2jn-next\public'
LOGO_PRIMARY = r'C:\Users\Legion\Downloads\B5B60CEB-EBB5-4E80-980C-3631831D06BA.PNG'
LOGO_ALT = r'C:\Users\Legion\Downloads\F7889E35-312D-41B1-A11B-A5C2E4FD5FB3.PNG'


def save_resized(src, dst, size):
    img = Image.open(src)
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    img.thumbnail((size, size), Image.Resampling.LANCZOS)
    img.save(dst, 'PNG', optimize=True)
    print(f'  -> {dst} ({img.size})')


def main():
    os.makedirs(PUBLIC_DIR, exist_ok=True)
    print('Memproses logo utama...')
    save_resized(LOGO_PRIMARY, os.path.join(PUBLIC_DIR, 'logo.png'), 512)
    save_resized(LOGO_PRIMARY, os.path.join(PUBLIC_DIR, 'logo-192.png'), 192)
    save_resized(LOGO_PRIMARY, os.path.join(PUBLIC_DIR, 'logo-512.png'), 512)
    save_resized(LOGO_PRIMARY, os.path.join(PUBLIC_DIR, 'logo-64.png'), 64)
    save_resized(LOGO_PRIMARY, os.path.join(PUBLIC_DIR, 'apple-touch-icon.png'), 180)

    print('Memproses logo alternatif...')
    save_resized(LOGO_ALT, os.path.join(PUBLIC_DIR, 'logo-alt.png'), 512)
    save_resized(LOGO_ALT, os.path.join(PUBLIC_DIR, 'logo-alt-192.png'), 192)

    print('Membuat favicon...')
    img = Image.open(LOGO_PRIMARY)
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    icon_sizes = [(16, 16), (32, 32), (48, 48), (64, 64)]
    img.save(os.path.join(PUBLIC_DIR, 'favicon.ico'), sizes=icon_sizes)
    print(f'  -> favicon.ico (sizes: {icon_sizes})')
    print('Selesai!')


if __name__ == '__main__':
    main()
