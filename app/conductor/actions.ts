'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { generarConciliacion } from '@/lib/conciliacion'
import { sincronizarEstadoVehiculo } from '@/lib/vehiculoEstado'
import { subirBase64 } from '@/lib/storage'
import type { TipoEvidencia } from '@/lib/offlineQueue'

interface EvidenciaPayload {
  viajeId: string
  tipo: TipoEvidencia
  nombreReceptor: string
  notas: string
  fotoBase64: string | null
  firmaBase64: string | null
  timestamp: string
}

export async function guardarEvidencia(
  payload: EvidenciaPayload
): Promise<{ error: string } | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sin sesión.' }

  const { data: usuario } = await supabase
    .from('usuario').select('rol').eq('auth_user_id', user.id).single()

  if (!usuario || !['conductor', 'admin', 'dispatcher'].includes(usuario.rol)) {
    return { error: 'Sin permisos.' }
  }

  const ts = Date.now()

  let fotoUrl: string | null = null
  let firmaUrl: string | null = null
  try {
    ;[fotoUrl, firmaUrl] = await Promise.all([
      payload.fotoBase64
        ? subirBase64('evidencias', payload.fotoBase64, `${payload.viajeId}/${payload.tipo}_foto_${ts}.jpg`,  'image/jpeg')
        : Promise.resolve(null),
      payload.firmaBase64
        ? subirBase64('evidencias', payload.firmaBase64, `${payload.viajeId}/${payload.tipo}_firma_${ts}.png`, 'image/png')
        : Promise.resolve(null),
    ])
  } catch (e) {
    console.error('Error al subir evidencia:', e)
    return { error: 'No se pudo subir la foto o firma. Verifica tu conexión e intenta de nuevo.' }
  }

  const { error: insErr } = await supabase.from('evidencia_viaje').insert({
    viaje_id:       payload.viajeId,
    tipo:           payload.tipo,
    foto_url:       fotoUrl,
    firma_url:      firmaUrl,
    nombre_receptor: payload.nombreReceptor || null,
    notas:          payload.notas || null,
    timestamp:      payload.timestamp,
  })

  if (insErr) return { error: insErr.message }

  // Avanzar estado del viaje automáticamente según tipo de evidencia
  const { data: viaje } = await supabase
    .from('viaje').select('estado, vehiculo_id').eq('id', payload.viajeId).single()

  if (viaje) {
    if (payload.tipo === 'recoleccion' && viaje.estado === 'programado') {
      await supabase.from('viaje').update({
        estado:                  'en_curso',
        fecha_recoleccion_real:  payload.timestamp,
      }).eq('id', payload.viajeId)
      await sincronizarEstadoVehiculo(supabase, viaje.vehiculo_id, 'en_curso')
    }
    if (payload.tipo === 'entrega' && viaje.estado === 'en_curso') {
      await supabase.from('viaje').update({
        estado:               'entregado',
        fecha_entrega_real:   payload.timestamp,
      }).eq('id', payload.viajeId)
      await sincronizarEstadoVehiculo(supabase, viaje.vehiculo_id, 'entregado')

      // Generar conciliación automáticamente al entregar
      await generarConciliacion(payload.viajeId, supabase)
    }
  }

  revalidatePath(`/conductor/viaje/${payload.viajeId}`)
  revalidatePath('/conductor')
  return null
}
