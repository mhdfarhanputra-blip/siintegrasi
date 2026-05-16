# Roadmap Pengembangan SI Terintegrasi P2JN

Dokumen ini berisi ide pengembangan praktis untuk melengkapi modul yang sudah ada. Prioritas disusun dari kebutuhan produksi, akurasi data, dan manfaat operasional.

## Prioritas 1: Fondasi Produksi

- Finalisasi role matrix per aksi: lihat, tambah, ubah, hapus, export, approve, review.
- Pindahkan mutasi penting ke API route/server action agar validasi tidak hanya bergantung pada UI.
- Tambahkan test E2E untuk login, approval akun, CRUD keuangan, mutasi persediaan, dan workflow utilitas.
- Tambahkan backup/restore data dan prosedur recovery.
- Tambahkan monitoring error dengan Sentry atau logging terpusat.

## Dashboard

- Tambahkan filter tahun anggaran global yang mempengaruhi semua KPI.
- Tambahkan drill-down dari KPI ke tabel yang sudah terfilter.
- Tambahkan widget SLA utilitas, stok kritis, revisi DIPA terakhir, dan realisasi rendah.
- Tambahkan mode cetak ringkasan bulanan.

## Keuangan

- Tambahkan buku kas umum dengan nomor bukti, sumber dana, akun MAK, dan lampiran nota.
- Tambahkan rekonsiliasi saldo awal, saldo akhir, dan mutasi bulanan.
- Tambahkan import Excel/CSV transaksi dengan preview sebelum simpan.
- Tambahkan validasi nominal, tanggal anggaran, kategori wajib, dan lampiran untuk transaksi tertentu.
- Tambahkan laporan per kategori, bulan, dan tahun anggaran.

## Persediaan

- Pisahkan master barang dan mutasi stok.
- Hitung saldo dari ledger mutasi per barang, bukan dari baris terakhir global.
- Tambahkan kartu stok per barang, stok opname, koreksi stok, dan histori pemakaian.
- Tambahkan satuan baku dan konversi satuan bila dibutuhkan.
- Tambahkan approval untuk pengeluaran stok.

## BMN

- Tambahkan nomor register, NUP, kode barang, merk/tipe, kondisi tahunan, dan foto aset.
- Tambahkan workflow inventarisasi tahunan: import tahun lalu, cek fisik, update kondisi, finalisasi.
- Tambahkan QR code aset untuk scan lokasi dan detail barang.
- Tambahkan mutasi lokasi/pengguna aset.
- Tambahkan laporan aset rusak, aset tidak digunakan, dan nilai aset per kategori.

## Utilitas

- Jadikan transisi status sebagai server-side workflow: ajukan, mulai pemeriksaan, beri catatan, OK, revisi, diterima, ditolak.
- Tambahkan SLA per tahapan dan eskalasi notifikasi jika melewati tenggat.
- Tambahkan komentar threaded dan lampiran revisi.
- Tambahkan template checklist Satker dan Perencanaan.
- Tambahkan halaman tracking publik dengan status ringkas tanpa membocorkan catatan internal sensitif.

## DIPA dan RKA-KL

- Tambahkan versi dokumen dengan pembanding perubahan pagu antar revisi.
- Tambahkan parser struktur MAK/RKA-KL yang menyimpan hasil ke tabel relasional.
- Tambahkan catatan perubahan, alasan revisi, dan dokumen pendukung.
- Tambahkan export kronologi revisi.

## Perencanaan dan Realisasi

- Simpan data realisasi ke database, bukan hanya JSON storage, agar bisa difilter dan diaudit.
- Tambahkan tren bulanan realisasi dan proyeksi akhir tahun.
- Tambahkan alert akun realisasi rendah, akun mendekati pagu, dan sisa besar.
- Tambahkan mapping komponen ke penanggung jawab.

## Pengguna, Audit, dan Governance

- Tambahkan audit diff JSON yang menampilkan field sebelum/sesudah.
- Tambahkan log login dan aktivitas export.
- Tambahkan pengaturan organisasi, tahun aktif, kategori, dan parameter SLA.
- Tambahkan reset password/admin invite flow.
- Tambahkan matriks role yang bisa dikonfigurasi admin.

## UI/UX

- Tambahkan layout mobile berbasis card untuk tabel besar.
- Tambahkan empty state yang menjelaskan aksi berikutnya per role.
- Tambahkan bulk action untuk tabel admin.
- Tambahkan command palette untuk navigasi cepat.
- Tambahkan density toggle yang benar-benar persist per user.

## AI Assistant

- Batasi asisten pada knowledge base aplikasi dan data yang boleh diakses user.
- Tambahkan retrieval dari dokumentasi internal, SOP, dan FAQ.
- Tambahkan quick action: ringkas data bulan ini, jelaskan anomali, buat draft laporan.
- Tambahkan audit penggunaan AI dan batas rate limit.

