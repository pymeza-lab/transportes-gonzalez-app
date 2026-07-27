'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { generarConciliacion } from '@/lib/conciliacion'
import { sincronizarEstadoVehiculo } from '@/lib/vehiculoEstado'

async function getCallerDispatcher() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: usuario } = await supabase
    .from('usuario').select('rol').eq('auth_user_id', user.id).single()
  if (!usuario || !['admin', 'dispatcher'].includes(usuario.rol)) return null
  return supabase
}

// ── Rutas plantilla ────────────────────────────────────────────────────────

export async function crearRutaPlantilla(
  _prev: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const supabase = await getCallerDispatcher()
  if (!supabase) return { error: 'Sin permisos.' }

  const nombre              = (formData.get('nombre') as string)?.trim()
  const origen              = (formData.get('origen') as string)?.trim()
  const destino             = (formData.get('destino') as string)?.trim()
  const distancia_km        = parseFloat((formData.get('distancia_km') as string) ?? '0')
  const presupuesto_combustible = parseFloat((formData.get('presupuesto_combustible') as string) ?? '0')
  const presupuesto_casetas     = parseFloat((formData.get('presupuesto_casetas') as string) ?? '0')
  const presupuesto_viaticos    = parseFloat((formData.get('presupuesto_viaticos') as string) ?? '0')
  const presupuesto_imprevistos = parseFloat((formData.get('presupuesto_imprevistos') as string) ?? '0')

  if (!nombre || !origen || !destino || isNaN(distancia_km)) {
    return { error: 'Nombre, origen, destino y distancia son requeridos.' }
  }

  const { error } = await supabase.from('ruta_plantilla').insert({
    nombre,
    origen,
    destino,
    distancia_km,
    casetas_estimadas_monto:  presupuesto_casetas,
    presupuesto_combustible,
    presupuesto_casetas,
    presupuesto_viaticos,
    presupuesto_imprevistos,
    activa: true,
  })

  if (error) return { error: `Error al guardar: ${error.message}` }
  revalidatePath('/dispatcher/rutas')
  return null
}

export async function toggleRutaActiva(formData: FormData): Promise<void> {
  const supabase = await getCallerDispatcher()
  if (!supabase) return

  const rutaId = formData.get('ruta_id') as string
  const activa = formData.get('activa') === 'true'

  await supabase.from('ruta_plantilla').update({ activa: !activa }).eq('id', rutaId)
  revalidatePath('/dispatcher/rutas')
}

// ── Viajes ─────────────────────────────────────────────────────────────────

export async function crearViaje(
  _prev: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const supabase = await getCallerDispatcher()
  if (!supabase) return { error: 'Sin permisos.' }

  const rutaId      = formData.get('ruta_plantilla_id') as string
  const vehiculoId  = formData.get('vehiculo_id') as string
  const conductorId = formData.get('conductor_id') as string
  const cliente     = (formData.get('cliente') as string)?.trim()
  const fechaStr    = formData.get('fecha_programada') as string
  const anticipo    = parseFloat((formData.get('anticipo_monto') as string) ?? '0') || 0

  if (!rutaId || !vehiculoId || !conductorId || !cliente || !fechaStr) {
    return { error: 'Todos los campos marcados son requeridos.' }
  }

  // Evitar doble-booking: ni el vehículo ni el conductor pueden tener ya otro
  // viaje programado o en curso (el dropdown del formulario ya los filtra, pero
  // esto cubre selecciones hechas con datos desactualizados en el cliente).
  const { data: conflictos } = await supabase
    .from('viaje')
    .select('vehiculo_id, conductor_id')
    .in('estado', ['programado', 'en_curso'])
    .or(`vehiculo_id.eq.${vehiculoId},conductor_id.eq.${conductorId}`)

  if (conflictos?.some(v => v.vehiculo_id === vehiculoId)) {
    return { error: 'Ese vehículo ya tiene un viaje programado o en curso. Ciérralo antes de asignarle otro.' }
  }
  if (conflictos?.some(v => v.conductor_id === conductorId)) {
    return { error: 'Ese conductor ya tiene un viaje programado o en curso. Ciérralo antes de asignarle otro.' }
  }

  // Leer la plantilla para congelar el presupuesto
  const { data: ruta, error: rutaError } = await supabase
    .from('ruta_plantilla')
    .select('presupuesto_combustible, presupuesto_casetas, presupuesto_viaticos, presupuesto_imprevistos')
    .eq('id', rutaId)
    .single()

  if (rutaError || !ruta) return { error: 'No se encontró la ruta seleccionada.' }

  const { data: nuevo, error: viajeError } = await supabase
    .from('viaje')
    .insert({
      ruta_plantilla_id:  rutaId,
      vehiculo_id:        vehiculoId,
      conductor_id:       conductorId,
      cliente,
      fecha_programada:   fechaStr,
      anticipo_monto:     anticipo || null,
      estado:             'programado',
      // Presupuesto congelado: copia exacta de la plantilla en el momento de crear el viaje.
      // No se recalcula si la plantilla cambia después.
      presupuesto_combustible_congelado: ruta.presupuesto_combustible,
      presupuesto_casetas_congelado:     ruta.presupuesto_casetas,
      presupuesto_viaticos_congelado:    ruta.presupuesto_viaticos,
      presupuesto_imprevistos_congelado: ruta.presupuesto_imprevistos,
    })
    .select('id')
    .single()

  if (viajeError) return { error: `Error al crear viaje: ${viajeError.message}` }

  redirect(`/dispatcher/viajes/${nuevo.id}`)
}

export async function actualizarEstadoViaje(formData: FormData): Promise<void> {
  const supabase = await getCallerDispatcher()
  if (!supabase) return

  const viajeId     = formData.get('viaje_id') as string
  const nuevoEstado = formData.get('nuevo_estado') as string

  const PERMITIDOS = ['en_curso', 'entregado', 'cerrado', 'cancelado']
  if (!PERMITIDOS.includes(nuevoEstado)) return

  const updates: Record<string, unknown> = { estado: nuevoEstado }

  if (nuevoEstado === 'en_curso')  updates.fecha_recoleccion_real = new Date().toISOString()
  if (nuevoEstado === 'entregado') updates.fecha_entrega_real     = new Date().toISOString()

  const { data: viaje } = await supabase
    .from('viaje').update(updates).eq('id', viajeId).select('vehiculo_id').single()

  if (viaje) {
    await sincronizarEstadoVehiculo(supabase, viaje.vehiculo_id, nuevoEstado)
  }

  if (nuevoEstado === 'entregado') {
    await generarConciliacion(viajeId, supabase)
  }

  revalidatePath(`/dispatcher/viajes/${viajeId}`)
  revalidatePath('/dispatcher/viajes')
}
