import pandas as pd
import json

df = pd.read_excel(r'C:\Users\Legion\Downloads\Laporan Fa Detail (16 Segmen).xlsx', header=None)

# Correct columns: 0=Uraian hierarchy, 16=Pagu, 18=Lock, 22=Real_lalu, 23=Real_ini, 25=Real_sdPeriode, 28=Persen, 30=Sisa
results = []
for idx in range(9, len(df)):
    row = df.iloc[idx]
    pagu = row.iloc[16] if pd.notna(row.iloc[16]) else None
    real_sd = row.iloc[25] if pd.notna(row.iloc[25]) else None

    if pagu is None and real_sd is None:
        continue

    # Build uraian from text columns
    uraian_parts = []
    for col in range(16):
        val = row.iloc[col] if col < len(row) else None
        if pd.notna(val) and str(val).strip():
            uraian_parts.append(str(val).strip())

    uraian = ' '.join(uraian_parts) if uraian_parts else None
    if not uraian:
        continue

    # Detect kode_akun (6-digit number in col 7 or embedded in uraian)
    kode_akun = None
    if pd.notna(row.iloc[7]) and isinstance(row.iloc[7], (int, float)):
        kode_akun = str(int(row.iloc[7]))

    # Determine hierarchy level
    level = 'item'
    if pd.notna(row.iloc[1]) and pd.isna(row.iloc[2]):
        level = 'program'
    elif pd.notna(row.iloc[2]) and not pd.notna(row.iloc[5]):
        level = 'kegiatan'
    elif pd.notna(row.iloc[5]) and not pd.notna(row.iloc[7]):
        level = 'komponen'
    elif kode_akun:
        level = 'akun'

    results.append({
        'uraian': uraian,
        'kode_akun': kode_akun,
        'level': level,
        'pagu': int(pagu) if pagu else 0,
        'realisasi_lalu': int(row.iloc[22]) if pd.notna(row.iloc[22]) else 0,
        'realisasi_ini': int(row.iloc[23]) if pd.notna(row.iloc[23]) else 0,
        'realisasi_sd': int(real_sd) if real_sd else 0,
        'persen': round(float(row.iloc[28]) * 100, 2) if pd.notna(row.iloc[28]) else 0,
        'sisa': int(row.iloc[30]) if pd.notna(row.iloc[30]) else 0,
    })

print(f'Total rows: {len(results)}')
total_pagu = results[0]['pagu'] if results else 0
total_real = results[0]['realisasi_sd'] if results else 0
print(f'Total Pagu: {total_pagu:,.0f}')
print(f'Total Realisasi s.d. Periode: {total_real:,.0f}')

levels = set(r['level'] for r in results)
print(f'Levels: {levels}')

# Save
with open(r'd:\Ai\P2JN Terintegrasi\p2jn-next\src\lib\realisasi-data.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
print('Saved to realisasi-data.json')
