require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') })

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const db = createClient(supabaseUrl, supabaseKey)

async function check() {
  const tests = [
    { table: 'persediaan', col: 'link_dokumentasi' },
    { table: 'persediaan', col: 'tahun_anggaran' },
    { table: 'keuangan', col: 'tahun_anggaran' },
    { table: 'bmn', col: 'tahun_pengadaan' },
    { table: 'bmn', col: 'tahun_pencatatan' },
    { table: 'dokumen_dipa', col: 'tanggal_revisi' },
    { table: 'dokumen_dipa', col: 'tahun_anggaran' },
    { table: 'utilitas', col: 'tahun_anggaran' },
  ]

  for (const t of tests) {
    const { error } = await db.from(t.table).select(t.col).limit(1)
    const status = error ? 'MISSING' : 'OK'
    console.log(`${t.table}.${t.col}: ${status}`)
  }

  const { count } = await db.from('audit_log').select('*', { count: 'exact', head: true })
  console.log(`audit_log: ${count} rows`)
}

check().catch(console.error)
