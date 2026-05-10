-- ============================================
-- Schema: SI Terintegrasi P2JN Babel
-- Database: Supabase (PostgreSQL)
-- ============================================

-- Profiles (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nama TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Pengusul',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Keuangan (Transaksi Keuangan)
CREATE TABLE public.keuangan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal DATE NOT NULL,
  jenis_transaksi TEXT NOT NULL CHECK (jenis_transaksi IN ('Debit', 'Kredit')),
  kategori TEXT,
  nominal BIGINT NOT NULL DEFAULT 0,
  keterangan TEXT,
  link_nota TEXT,
  input_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Persediaan (Stok Barang)
CREATE TABLE public.persediaan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal DATE NOT NULL,
  jenis TEXT NOT NULL CHECK (jenis IN ('Masuk', 'Keluar')),
  nama_barang TEXT NOT NULL,
  supplier_tujuan TEXT,
  jumlah INTEGER NOT NULL DEFAULT 0,
  satuan TEXT DEFAULT 'unit',
  stok_saldo INTEGER DEFAULT 0,
  input_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- BMN (Barang Milik Negara)
CREATE TABLE public.bmn (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode_aset TEXT NOT NULL,
  nama_aset TEXT NOT NULL,
  spesifikasi TEXT,
  kondisi TEXT DEFAULT 'Baik',
  nilai_aset BIGINT DEFAULT 0,
  lokasi TEXT,
  pengguna TEXT,
  status_penggunaan TEXT DEFAULT 'Digunakan',
  link_foto TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Utilitas (Permohonan Utilitas)
CREATE TABLE public.utilitas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tgl_usul TIMESTAMPTZ DEFAULT NOW(),
  instansi TEXT,
  lokasi TEXT,
  jenis_pekerjaan TEXT NOT NULL,
  link_ded TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN',
  input_by UUID REFERENCES public.profiles(id),
  current_pic UUID REFERENCES public.profiles(id),
  sla_deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transmital (Tahapan Utilitas)
CREATE TABLE public.transmital (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  utilitas_id UUID REFERENCES public.utilitas(id) ON DELETE CASCADE,
  tahapan TEXT NOT NULL,
  pic UUID REFERENCES public.profiles(id),
  waktu_masuk TIMESTAMPTZ DEFAULT NOW(),
  waktu_selesai TIMESTAMPTZ,
  durasi_hari INTEGER,
  catatan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dokumen DIPA
CREATE TABLE public.dokumen_dipa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  revisi_ke INTEGER DEFAULT 0,
  link_dipa TEXT,
  link_rkakl TEXT,
  keterangan_revisi TEXT,
  uploaded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Komentar Utilitas
CREATE TABLE public.komentar_utilitas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  utilitas_id UUID REFERENCES public.utilitas(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.profiles(id),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keuangan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.persediaan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bmn ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utilitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transmital ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dokumen_dipa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.komentar_utilitas ENABLE ROW LEVEL SECURITY;

-- Policies: Authenticated read
CREATE POLICY "Authenticated read" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON public.keuangan FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON public.persediaan FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON public.bmn FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON public.utilitas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON public.transmital FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON public.dokumen_dipa FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON public.komentar_utilitas FOR SELECT TO authenticated USING (true);

-- Policies: Authenticated insert
CREATE POLICY "Authenticated insert" ON public.keuangan FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated insert" ON public.persediaan FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated insert" ON public.bmn FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated insert" ON public.utilitas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated insert" ON public.transmital FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated insert" ON public.dokumen_dipa FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated insert" ON public.komentar_utilitas FOR INSERT TO authenticated WITH CHECK (true);

-- Policies: Authenticated update/delete
CREATE POLICY "Authenticated update" ON public.keuangan FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete" ON public.keuangan FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated update" ON public.bmn FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete" ON public.bmn FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated update" ON public.utilitas FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete" ON public.utilitas FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated update" ON public.profiles FOR UPDATE TO authenticated USING (true);
