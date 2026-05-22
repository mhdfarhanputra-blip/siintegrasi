"""Import parsed BMN JSON data to Supabase via REST API."""
import json
import urllib.request

SUPABASE_URL = "https://mhrtbgayfrhitviltqxq.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ocnRiZ2F5ZnJoaXR2aWx0cXhxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODM1MjQ2OSwiZXhwIjoyMDkzOTI4NDY5fQ.wKI0ffDr9ou66Ger8OqXgJj5Rwc_AFXKJ9LY2ddMElo"
JSON_PATH = r"C:\Users\Legion\Downloads\AstListBmnUrutKdBrg (20 mei 2026).json"
TAHUN_PENCATATAN = 2026
BATCH_SIZE = 50

def main():
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        assets = json.load(f)
    print(f"Data: {len(assets)} aset dari PDF")

    # Get existing
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    }
    url = f"{SUPABASE_URL}/rest/v1/bmn?tahun_pencatatan=eq.{TAHUN_PENCATATAN}&select=kode_aset"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        existing = json.loads(resp.read().decode())
    existing_codes = set(r["kode_aset"] for r in existing)
    print(f"Sudah ada di DB: {len(existing_codes)} aset")

    new_assets = [a for a in assets if a["kode_aset"] not in existing_codes]
    print(f"Baru (akan diimport): {len(new_assets)} aset")

    if not new_assets:
        print("Tidak ada data baru.")
        return

    rows = [{
        "kode_aset": a["kode_aset"],
        "nama_aset": a["nama_aset"],
        "spesifikasi": a.get("spesifikasi"),
        "kondisi": a["kondisi"],
        "nilai_aset": a["nilai_aset"],
        "tahun_pengadaan": a.get("tahun_pengadaan"),
        "tahun_pencatatan": TAHUN_PENCATATAN,
        "status_penggunaan": a["status_penggunaan"],
    } for a in new_assets]

    inserted = 0
    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i:i + BATCH_SIZE]
        body = json.dumps(batch).encode()
        url = f"{SUPABASE_URL}/rest/v1/bmn"
        req_headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        }
        req = urllib.request.Request(url, data=body, headers=req_headers, method="POST")
        try:
            with urllib.request.urlopen(req) as resp:
                inserted += len(batch)
                print(f"  Batch {i // BATCH_SIZE + 1}: {len(batch)} aset")
        except urllib.error.HTTPError as e:
            print(f"  Error batch {i // BATCH_SIZE + 1}: {e.read().decode()[:200]}")

    print(f"\nSelesai! Total diimport: {inserted} aset ke TA {TAHUN_PENCATATAN}")

if __name__ == "__main__":
    main()
