import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import type { RolUsuario } from '@/lib/types'

export const dynamic = 'force-dynamic'

const NAV_ITEMS = [
  { label: 'Inicio',  href: '/dispatcher' },
  { label: 'Viajes',  href: '/dispatcher/viajes' },
  { label: 'Rutas',   href: '/dispatcher/rutas' },
]

export default async function DispatcherLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuario')
    .select('nombre, rol')
    .eq('auth_user_id', user.id)
    .single()

  if (!usuario || !['dispatcher', 'admin'].includes(usuario.rol)) redirect('/login')

  return (
    <AppShell user={{ nombre: usuario.nombre, rol: usuario.rol as RolUsuario }} navItems={NAV_ITEMS}>
      {children}
    </AppShell>
  )
}
