'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { subirBase64 } from '@/lib/storage'

// Misma lógica de negocio que app/conductor/viaje/[id]/gastos/actions.ts
// (registrarGasto): monto sin bloqueo por límite SAT, foto opcional pero sin
// ocultar nunca la falta de soporte, y si la foto sí se capturó pero la subida
// falla, el gasto NO se guarda en silencio sin ella. Este action existe aparte
// (en vez de modificar app/conductor/**) porque finanzas captura en nombre del
// conductor a partir de fotos que llegan por WhatsApp, y necesita además elegir
// el viaje (conductor -> viaje) y capturar una fecha distinta a "ahora".
export async function registrarGastoFinanzas(
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

  if (!usuario || !['finanzas', 'admin'].includes(usuario.rol)) {
    return { error: 'Sin permisos.' }
  }

  const viajeId    = formData.get('viaje_id') as string
  const categoria  = formData.get('categoria') as string
  const monto      = parseFloat(formData.get('monto') as string)
  const tieneCfdi  = formData.get('tiene_cfdi') === 'true'
  const fotoBase64 = (formData.get('foto_base64') as string)?.trim() || null
  const fechaStr   = (formData.get('fecha') as string)?.trim() || null
  const descripcion = (formData.get('descripcion') as string)?.trim() || null

  if (!viajeId || !categoria || isNaN(monto) || monto < 0) {
    return { error: 'Conductor, viaje, categoría y monto son requeridos.' }
  }

  // "Imprevisto" es un cajón de sastre — sin descripción no queda registro
  // de en qué consistió el gasto.
  if (categoria === 'imprevisto' && !descripcion) {
    return { error: 'Para la categoría "Imprevisto" es necesario describir en qué consistió el gasto.' }
  }

  // Solo se pueden agregar gastos a viajes todavía abiertos (programado o en
  // curso). Se revalida en el servidor por si el formulario quedó con datos
  // desactualizados (p. ej. el viaje se cerró mientras finanzas llenaba el form).
  const { data: viaje } = await supabase
    .from('viaje')
    .select('id, estado, conductor_id')
    .eq('id', viajeId)
    .single()

  if (!viaje || !['programado', 'en_curso'].includes(viaje.estado)) {
    return { error: 'Ese viaje ya no admite gastos (no está programado ni en curso).' }
  }

  // La foto es opcional (un gasto sin comprobante se captura igual y queda
  // marcado como "sin soporte" — nunca se oculta), pero si finanzas sí adjuntó
  // una foto y la subida falla, no se guarda el gasto sin ella en silencio.
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
      console.error('Error al subir comprobante de gasto (captura finanzas):', e)
      return { error: 'No se pudo subir la foto del comprobante. Verifica tu conexión e intenta de nuevo.' }
    }
  }

  const { error } = await supabase.from('gasto_viaje').insert({
    viaje_id:             viajeId,
    categoria,
    monto,
    tiene_cfdi:           tieneCfdi,
    foto_comprobante_url: fotoUrl,
    descripcion,
    capturado_por:        usuario.id,
    // Si finanzas indica la fecha real del gasto (la del recibo de WhatsApp),
    // se respeta; si no, se deja el default de la columna (now()).
    ...(fechaStr ? { fecha: new Date(fechaStr).toISOString() } : {}),
  })

  if (error) return { error: error.message }

  revalidatePath('/finanzas/gastos')
  revalidatePath('/finanzas/conductores')
  revalidatePath(`/finanzas/conductores/${viaje.conductor_id}`)

  return null
}
