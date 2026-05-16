export const ROLES = ['Admin', 'Bendahara', 'BMN', 'Teknis', 'Perencanaan', 'Pengusul'] as const

export type AppRole = (typeof ROLES)[number]

export const MODULE_ROLES = {
  dashboard: ['Admin', 'Bendahara', 'BMN', 'Teknis', 'Perencanaan', 'Pengusul'],
  keuangan: ['Admin', 'Bendahara'],
  persediaan: ['Admin', 'Bendahara', 'BMN'],
  bmn: ['Admin', 'BMN'],
  utilitas: ['Admin', 'Teknis', 'Perencanaan', 'Pengusul'],
  dipa: ['Admin', 'Perencanaan', 'Teknis', 'Bendahara', 'BMN'],
  perencanaan: ['Admin', 'Perencanaan', 'Bendahara', 'Teknis', 'BMN'],
  pengguna: ['Admin'],
  audit: ['Admin'],
} as const satisfies Record<string, readonly AppRole[]>

export type ModuleKey = keyof typeof MODULE_ROLES

const ROUTE_MODULES: Array<[string, ModuleKey]> = [
  ['/keuangan', 'keuangan'],
  ['/persediaan', 'persediaan'],
  ['/bmn', 'bmn'],
  ['/utilitas', 'utilitas'],
  ['/dipa', 'dipa'],
  ['/perencanaan', 'perencanaan'],
  ['/pengguna', 'pengguna'],
  ['/audit', 'audit'],
]

export function isAppRole(role: string | null | undefined): role is AppRole {
  return ROLES.includes(role as AppRole)
}

export function canAccessModule(role: string | null | undefined, module: ModuleKey): boolean {
  return isAppRole(role) && (MODULE_ROLES[module] as readonly AppRole[]).includes(role)
}

export function moduleForPath(pathname: string): ModuleKey | null {
  return ROUTE_MODULES.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.[1] ?? null
}
