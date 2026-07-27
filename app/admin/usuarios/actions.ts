'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { RolUsuario } from '@/lib/types'

export async function crearUsuario(
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: caller } = await supabase
    .from('usuario').select('rol').eq('auth_user_id', user.id).single()
  if (caller?.rol !== 'admin') return { error: 'Sin permisos' }

  const nombre    = (formData.get('nombre')    as string)?.trim()
  const email     = (formData.get('email')     as string)?.trim()
  const password  =  formData.get('password')  as string
  const rol       =  formData.get('rol')        as RolUsuario
  const telefono  = (formData.get('telefono')  as string)?.trim() || null

  if (!nombre || !email || !password || !rol) {
    return { error: 'Todos los campos son requeridos.' }
  }

  // Campos de conductor (solo requeridos si rol === 'conductor')
  const licenciaNum      = (formData.get('licencia_federal_numero')   as string)?.trim()
  const licenciaVenc     = (formData.get('licencia_vencimiento')       as string)?.trim()
  const examenVenc       = (formData.get('examen_medico_vencimiento')  as string)?.trim() || null

  if (rol === 'conductor' && (!licenciaNum || !licenciaVenc)) {
    return { error: 'Para conductores, el número y vencimiento de licencia son requeridos.' }
  }

  const admin = createAdminClient()

  // 1. Crear cuenta en Supabase Auth
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (authError) return { error: authError.message }

  // 2. Insertar en tabla usuario
  const { data: nuevoUsuario, error: dbError } = await admin
    .from('usuario')
    .insert({ auth_user_id: authData.user.id, nombre, rol, telefono })
    .select('id')
    .single()

  if (dbError || !nuevoUsuario) {
    await admin.auth.admin.deleteUser(authData.user.id)
    return { error: dbError?.message ?? 'Error al crear el perfil de usuario.' }
  }

  // 3. Si es conductor, crear también la fila en la tabla conductor
  if (rol === 'conductor') {
    const { error: conductorError } = await admin.from('conductor').insert({
      usuario_id:              nuevoUsuario.id,
      licencia_federal_numero: licenciaNum,
      licencia_vencimiento:    licenciaVenc,
      examen_medico_vencimiento: examenVenc,
      estado:                  'activo',
    })

    if (conductorError) {
      // Rollback completo
      await admin.from('usuario').delete().eq('id', nuevoUsuario.id)
      await admin.auth.admin.deleteUser(authData.user.id)
      return { error: `Error al crear perfil de conductor: ${conductorError.message}` }
    }
  }

  revalidatePath('/admin/usuarios')
  return {}
}
