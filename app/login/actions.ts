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

  // Server-side client: escribe el token en cookies via next/headers antes de redirigir.
  // Esto es lo que permite que el middleware y los layouts lean la sesión correctamente.
  const supabase = createClient()

  const { error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (authError) {
    if (authError.message.toLowerCase().includes('invalid')) {
      return { error: 'Correo o contraseña incorrectos.' }
    }
    return { error: `Error de autenticación: ${authError.message}` }
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

  // Token ya en cookies — el redirect lleva la sesión consigo
  redirect(HOME_POR_ROL[usuario.rol as RolUsuario] ?? '/')
}
