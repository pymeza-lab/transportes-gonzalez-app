'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { subirBase64 } from '@/lib/storage'

export async function registrarGasto(
  _prev: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sin sesión.' }

  const { data: usuario } = await supabase
    .from('usuario')
    .select('id, rol')
    .eq('auth_user_id', user.id)
    .single()

  if (!usuario || !['conductor', 'admin', 'dispatcher'].includes(usuario.rol)) {
    return { error: 'Sin permisos.' }
  }

  const viajeId    = formData.get('viaje_id') as string
  const categoria  = formData.get('categoria') as string
  const monto      = parseFloat(formData.get('monto') as string)
  const tieneCfdi  = formData.get('tiene_cfdi') === 'true'
  const fotoBase64 = (formData.get('foto_base64') as string)?.trim() || null

  if (!viajeId || !categoria || isNaN(monto) || monto < 0) {
    return { error: 'Categoría y monto son requeridos.' }
  }

  // La foto es opcional (un gasto sin comprobante se captura igual y queda
  // marcado como "sin soporte"), pero si el conductor sí la tomó y la subida
  // falla, no se guarda el gasto sin ella en silencio.
  let fotoUrl: string | null = null
  if (fotoBase64) {
    try {
      fotoUrl = await subirBase64(
        'evidencias',
        fotoBase64,
        `${viajeId}/gasto_${categoria}_${Date.now()}.jpg`,
        'image/jpeg'
      )
    } catch (e) {
      console.error('Error al subir comprobante de gasto:', e)
      return { error: 'No se pudo subir la foto del comprobante. Verifica tu conexión e intenta de nuevo.' }
    }
  }

  const { error } = await supabase.from('gasto_viaje').insert({
    viaje_id:             viajeId,
    categoria,
    monto,
    tiene_cfdi:           tieneCfdi,
    foto_comprobante_url: fotoUrl,
    capturado_por:        usuario.id,
  })

  if (error) return { error: error.message }

  revalidatePath(`/conductor/viaje/${viajeId}/gastos`)
  return null
}
