import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import type { RolUsuario } from '@/lib/types'

// Forzar renderizado dinámico en cada request — nunca servir desde cache.
// Crítico para que el check de rol se ejecute siempre, no solo en la primera carga.
export const dynamic = 'force-dynamic'

const NAV_ITEMS = [
  { label: 'Inicio',     href: '/admin' },
  { label: 'Vehículos',  href: '/admin/vehiculos' },
  { label: 'Viajes',     href: '/dispatcher/viajes' },
  { label: 'Rutas',      href: '/dispatcher/rutas' },
  { label: 'Usuarios',   href: '/admin/usuarios' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuario')
    .select('nombre, rol')
    .eq('auth_user_id', user.id)
    .single()

  if (!usuario) redirect('/login')

  // Redirigir al área propia del rol en lugar de a /login — evita confusión
  // para usuarios legítimos que llegan aquí por error.
  if (usuario.rol !== 'admin') {
    const HOME: Record<string, string> = {
      dispatcher: '/dispatcher',
      finanzas:   '/finanzas',
      conductor:  '/conductor',
    }
    redirect(HOME[usuario.rol] ?? '/login')
  }

  return (
    <AppShell user={{ nombre: usuario.nombre, rol: usuario.rol as RolUsuario }} navItems={NAV_ITEMS}>
      {children}
    </AppShell>
  )
}
