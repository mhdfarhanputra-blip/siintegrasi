export interface Profile {
  id: string
  email: string
  nama: string
  role: 'Admin' | 'Bendahara' | 'BMN' | 'Teknis' | 'Perencanaan' | 'Pengusul'
  createdAt: string
}

export interface Keuangan {
  id: string
  tanggal: string
  jenisTransaksi: 'Debit' | 'Kredit'
  kategori: string | null
  nominal: number
  keterangan: string | null
  linkNota: string | null
  inputBy: string | null
  createdAt: string
}

export interface Persediaan {
  id: string
  tanggal: string
  jenis: 'Masuk' | 'Keluar'
  namaBarang: string
  supplierTujuan: string | null
  jumlah: number
  satuan: string
  stokSaldo: number
  inputBy: string | null
  createdAt: string
}

export interface Bmn {
  id: string
  kodeAset: string
  namaAset: string
  spesifikasi: string | null
  kondisi: string
  nilaiAset: number
  lokasi: string | null
  pengguna: string | null
  statusPenggunaan: string
  linkFoto: string | null
  updatedAt: string
}

export interface Utilitas {
  id: string
  tglUsul: string
  instansi: string | null
  lokasi: string | null
  jenisPekerjaan: string
  linkDed: string | null
  status: string
  inputBy: string | null
  currentPic: string | null
  slaDeadline: string | null
  createdAt: string
}

export interface Transmital {
  id: string
  utilitasId: string
  tahapan: string
  pic: string | null
  waktuMasuk: string
  waktuSelesai: string | null
  durasiHari: number | null
  catatan: string | null
  createdAt: string
}

export interface DokumenDipa {
  id: string
  revisiKe: number
  linkDipa: string | null
  linkRkakl: string | null
  keteranganRevisi: string | null
  uploadedBy: string | null
  createdAt: string
}

export interface KomentarUtilitas {
  id: string
  utilitasId: string
  authorId: string | null
  message: string
  createdAt: string
}

export interface DashboardMetrics {
  totalKeuangan: number
  totalBmn: number
  utilitasOpen: number
  totalPersediaan: number
}
