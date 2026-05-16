# SI Terintegrasi P2JN

Aplikasi dashboard operasional untuk Satker P2JN Bangka Belitung. Modul utama mencakup keuangan, persediaan, BMN, utilitas, DIPA/RKA-KL, perencanaan, pengguna, audit log, notifikasi, tracking publik, upload dokumen, dan asisten AI.

## Stack

- Next.js 16 App Router
- React 19
- Tailwind CSS 4
- Supabase Auth, Database, RLS, Storage
- Cloudinary untuk upload dokumen umum
- DeepSeek API untuk asisten AI dan parser dokumen

## Menjalankan Lokal

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`.

## Environment

Buat `.env.local` dengan variabel berikut:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

DEEPSEEK_API_KEY=
```

Jangan expose `SUPABASE_SERVICE_ROLE_KEY`, `CLOUDINARY_API_SECRET`, atau `DEEPSEEK_API_KEY` ke client.

## Database

Skema dan migration ada di `src/lib/supabase/`.

Urutan migration saat setup database baru:

```text
schema.sql
migration_v3.sql
migration_v4.sql
migration_v5.sql
migration_v6.sql
migration_v7.sql
```

`migration_v7.sql` memperketat akses role/RLS. Pastikan migration ini dijalankan di Supabase sebelum aplikasi dipakai oleh banyak role.

## Role Akses

- `Admin`: semua modul, pengguna, audit, upload realisasi
- `Bendahara`: keuangan, persediaan, DIPA, perencanaan
- `BMN`: BMN, persediaan, DIPA, perencanaan
- `Teknis`: utilitas, DIPA, perencanaan
- `Perencanaan`: utilitas, DIPA, perencanaan
- `Pengusul`: dashboard dan utilitas miliknya sendiri

Aturan ini diterapkan di route proxy, halaman server, API export, dan RLS.

## Verifikasi

```bash
npm run lint
npm run build
```

Build membutuhkan akses network karena `next/font/google` mengambil Inter dan Plus Jakarta Sans dari Google Fonts.

## Roadmap

Lihat `docs/ROADMAP.md` untuk ide pengembangan modul dan prioritas implementasi.

