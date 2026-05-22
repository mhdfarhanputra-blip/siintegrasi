"""Parse AstListBmnUrutKdBrg PDF and output JSON for import."""
import fitz
import re
import json

PDF_PATH = r"C:\Users\Legion\Downloads\AstListBmnUrutKdBrg (20 mei 2026).pdf"
KODE_PATTERN = re.compile(r"^\d\.\d{2}\.\d{2}\.\d{2}\.\d{3}$")
DATE_PATTERN = re.compile(r"^\d{2}-\d{2}-\d{4}$")
KONDISI_VALUES = {"Baik", "Rusak Ringan", "Rusak Berat"}
STATUS_VALUES = {"AKTIF", "HENTI GUNA"}

def parse_number(s):
    """Parse Indonesian number format: 186.940.000 -> 186940000"""
    try:
        return int(s.replace(".", "").replace(",", "."))
    except ValueError:
        return 0

def parse_date(s):
    """Parse DD-MM-YYYY to YYYY-MM-DD"""
    parts = s.split("-")
    return f"{parts[2]}-{parts[1]}-{parts[0]}" if len(parts) == 3 else None

def parse_block(kode_barang, block):
    """Parse a block of lines into an asset dict."""
    if len(block) < 4:
        return None
    nama_aset = block[0]
    nup = None
    satuan = None
    nilai_aset = 0
    kondisi = "Baik"
    tgl_perolehan = None
    status = "AKTIF"
    for j, line in enumerate(block):
        if re.match(r"^\d{1,4}$", line) and nup is None and j < 3:
            nup = int(line)
        elif line in ("Unit", "Buah", "M2", "Set", "Paket", "Meter", "Rim"):
            satuan = line
        elif re.match(r"^\d{1,3}(\.\d{3})+$", line) and nilai_aset == 0:
            nilai_aset = parse_number(line)
        elif line in KONDISI_VALUES:
            kondisi = line
        elif DATE_PATTERN.match(line) and tgl_perolehan is None:
            tgl_perolehan = parse_date(line)
        elif line in STATUS_VALUES:
            status = line
    # Find merk between kondisi and Intrakomptabel
    merk_parts = []
    after_kondisi = False
    for line in block:
        if line in KONDISI_VALUES:
            after_kondisi = True
            continue
        if after_kondisi:
            if DATE_PATTERN.match(line):
                continue
            if line == "Intrakomptabel":
                break
            if line not in STATUS_VALUES:
                merk_parts.append(line)
    merk = " ".join(merk_parts).strip() or None
    if merk == "-":
        merk = None
    kode_aset = f"{kode_barang}.{str(nup).zfill(3)}" if nup else kode_barang
    tahun = int(tgl_perolehan[:4]) if tgl_perolehan else None
    return {
        "kode_aset": kode_aset,
        "nama_aset": nama_aset,
        "spesifikasi": f"Merk: {merk}" if merk else None,
        "kondisi": kondisi,
        "nilai_aset": nilai_aset,
        "tahun_pengadaan": tahun,
        "status_penggunaan": "Digunakan" if status == "AKTIF" else "Tidak Digunakan",
    }

def main():
    doc = fitz.open(PDF_PATH)
    full_text = "\n".join(page.get_text() for page in doc)
    lines = [l.strip() for l in full_text.split("\n") if l.strip()]
    skip = {"LISTING DATA", "NAMA UAKPB", "SUBSUB KELOMPOK", "KODE", "URAIAN", "NUP", "SAT", "Halaman", "Tanggal", "kode", "NILAI", "AKUMULASI", "PENYUSUTAN", "KONDISI", "JENIS ASET", "MERK TYPE", "TGL", "PEROLEHAN", "STATUS", "ASET", "RUANG LINGKUP", "TERCATAT", "SEMUA", "URUT KODE", "NILAI LEBIH"}
    assets = []
    i = 0
    while i < len(lines):
        if KODE_PATTERN.match(lines[i]):
            kode = lines[i]
            i += 1
            block = []
            while i < len(lines) and not KODE_PATTERN.match(lines[i]):
                if any(lines[i].startswith(s) for s in skip):
                    i += 1
                    continue
                if lines[i] in ("1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"):
                    i += 1
                    continue
                block.append(lines[i])
                i += 1
            asset = parse_block(kode, block)
            if asset:
                assets.append(asset)
        else:
            i += 1
    print(f"Total aset: {len(assets)}")
    out = PDF_PATH.replace(".pdf", ".json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(assets, f, ensure_ascii=False, indent=2)
    print(f"Output: {out}")
    for a in assets[:3]:
        print(f"  {a['kode_aset']} | {a['nama_aset']} | {a['kondisi']} | Rp {a['nilai_aset']:,}")

if __name__ == "__main__":
    main()
