import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const ESTADO_VIAJE_BADGE: Record<string, string> = {
  programado: 'bg-blue-100 text-blue-700',
  en_curso:   'bg-amber-100 text-amber-700',
  entregado:  'bg-green-100 text-green-700',
  cerrado:    'bg-gray-100 text-gray-600',
  cancelado:  'bg-red-100 text-red-700',
}

const ESTADO_VIAJE_LABEL: Record<string, string> = {
  programado: 'Programado',
  en_curso:   'En curso',
  entregado:  'Entregado',
  cerrado:    'Cerrado',
  cancelado:  'Cancelado',
}

const ESTADO_CONCILIACION_BADGE: Record<string, string> = {
  pendiente_revision: 'bg-amber-100 text-amber-700',
  aprobado:           'bg-green-100 text-green-700',
  rechazado:          'bg-red-100 text-red-700',
}

const ESTADO_CONCILIACION_LABEL: Record<string, string> = {
  pendiente_revision: 'Pendiente',
  aprobado:           'Aprobado',
  rechazado:          'Rechazado',
}

function fmt(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

function fmtFecha(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default async function FinanzasConductorDetalle({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: conductorData } = await supabase
    .from('conductor')
    .select('id, estado, licencia_federal_numero, licencia_vencimiento, usuario:usuario_id ( nombre, telefono )')
    .eq('id', params.id)
    .single()

  // Cast a `any`: sin generar los tipos de la base de datos (supabase gen types),
  // TS no puede saber que `usuario` es un solo objeto (por el .single()) y no un
  // arreglo — esto ya no es un problema en tiempo de ejecución, solo de tipos.
  const conductor = conductorData as any

  if (!conductor) notFound()

  // Últimos 30 viajes del conductor (abiertos y recientes), no solo los que
  // ya cerraron — el objetivo de esta pantalla es que finanzas pueda revisar
  // "en cualquier momento", no solo cuando se genera la conciliación.
  const { data: viajesData } = await supabase
    .from('viaje')
    .select('id, cliente, estado, fecha_programada, fecha_entrega_real, anticipo_monto, vehiculo:vehiculo_id ( placas )')
    .eq('conductor_id', params.id)
    .order('fecha_programada', { ascending: false })
    .limit(30)

  const viajes = (viajesData ?? []) as any[]
  const viajeIds = viajes.map(v => v.id)

  const [{ data: gastosData }, { data: conciliacionesData }] = await Promise.all([
    viajeIds.length
      ? supabase
          .from('gasto_viaje')
          .select('viaje_id, monto, tiene_cfdi, foto_comprobante_url, categoria')
          .in('viaje_id', viajeIds)
      : Promise.resolve({ data: [] }),
    viajeIds.length
      ? supabase
          .from('conciliacion_viaje')
          .select('id, viaje_id, estado, saldo, desviacion_pct')
          .in('viaje_id', viajeIds)
      : Promise.resolve({ data: [] }),
  ])

  const gastos = (gastosData ?? []) as {
    viaje_id: string; monto: number; tiene_cfdi: boolean
    foto_comprobante_url: string | null; categoria: string
  }[]
  const conciliaciones = (conciliacionesData ?? []) as {
    id: string; viaje_id: string; estado: string; saldo: string | null; desviacion_pct: number | null
  }[]

  const conciliacionPorViaje = new Map(conciliaciones.map(c => [c.viaje_id, c]))

  const resumenPorViaje = new Map<string, { total: number; sinSoporte: number; sinCfdi: number }>()
  for (const g of gastos) {
    const actual = resumenPorViaje.get(g.viaje_id) ?? { total: 0, sinSoporte: 0, sinCfdi: 0 }
    actual.total += Number(g.monto)
    if (!g.foto_comprobante_url) actual.sinSoporte += 1
    if (!g.tiene_cfdi) actual.sinCfdi += 1
    resumenPorViaje.set(g.viaje_id, actual)
  }

  const totalGeneral     = gastos.reduce((s, g) => s + Number(g.monto), 0)
  const totalSinSoporte  = gastos.filter(g => !g.foto_comprobante_url).length
  const totalSinCfdi     = gastos.filter(g => !g.tiene_cfdi).length
  const viajesAbiertos   = viajes.filter(v => ['programado', 'en_curso'].includes(v.estado)).length

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link href="/finanzas/conductores" className="text-gray-400 hover:text-gray-600 text-sm">
          ← Conductores
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-lg font-bold text-gray-900">{conductor.usuario?.nombre ?? '—'}</p>
          <p className="text-sm text-gray-500 mt-0.5">
            Lic. {conductor.licencia_federal_numero}
            {conductor.usuario?.telefono ? ` · ${conductor.usuario.telefono}` : ''}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap shrink-0">
          <Link
            href={`/finanzas/gastos?conductor=${conductor.id}`}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Registrar gasto
          </Link>
          <Link
            href={`/finanzas/movimientos?conductor=${conductor.id}`}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-700 transition-colors"
          >
            Registrar movimiento
          </Link>
          <Link
            href={`/finanzas/corte?conductor=${conductor.id}`}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors"
          >
            Generar corte semanal
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className={`rounded-xl border p-4 ${viajesAbiertos > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}`}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Viajes abiertos</p>
          <p className={`text-2xl font-bold mt-1 ${viajesAbiertos > 0 ? 'text-amber-700' : 'text-gray-900'}`}>{viajesAbiertos}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Gastado (últimos {viajes.length})</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(totalGeneral)}</p>
        </div>
        <div className={`rounded-xl border p-4 ${totalSinSoporte > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}`}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Gastos sin soporte</p>
          <p className={`text-2xl font-bold mt-1 ${totalSinSoporte > 0 ? 'text-amber-700' : 'text-gray-900'}`}>{totalSinSoporte}</p>
        </div>
        <div className={`rounded-xl border p-4 ${totalSinCfdi > 0 ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200'}`}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Gastos sin CFDI</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalSinCfdi}</p>
        </div>
      </div>

      {/* Tabla de viajes */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <p className="px-6 py-3 text-sm font-semibold text-gray-700 border-b border-gray-100">
          Viajes recientes ({viajes.length})
        </p>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Vehículo</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Gastado</th>
              <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Sin soporte</th>
              <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Sin CFDI</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Conciliación</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {viajes.map(v => {
              const resumen = resumenPorViaje.get(v.id) ?? { total: 0, sinSoporte: 0, sinCfdi: 0 }
              const conciliacion = conciliacionPorViaje.get(v.id)
              return (
                <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 font-medium text-gray-900">{v.cliente}</td>
                  <td className="px-6 py-3 text-gray-600">{v.vehiculo?.placas ?? '—'}</td>
                  <td className="px-6 py-3 text-gray-500">{fmtFecha(v.fecha_programada)}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${ESTADO_VIAJE_BADGE[v.estado] ?? 'bg-gray-100 text-gray-600'}`}>
                      {ESTADO_VIAJE_LABEL[v.estado] ?? v.estado}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right font-medium text-gray-900">{fmt(resumen.total)}</td>
                  <td className="px-6 py-3 text-center">
                    {resumen.sinSoporte > 0 ? (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                        {resumen.sinSoporte}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-6 py-3 text-center">
                    {resumen.sinCfdi > 0 ? (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                        {resumen.sinCfdi}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-6 py-3">
                    {conciliacion ? (
                      <Link
                        href={`/finanzas/viajes/${conciliacion.id}`}
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium hover:underline ${ESTADO_CONCILIACION_BADGE[conciliacion.estado] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {ESTADO_CONCILIACION_LABEL[conciliacion.estado] ?? conciliacion.estado}
                      </Link>
                    ) : (
                      <span className="text-xs text-gray-400">Sin generar</span>
                    )}
                  </td>
                </tr>
              )
            })}
            {!viajes.length && (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center text-gray-400 text-sm">
                  Este conductor no tiene viajes registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
