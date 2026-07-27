import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ConductorTopBar from '@/components/ConductorTopBar'
import SyncPendientes from '@/components/SyncPendientes'

export const dynamic = 'force-dynamic'

export default async function ConductorLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuario')
    .select('nombre, rol')
    .eq('auth_user_id', user.id)
    .single()

  if (!usuario || !['conductor', 'admin'].includes(usuario.rol)) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50">
      <ConductorTopBar nombre={usuario.nombre} />
      <SyncPendientes />
      <main className="pt-16 pb-8 px-4">
        {children}
      </main>
    </div>
  )
}
