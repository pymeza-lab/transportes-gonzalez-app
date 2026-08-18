import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { actualizarEstadoViaje } from '../../actions'
import DatosCierreForm from './DatosCierreForm'

export const dynamic = 'force-dynamic'

const ESTADO_BADGE: Record<string, string> = {
  programado: 'bg-blue-100 text-blue-700',
  en_curso:   'bg-amber-100 text-amber-700',
  entregado:  'bg-green-100 text-green-700',
  cerrado:    'bg-gray-100 text-gray-600',
  cancelado:  'bg-red-100 text-red-700',
}

const ESTADO_LABELS: Record<string, string> = {
  programado: 'Programado',
  en_curso:   'En curso',
  entregado:  'Entregado',
  cerrado:    'Cerrado',
  cancelado:  'Cancelado',
}

// Transiciones permitidas por estado actual
const SIGUIENTES_ESTADOS: Record<string, string[]> = {
  programado: ['en_curso', 'cancelado'],
  en_curso:   ['entregado'],
  entregado:  ['cerrado'],
  cerrado:    [],
  cancelado:  [],
}

function mxn(n: number | null) {
  if (n === null || n === undefined) return '—'
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
}

function fmtFecha(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default async function ViajeDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: caller } = await supabase
    .from('usuario').select('rol').eq('auth_user_id', user.id).single()
  if (!caller || !['admin', 'dispatcher'].includes(caller.rol)) redirect('/login')

  const [{ data: viaje }, { data: tramos }] = await Promise.all([
    supabase
      .from('viaje')
      .select(`
        *,
        ruta:ruta_plantilla_id ( nombre, origen, destino, distancia_km ),
        vehiculo:vehiculo_id ( placas, configuracion_vehicular, tipo_caja ),
        conductor:conductor_id ( id, licencia_federal_numero, usuario:usuario_id ( nombre, telefono ) )
      `)
      .eq('id', params.id)
      .single(),
    supabase
      .from('bitacora_horas')
      .select('id, fecha, hora_inicio_conduccion, hora_fin_conduccion, minutos_pausa, horas_conducidas_24h_acumuladas')
      .eq('viaje_id', params.id)
      .order('hora_inicio_conduccion', { ascending: true }),
  ])

  if (!viaje) notFound()

  const siguientes = SIGUIENTES_ESTADOS[viaje.estado] ?? []
  const listaTramos = (tramos ?? []) as {
    id: string
    fecha: string
    hora_inicio_conduccion: string
    hora_fin_conduccion: string | null
    minutos_pausa: number
    horas_conducidas_24h_acumuladas: number | null
  }[]

  function fmtHora(iso: string) {
    return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  }
  function fmtHoras(h: number) {
    const hrs = Math.floor(h)
    const min = Math.round((h - hrs) * 60)
    return `${hrs}h ${min.toString().padStart(2, '0')}m`
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Encabezado */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/dispatcher/viajes" className="text-gray-400 hover:text-gray-600 text-sm">
          ← Viajes
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-semibold text-gray-900">{viaje.cliente}</h1>
        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${ESTADO_BADGE[viaje.estado] ?? 'bg-gray-100 text-gray-600'}`}>
          {ESTADO_LABELS[viaje.estado] ?? viaje.estado}
        </span>
      </div>

      {/* Datos del viaje */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h2 className="text-sm font-semibold text-gray-700">Datos del viaje</h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Ruta</p>
            <p className="text-sm font-medium text-gray-900">{(viaje as any).ruta?.nombre ?? '—'}</p>
            <p className="text-xs text-gray-400">
              {(viaje as any).ruta?.origen} → {(viaje as any).ruta?.destino}
              {(viaje as any).ruta?.distancia_km ? ` (${(viaje as any).ruta.distancia_km} km)` : ''}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Vehículo</p>
            <p className="text-sm font-medium text-gray-900">{(viaje as any).vehiculo?.placas ?? '—'}</p>
            <p className="text-xs text-gray-400">
              {(viaje as any).vehiculo?.configuracion_vehicular}
              {(viaje as any).vehiculo?.tipo_caja ? ` · ${(viaje as any).vehiculo.tipo_caja}` : ''}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Conductor</p>
            <p className="text-sm font-medium text-gray-900">{(viaje as any).conductor?.usuario?.nombre ?? '—'}</p>
            <p className="text-xs text-gray-400">
              Lic. {(viaje as any).conductor?.licencia_federal_numero}
              {(viaje as any).conductor?.usuario?.telefono ? ` · ${(viaje as any).conductor.usuario.telefono}` : ''}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Fecha programada</p>
            <p className="text-sm text-gray-900">{fmtFecha(viaje.fecha_programada)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Recolección real</p>
            <p className="text-sm text-gray-900">{fmtFecha(viaje.fecha_recoleccion_real)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Entrega real</p>
            <p className="text-sm text-gray-900">{fmtFecha(viaje.fecha_entrega_real)}</p>
          </div>
        </div>

        {/* Anticipo */}
        {viaje.anticipo_monto ? (
          <div className="pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-0.5">Anticipo al conductor</p>
            <p className="text-sm font-medium text-gray-900">{mxn(viaje.anticipo_monto)}</p>
          </div>
        ) : null}
      </div>

      {/* Presupuesto congelado */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Presupuesto congelado</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Combustible', val: viaje.presupuesto_combustible_congelado },
            { label: 'Casetas',     val: viaje.presupuesto_casetas_congelado },
            { label: 'Viáticos',    val: viaje.presupuesto_viaticos_congelado },
            { label: 'Imprevistos', val: viaje.presupuesto_imprevistos_congelado },
          ].map(({ label, val }) => (
            <div key={label}>
              <p className="text-xs text-gray-500 mb-0.5">{label}</p>
              <p className="text-sm font-medium text-gray-900">{mxn(val)}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between">
          <p className="text-sm font-semibold text-gray-700">Total presupuestado</p>
          <p className="text-sm font-bold text-gray-900">
            {mxn(
              (viaje.presupuesto_combustible_congelado ?? 0)
              + (viaje.presupuesto_casetas_congelado ?? 0)
              + (viaje.presupuesto_viaticos_congelado ?? 0)
              + (viaje.presupuesto_imprevistos_congelado ?? 0)
            )}
          </p>
        </div>
      </div>

      {/* Datos de cierre para el corte semanal del conductor */}
      {['entregado', 'cerrado'].includes(viaje.estado) && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Datos de cierre</h2>
          <p className="text-xs text-gray-500 mb-4">
            Se usan para generar el corte semanal del conductor (remolque, documento, kilometraje,
            litros y fecha de cobro).
          </p>
          <DatosCierreForm
            viajeId={viaje.id}
            remolque={viaje.remolque}
            documento={viaje.documento}
            kmInicial={viaje.km_inicial}
            kmFinal={viaje.km_final}
            litros={viaje.litros}
            fechaCobro={viaje.fecha_cobro}
          />
        </div>
      )}

      {/* Bitácora de horas NOM-087 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">
          Bitácora de horas · NOM-087
          {listaTramos.some(t => !t.hora_fin_conduccion) && (
            <span className="ml-2 inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              En conducción
            </span>
          )}
        </h2>
        {listaTramos.length === 0 ? (
          <p className="text-sm text-gray-400">Sin tramos registrados.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-400 uppercase border-b border-gray-100">
              <tr>
                <th className="pb-2 text-left">Fecha</th>
                <th className="pb-2 text-left">Inicio</th>
                <th className="pb-2 text-left">Fin</th>
                <th className="pb-2 text-right">Duración</th>
                <th className="pb-2 text-right">Acum 24h</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {listaTramos.map(t => {
                const durH = t.hora_fin_conduccion
                  ? Math.max(0, (new Date(t.hora_fin_conduccion).getTime() - new Date(t.hora_inicio_conduccion).getTime() - (t.minutos_pausa ?? 0) * 60_000) / 3_600_000)
                  : null
                const acum = t.horas_conducidas_24h_acumuladas
                const excede = acum !== null && acum >= 10
                return (
                  <tr key={t.id}>
                    <td className="py-2.5 text-gray-500">{t.fecha}</td>
                    <td className="py-2.5 text-gray-900">{fmtHora(t.hora_inicio_conduccion)}</td>
                    <td className="py-2.5 text-gray-900">
                      {t.hora_fin_conduccion
                        ? fmtHora(t.hora_fin_conduccion)
                        : <span className="text-amber-600 font-medium">En curso</span>}
                    </td>
                    <td className="py-2.5 text-right text-gray-900">
                      {durH !== null ? fmtHoras(durH) : '—'}
                    </td>
                    <td className={`py-2.5 text-right font-medium ${excede ? 'text-red-600' : 'text-gray-600'}`}>
                      {acum !== null ? fmtHoras(acum) : '—'}
                      {excede && ' ⚠️'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Cambio de estado */}
      {siguientes.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Avanzar estado</h2>
          <div className="flex gap-3 flex-wrap">
            {siguientes.map(siguiente => (
              <form key={siguiente} action={actualizarEstadoViaje}>
                <input type="hidden" name="viaje_id"    value={viaje.id} />
                <input type="hidden" name="nuevo_estado" value={siguiente} />
                <button
                  type="submit"
                  className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Marcar como: {ESTADO_LABELS[siguiente]}
                </button>
              </form>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
