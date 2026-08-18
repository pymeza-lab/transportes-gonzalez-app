export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import type { RolUsuario } from '@/lib/types'

const NAV_ITEMS = [
  { label: 'Inicio',       href: '/finanzas' },
  { label: 'Viajes',       href: '/finanzas/viajes' },
  { label: 'Registrar gasto', href: '/finanzas/gastos' },
  { label: 'Movimientos',  href: '/finanzas/movimientos' },
  { label: 'Conductores',  href: '/finanzas/conductores' },
  { label: 'Corte semanal', href: '/finanzas/corte' },
]

export default async function FinanzasLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuario')
    .select('nombre, rol')
    .eq('auth_user_id', user.id)
    .single()

  if (!usuario || !['finanzas', 'admin'].includes(usuario.rol)) redirect('/login')

  return (
    <AppShell user={{ nombre: usuario.nombre, rol: usuario.rol as RolUsuario }} navItems={NAV_ITEMS}>
      {children}
    </AppShell>
  )
}
