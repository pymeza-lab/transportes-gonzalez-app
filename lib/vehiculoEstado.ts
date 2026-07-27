import type { SupabaseClient } from '@supabase/supabase-js'

const ESTADO_VEHICULO_POR_ESTADO_VIAJE: Partial<Record<string, 'en_ruta' | 'disponible'>> = {
  en_curso:  'en_ruta',
  entregado: 'disponible',
  cerrado:   'disponible',
  cancelado: 'disponible',
}

// Mantiene vehiculo.estado sincronizado con el ciclo de vida del viaje. No toca
// vehículos en mantenimiento o fuera de servicio: un cambio manual de flota (p. ej.
// una falla mecánica reportada a media ruta) no debe revertirse solo porque el
// viaje asociado cambió de estado.
export async function sincronizarEstadoVehiculo(
  supabase: SupabaseClient,
  vehiculoId: string | null | undefined,
  nuevoEstadoViaje: string
): Promise<void> {
  if (!vehiculoId) return

  const nuevoEstadoVehiculo = ESTADO_VEHICULO_POR_ESTADO_VIAJE[nuevoEstadoViaje]
  if (!nuevoEstadoVehiculo) return

  const { data: vehiculo } = await supabase
    .from('vehiculo').select('estado').eq('id', vehiculoId).single()

  if (!vehiculo || vehiculo.estado === 'mantenimiento' || vehiculo.estado === 'fuera_servicio') return

  await supabase.from('vehiculo').update({ estado: nuevoEstadoVehiculo }).eq('id', vehiculoId)
}
