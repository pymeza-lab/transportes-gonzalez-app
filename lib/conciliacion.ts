import { createAdminClient } from '@/lib/supabase/admin'
import type { SupabaseClient } from '@supabase/supabase-js'

const UMBRAL_PCT = 15

export async function generarConciliacion(
  viajeId: string,
  reader: SupabaseClient  // cliente con sesión del usuario (para lecturas con RLS)
): Promise<void> {
  // Evitar duplicados
  const { data: existente } = await reader
    .from('conciliacion_viaje').select('id').eq('viaje_id', viajeId).maybeSingle()
  if (existente) return

  const [{ data: viaje }, { data: gastos }] = await Promise.all([
    reader
      .from('viaje')
      .select(`
        anticipo_monto,
        presupuesto_combustible_congelado, presupuesto_casetas_congelado,
        presupuesto_viaticos_congelado,    presupuesto_imprevistos_congelado,
        cliente, vehiculo:vehiculo_id ( placas )
      `)
      .eq('id', viajeId)
      .single(),
    reader
      .from('gasto_viaje')
      .select('monto, tiene_cfdi')
      .eq('viaje_id', viajeId),
  ])

  if (!viaje) return

  const totalGastado = gastos?.reduce((s, g) => s + Number(g.monto), 0) ?? 0
  const totalConCFDI = gastos?.filter(g => g.tiene_cfdi).reduce((s, g) => s + Number(g.monto), 0) ?? 0

  const presupuestoTotal =
    Number(viaje.presupuesto_combustible_congelado ?? 0)
    + Number(viaje.presupuesto_casetas_congelado   ?? 0)
    + Number(viaje.presupuesto_viaticos_congelado  ?? 0)
    + Number(viaje.presupuesto_imprevistos_congelado ?? 0)

  const anticipo = Number(viaje.anticipo_monto ?? 0)

  const desviacion_pct = presupuestoTotal > 0
    ? ((totalGastado - presupuestoTotal) / presupuestoTotal) * 100
    : null

  const diff = anticipo - totalGastado
  const saldo = diff > 0.01 ? 'a_favor_empresa' : diff < -0.01 ? 'a_favor_conductor' : 'cuadrado'

  const admin = createAdminClient()

  await admin.from('conciliacion_viaje').insert({
    viaje_id:          viajeId,
    anticipo,
    total_gastado:     totalGastado,
    total_con_cfdi:    totalConCFDI,
    total_sin_cfdi:    totalGastado - totalConCFDI,
    presupuesto_total: presupuestoTotal,
    desviacion_pct,
    saldo,
    estado:            'pendiente_revision',
  })

  if (desviacion_pct !== null && Math.abs(desviacion_pct) > UMBRAL_PCT) {
    const signo = desviacion_pct > 0 ? '+' : ''
    const v = viaje as any
    await admin.from('alerta').insert({
      tipo:               'desviacion_gasto',
      entidad_referencia: viajeId,
      descripcion:        `${v.vehiculo?.placas ?? '—'} · ${v.cliente}: desviación de gasto ${signo}${desviacion_pct.toFixed(1)}%`,
    })
  }
}
