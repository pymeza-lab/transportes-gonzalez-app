import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { aprobarConciliacion, rechazarConciliacion } from './actions'

export const dynamic = 'force-dynamic'

const CAT_LABEL: Record<string, string> = {
  combustible: 'Combustible',
  caseta:      'Caseta',
  comida:      'Comida',
  hospedaje:   'Hospedaje',
  imprevisto:  'Imprevisto',
}

const LIMITE_SAT: Partial<Record<string, number>> = {
  comida: 750,
}

function fmt(n: number | null | undefined) {
  if (n === null || n === undefined) return '—'
  return Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

function fmtFecha(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default async function FinanzasDetalleConciliacion({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: con } = await supabase
    .from('conciliacion_viaje')
    .select(`
      id, estado, saldo, desviacion_pct,
      total_gastado, total_con_cfdi, total_sin_cfdi, presupuesto_total, anticipo,
      created_at, fecha_revision,
      revisado_por_usuario:revisado_por ( nombre ),
      viaje:viaje_id (
        id, cliente, fecha_programada, fecha_recoleccion_real, fecha_entrega_real,
        anticipo_monto,
        presupuesto_combustible_congelado, presupuesto_casetas_congelado,
        presupuesto_viaticos_congelado,    presupuesto_imprevistos_congelado,
        ruta:ruta_plantilla_id ( nombre, origen, destino, distancia_km ),
        vehiculo:vehiculo_id  ( placas, configuracion_vehicular ),
        conductor:conductor_id ( usuario:usuario_id ( nombre ) )
      )
    `)
    .eq('id', params.id)
    .single()

  if (!con) notFound()

  const { data: gastosData } = await supabase
    .from('gasto_viaje')
    .select('id, categoria, monto, tiene_cfdi, foto_comprobante_url, fecha')
    .eq('viaje_id', (con as any).viaje?.id)
    .order('fecha', { ascending: true })

  const listaGastos = (gastosData ?? []) as {
    id: string; categoria: string; monto: number; tiene_cfdi: boolean
    foto_comprobante_url: string | null; fecha: string
  }[]

  const c   = con as any
  const v   = c.viaje
  const pct = c.desviacion_pct as number | null
  const alerta = pct !== null && Math.abs(pct) > 15

  const ESTADO_BADGE: Record<string, string> = {
    pendiente_revision: 'bg-amber-100 text-amber-700',
    aprobado:           'bg-green-100 text-green-700',
    rechazado:          'bg-red-100 text-red-700',
  }
  const ESTADO_LABEL: Record<string, string> = {
    pendiente_revision: 'Pendiente de revisión',
    aprobado:           'Aprobado',
    rechazado:          'Rechazado',
  }

  // Resumen por categoría del presupuesto vs gasto real
  const porCategoria: Record<string, { presupuesto: number; gastado: number }> = {
    combustible: { presupuesto: Number(v?.presupuesto_combustible_congelado ?? 0), gastado: 0 },
    caseta:      { presupuesto: Number(v?.presupuesto_casetas_congelado     ?? 0), gastado: 0 },
    comida:      { presupuesto: Number(v?.presupuesto_viaticos_congelado    ?? 0), gastado: 0 },
    hospedaje:   { presupuesto: 0,                                                 gastado: 0 },
    imprevisto:  { presupuesto: Number(v?.presupuesto_imprevistos_congelado ?? 0), gastado: 0 },
  }
  for (const g of listaGastos) {
    if (porCategoria[g.categoria]) {
      porCategoria[g.categoria].gastado += Number(g.monto)
    }
  }

  const isPendiente = c.estado === 'pendiente_revision'

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link href="/finanzas/viajes" className="text-gray-400 hover:text-gray-600 text-sm">
          ← Conciliaciones
        </Link>
        <span className="text-gray-300">/</span>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ESTADO_BADGE[c.estado] ?? 'bg-gray-100 text-gray-600'}`}>
          {ESTADO_LABEL[c.estado] ?? c.estado}
        </span>
      </div>

      {/* Datos del viaje */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <p className="text-lg font-bold text-gray-900">{v?.cliente ?? '—'}</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-400">Ruta</p>
            <p className="font-medium text-gray-900">
              {v?.ruta?.origen && v?.ruta?.destino ? `${v.ruta.origen} → ${v.ruta.destino}` : v?.ruta?.nombre ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Vehículo</p>
            <p className="font-medium text-gray-900">{v?.vehiculo?.placas ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Conductor</p>
            <p className="font-medium text-gray-900">{v?.conductor?.usuario?.nombre ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Fecha entrega</p>
            <p className="font-medium text-gray-900">{fmtFecha(v?.fecha_entrega_real)}</p>
          </div>
          {c.fecha_revision && (
            <div>
              <p className="text-xs text-gray-400">Revisado</p>
              <p className="font-medium text-gray-900">
                {fmtFecha(c.fecha_revision)}
                {c.revisado_por_usuario?.nombre ? ` · ${c.revisado_por_usuario.nombre}` : ''}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Alerta de desviación */}
      {alerta && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4">
          <p className="text-sm font-bold text-red-800">
            Desviación de gasto: {pct !== null ? (pct > 0 ? '+' : '') + pct.toFixed(1) + '%' : '—'}
          </p>
          <p className="text-xs text-red-600 mt-1">
            El gasto real excede ±15% del presupuesto. Requiere revisión manual.
          </p>
        </div>
      )}

      {/* Resumen financiero */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <p className="px-5 py-3 text-sm font-semibold text-gray-700 border-b border-gray-100">
          Resumen financiero
        </p>
        <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-5">
          <div>
            <p className="text-xs text-gray-400">Presupuesto</p>
            <p className="text-base font-bold text-gray-900">{fmt(c.presupuesto_total)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Total gastado</p>
            <p className="text-base font-bold text-gray-900">{fmt(c.total_gastado)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Con CFDI</p>
            <p className="text-base font-bold text-green-700">{fmt(c.total_con_cfdi)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Sin CFDI</p>
            <p className="text-base font-bold text-amber-700">{fmt(c.total_sin_cfdi)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Anticipo</p>
            <p className="text-base font-bold text-blue-700">{fmt(c.anticipo)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Desviación</p>
            <p className={`text-base font-bold ${alerta ? 'text-red-700' : 'text-gray-900'}`}>
              {pct !== null ? (pct > 0 ? '+' : '') + pct.toFixed(1) + '%' : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Saldo</p>
            <p className="text-base font-bold text-gray-900">
              {c.saldo === 'a_favor_empresa'   ? 'A favor empresa'    :
               c.saldo === 'a_favor_conductor' ? 'A favor conductor'  :
               c.saldo === 'cuadrado'          ? 'Cuadrado'           : c.saldo ?? '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Desglose por categoría */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <p className="px-5 py-3 text-sm font-semibold text-gray-700 border-b border-gray-100">
          Presupuesto vs gasto por categoría
        </p>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-5 py-2 text-left">Categoría</th>
              <th className="px-5 py-2 text-right">Presupuesto</th>
              <th className="px-5 py-2 text-right">Gastado</th>
              <th className="px-5 py-2 text-right">Diferencia</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {Object.entries(porCategoria).map(([cat, { presupuesto, gastado }]) => {
              const diff     = gastado - presupuesto
              const excedido = diff > 0.01
              return (
                <tr key={cat} className={excedido ? 'bg-red-50' : ''}>
                  <td className="px-5 py-3 font-medium text-gray-900">{CAT_LABEL[cat] ?? cat}</td>
                  <td className="px-5 py-3 text-right text-gray-600">{fmt(presupuesto)}</td>
                  <td className="px-5 py-3 text-right text-gray-900">{fmt(gastado)}</td>
                  <td className={`px-5 py-3 text-right font-semibold ${excedido ? 'text-red-700' : diff < -0.01 ? 'text-green-700' : 'text-gray-400'}`}>
                    {fmt(Math.abs(diff))} {excedido ? '↑' : diff < -0.01 ? '↓' : ''}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Detalle de gastos */}
      {listaGastos.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <p className="px-5 py-3 text-sm font-semibold text-gray-700 border-b border-gray-100">
            Detalle de gastos ({listaGastos.length})
          </p>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-5 py-2 text-left">Fecha</th>
                <th className="px-5 py-2 text-left">Categoría</th>
                <th className="px-5 py-2 text-center">CFDI</th>
                <th className="px-5 py-2 text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {listaGastos.map(g => {
                const monto            = Number(g.monto)
                const limite           = LIMITE_SAT[g.categoria]
                const excede           = limite !== undefined && monto > limite
                const sinFoto          = !g.foto_comprobante_url
                const hospedajeSinCfdi = g.categoria === 'hospedaje' && !g.tiene_cfdi
                return (
                  <tr key={g.id}>
                    <td className="px-5 py-3 text-gray-400 whitespace-nowrap">
                      {new Date(g.fecha).toLocaleString('es-MX', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="px-5 py-3 text-gray-900">
                      <div className="flex items-center gap-2 flex-wrap">
                        {CAT_LABEL[g.categoria] ?? g.categoria}
                        {sinFoto && (
                          <span className="text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">
                            Sin soporte
                          </span>
                        )}
                        {excede && (
                          <span className="text-xs bg-orange-100 text-orange-700 rounded-full px-2 py-0.5">
                            Excede SAT
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center">
                      {g.tiene_cfdi ? (
                        <span className="text-green-600 font-semibold">Sí</span>
                      ) : hospedajeSinCfdi ? (
                        <span className="text-red-600 font-semibold" title="Hospedaje requiere CFDI">No</span>
                      ) : (
                        <span className="text-amber-600 font-semibold">No</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-gray-900">
                      {fmt(monto)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Acciones */}
      {isPendiente && (
        <div className="flex gap-3">
          <form action={aprobarConciliacion} className="flex-1">
            <input type="hidden" name="conciliacion_id" value={c.id} />
            <button
              type="submit"
              className="w-full py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors"
            >
              Aprobar conciliación
            </button>
          </form>
          <form action={rechazarConciliacion} className="flex-1">
            <input type="hidden" name="conciliacion_id" value={c.id} />
            <button
              type="submit"
              className="w-full py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors"
            >
              Rechazar
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
