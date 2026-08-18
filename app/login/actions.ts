'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { RolUsuario } from '@/lib/types'

const HOME_POR_ROL: Record<RolUsuario, string> = {
  admin:      '/admin',
  dispatcher: '/dispatcher',
  finanzas:   '/finanzas',
  conductor:  '/conductor',
}

export async function loginAction(
  _prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const email    = (formData.get('email')    as string)?.trim()
  const password =  formData.get('password') as string

  if (!email || !password) {
    return { error: 'Correo y contraseña son requeridos.' }
  }

  const supabase = createClient()

  const authRes = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify({ email, password }),
    }
  )

  const authData = await authRes.json()

  if (!authRes.ok || !authData.access_token) {
    return { error: 'Correo o contraseña incorrectos.' }
  }

  const { error: setSessionError } = await supabase.auth.setSession({
    access_token: authData.access_token,
    refresh_token: authData.refresh_token,
  })

  if (setSessionError) {
    return { error: `No se pudo establecer la sesión: ${setSessionError.message}` }
  }

  const { data: { user }, error: sessionError } = await supabase.auth.getUser()

  if (sessionError || !user) {
    return { error: 'No se pudo obtener la sesión. Intenta de nuevo.' }
  }

  const { data: usuario, error: dbError } = await supabase
    .from('usuario')
    .select('rol')
    .eq('auth_user_id', user.id)
    .single()

  if (dbError) {
    return { error: `Error al leer el perfil: ${dbError.message}` }
  }

  if (!usuario) {
    return {
      error:
        'Tu cuenta de acceso existe pero no tiene perfil en el sistema. ' +
        'Pide al administrador que ejecute el seed o cree tu usuario desde /admin/usuarios.',
    }
  }

  redirect(HOME_POR_ROL[usuario.rol as RolUsuario] ?? '/')
}
