import type { createClient } from '@/lib/supabase/server'

type Supabase = ReturnType<typeof createClient>

export interface ViajeCorte {
  id: string
  fechaProgramada: string
  fechaCobro: string | null
  cliente: string
  remolque: string | null
  documento: string | null
  kmInicial: number | null
  kmFinal: number | null
  litros: number | null
  origen: string | null
  destino: string | null
  vehiculoPlacas: string | null
}

export interface CorteData {
  conductor: {
    id: string
    nombre: string
    licencia: string
    unidad: string | null // placas del vehículo del viaje más reciente del periodo (heurística: el conductor no tiene una unidad fija en el esquema actual)
  }
  periodo: { desde: string; hasta: string }
  viajes: ViajeCorte[]
  liquidacion: {
    pagoViajes: number
    anticipos: number
    gastosComprobables: number
    diferencia: number
    subtotal: number
    descuentos: number
    aPagar: number
    bono: number
    netoAPagar: number
    abonoPrestamoPeriodo: number
    prestamoOtorgadoAcumulado: number
    abonadoAcumulado: number
    saldoPrestamo: number
  }
}

/**
 * Reúne todo lo necesario para el corte semanal de un conductor en un rango
 * de fechas. Fórmulas (verificadas contra el documento físico original):
 *   diferencia   = anticipos - gastos comprobables
 *   subtotal     = pago de viajes (salario) - diferencia
 *   a pagar      = subtotal - descuentos
 *   neto a pagar = a pagar + bono
 *
 * Supuesto que falta confirmar con Paty: "gastos comprobables" se calcula
 * aquí como la suma de TODOS los gasto_viaje del periodo (con o sin CFDI),
 * no solo los que tienen tiene_cfdi = true. Si debe ser distinto, se ajusta
 * en un solo lugar (este archivo).
 */
export async function obtenerCorteConductor(
  supabase: Supabase,
  conductorId: string,
  desde: string, // 'YYYY-MM-DD'
  hasta: string  // 'YYYY-MM-DD'
): Promise<CorteData | null> {
  const desdeISO = new Date(`${desde}T00:00:00`).toISOString()
  const hastaISO = new Date(`${hasta}T23:59:59.999`).toISOString()

  const { data: conductor } = await supabase
    .from('conductor')
    .select('id, licencia_federal_numero, usuario:usuario_id ( nombre )')
    .eq('id', conductorId)
    .single()

  if (!conductor) return null

  const [{ data: viajes }, { data: movimientos }] = await Promise.all([
    supabase
      .from('viaje')
      .select(`
        id, fecha_programada, fecha_cobro, cliente, remolque, documento,
        km_inicial, km_final, litros, anticipo_monto,
        ruta:ruta_plantilla_id ( origen, destino ),
        vehiculo:vehiculo_id ( placas )
      `)
      .eq('conductor_id', conductorId)
      .gte('fecha_programada', desdeISO)
      .lte('fecha_programada', hastaISO)
      .order('fecha_programada', { ascending: true }),
    // Se traen TODOS los movimientos hasta 'hasta' (no solo los del rango)
    // porque el saldo de préstamo es acumulado, no solo del periodo — misma
    // lógica que ya estaba verificada en la hoja "Corte Conductor" del Excel.
    supabase
      .from('movimiento_conductor')
      .select('tipo, monto, fecha')
      .eq('conductor_id', conductorId)
      .lte('fecha', hastaISO)
      .order('fecha', { ascending: true }),
  ])

  const listaViajes = (viajes ?? []) as any[]
  const viajeIds = listaViajes.map(v => v.id)

  const { data: gastos } = viajeIds.length
    ? await supabase
        .from('gasto_viaje')
        .select('monto, viaje_id')
        .in('viaje_id', viajeIds)
    : { data: [] }

  const gastosComprobables = (gastos ?? []).reduce((s, g: any) => s + Number(g.monto), 0)
  const anticipos = listaViajes.reduce((s, v) => s + Number(v.anticipo_monto ?? 0), 0)

  const listaMov = (movimientos ?? []) as { tipo: string; monto: number; fecha: string }[]
  const sumaTipo = (tipo: string, dentroDelRango: boolean) =>
    listaMov
      .filter(m => m.tipo === tipo && (!dentroDelRango || m.fecha >= desdeISO))
      .reduce((s, m) => s + Number(m.monto), 0)

  const pagoViajes = sumaTipo('pago_viajes', true)
  const descuentos = sumaTipo('descuento', true)
  const bono = sumaTipo('bono', true)
  const abonoPrestamoPeriodo = sumaTipo('abono_prestamo', true)
  const prestamoOtorgadoAcumulado = sumaTipo('prestamo_otorgado', false)
  const abonadoAcumulado = sumaTipo('abono_prestamo', false)

  const diferencia = anticipos - gastosComprobables
  const subtotal = pagoViajes - diferencia
  const aPagar = subtotal - descuentos
  const netoAPagar = aPagar + bono
  const saldoPrestamo = prestamoOtorgadoAcumulado - abonadoAcumulado

  const ultimoViaje = listaViajes[listaViajes.length - 1]

  return {
    conductor: {
      id: conductor.id,
      nombre: (conductor as any).usuario?.nombre ?? '—',
      licencia: conductor.licencia_federal_numero,
      unidad: ultimoViaje?.vehiculo?.placas ?? null,
    },
    periodo: { desde, hasta },
    viajes: listaViajes.map(v => ({
      id: v.id,
      fechaProgramada: v.fecha_programada,
      fechaCobro: v.fecha_cobro,
      cliente: v.cliente,
      remolque: v.remolque,
      documento: v.documento,
      kmInicial: v.km_inicial,
      kmFinal: v.km_final,
      litros: v.litros,
      origen: v.ruta?.origen ?? null,
      destino: v.ruta?.destino ?? null,
      vehiculoPlacas: v.vehiculo?.placas ?? null,
    })),
    liquidacion: {
      pagoViajes,
      anticipos,
      gastosComprobables,
      diferencia,
      subtotal,
      descuentos,
      aPagar,
      bono,
      netoAPagar,
      abonoPrestamoPeriodo,
      prestamoOtorgadoAcumulado,
      abonadoAcumulado,
      saldoPrestamo,
    },
  }
}
