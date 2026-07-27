'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { EstadoVehiculo, TipoDocumento } from '@/lib/types'
import { TIPO_DOCUMENTO_LABELS } from '@/lib/types'

async function getCallerAdminOrDispatcher() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: usuario } = await supabase
    .from('usuario').select('rol').eq('auth_user_id', user.id).single()
  if (!usuario || !['admin', 'dispatcher'].includes(usuario.rol)) return null
  return supabase
}

// Fecha local en formato YYYY-MM-DD con un offset en días
function isoLocal(offsetDias = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDias)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ── Vehículos ──────────────────────────────────────────────────────────────

export async function crearVehiculo(
  _prev: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const supabase = await getCallerAdminOrDispatcher()
  if (!supabase) return { error: 'Sin permisos.' }

  const placas        = (formData.get('placas') as string)?.trim().toUpperCase()
  const configuracion = (formData.get('configuracion_vehicular') as string)?.trim()
  const tipo_caja     = (formData.get('tipo_caja') as string)?.trim() || null
  const capacidad_raw = (formData.get('capacidad_peso_kg') as string)?.trim()
  const anio_raw      = (formData.get('anio') as string)?.trim()

  if (!placas || !configuracion) return { error: 'Placas y configuración son requeridos.' }

  const { data: nuevo, error } = await supabase
    .from('vehiculo')
    .insert({
      placas,
      configuracion_vehicular: configuracion,
      tipo_caja:         tipo_caja || null,
      capacidad_peso_kg: capacidad_raw ? parseFloat(capacidad_raw) : null,
      anio:              anio_raw      ? parseInt(anio_raw, 10)     : null,
      estado:            'disponible',
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') return { error: `Las placas "${placas}" ya están registradas.` }
    return { error: `Error al guardar: ${error.message}` }
  }

  redirect(`/admin/vehiculos/${nuevo.id}`)
}

export async function actualizarEstado(formData: FormData): Promise<void> {
  const supabase = await getCallerAdminOrDispatcher()
  if (!supabase) return

  const vehiculoId  = formData.get('vehiculo_id') as string
  const nuevoEstado = formData.get('estado') as EstadoVehiculo

  await supabase.from('vehiculo').update({ estado: nuevoEstado }).eq('id', vehiculoId)
  revalidatePath(`/admin/vehiculos/${vehiculoId}`)
  revalidatePath('/admin/vehiculos')
}

// ── Documentos ─────────────────────────────────────────────────────────────

const DIAS_ALERTA = 30

export async function crearDocumento(
  _prev: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const supabase = await getCallerAdminOrDispatcher()
  if (!supabase) return { error: 'Sin permisos.' }

  const vehiculoId = formData.get('vehiculo_id') as string
  const tipo       = formData.get('tipo') as TipoDocumento
  const numero     = (formData.get('numero_documento') as string)?.trim() || null
  const fechaStr   = (formData.get('fecha_vencimiento') as string)?.trim()

  if (!vehiculoId || !tipo || !fechaStr) {
    return { error: 'Tipo y fecha de vencimiento son requeridos.' }
  }

  const { error: docError } = await supabase.from('documento_vehiculo').insert({
    vehiculo_id:       vehiculoId,
    tipo,
    numero_documento:  numero,
    fecha_vencimiento: fechaStr,
  })

  if (docError) return { error: `Error al guardar: ${docError.message}` }

  // Generar alerta si vence en ≤30 días o ya venció
  const hoy    = isoLocal(0)
  const limite = isoLocal(DIAS_ALERTA)

  if (fechaStr <= limite) {
    const { data: v } = await supabase
      .from('vehiculo').select('placas').eq('id', vehiculoId).single()
    const etiqueta = TIPO_DOCUMENTO_LABELS[tipo] ?? tipo
    const desc = fechaStr < hoy
      ? `${etiqueta} de ${v?.placas ?? '—'} venció el ${fechaStr}`
      : `${etiqueta} de ${v?.placas ?? '—'} vence el ${fechaStr}`

    await supabase.from('alerta').insert({
      tipo:               'documento_por_vencer',
      entidad_referencia: vehiculoId,
      descripcion:        desc,
    })
  }

  revalidatePath(`/admin/vehiculos/${vehiculoId}`)
  return null
}

// ── Alertas ────────────────────────────────────────────────────────────────

export async function marcarAtendida(formData: FormData): Promise<void> {
  const supabase = await getCallerAdminOrDispatcher()
  if (!supabase) return

  const alertaId   = formData.get('alerta_id') as string
  const vehiculoId = formData.get('vehiculo_id') as string

  await supabase.from('alerta').update({ atendida: true }).eq('id', alertaId)
  revalidatePath(`/admin/vehiculos/${vehiculoId}`)
  revalidatePath('/admin/vehiculos')
}
