'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function aprobarConciliacion(formData: FormData): Promise<void> {
  await _cambiarEstado(formData, 'aprobado')
}

export async function rechazarConciliacion(formData: FormData): Promise<void> {
  await _cambiarEstado(formData, 'rechazado')
}

async function _cambiarEstado(formData: FormData, estado: 'aprobado' | 'rechazado') {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: usuario } = await supabase
    .from('usuario')
    .select('id, rol')
    .eq('auth_user_id', user.id)
    .single()

  if (!usuario || !['finanzas', 'admin'].includes(usuario.rol)) return

  const conciliacionId = formData.get('conciliacion_id') as string
  if (!conciliacionId) return

  await supabase
    .from('conciliacion_viaje')
    .update({
      estado,
      revisado_por:    usuario.id,
      fecha_revision:  new Date().toISOString(),
    })
    .eq('id', conciliacionId)

  revalidatePath(`/finanzas/viajes/${conciliacionId}`)
  revalidatePath('/finanzas/viajes')
}
