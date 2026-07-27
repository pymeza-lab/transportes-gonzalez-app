import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { RolUsuario } from '@/lib/types'

const HOME_POR_ROL: Record<RolUsuario, string> = {
  admin:      '/admin',
  dispatcher: '/dispatcher',
  finanzas:   '/finanzas',
  conductor:  '/conductor',
}

export default async function Home() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuario')
    .select('rol')
    .eq('auth_user_id', user.id)
    .single()

  redirect(usuario ? HOME_POR_ROL[usuario.rol as RolUsuario] : '/login')
}
