import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const ESTADO_BADGE: Record<string, string> = {
  programado: 'bg-blue-100 text-blue-700',
  en_curso:   'bg-amber-100 text-amber-700',
  entregado:  'bg-green-100 text-green-700',
  cerrado:    'bg-gray-100 text-gray-600',
  cancelado:  'bg-red-100 text-red-700',
}

const ESTADO_LABEL: Record<string, string> = {
  programado: 'Programado',
  en_curso:   'En curso',
  entregado:  'Entregado',
  cerrado:    'Cerrado',
  cancelado:  'Cancelado',
}

const TIPO_LABEL: Record<string, string> = {
  recoleccion: 'Recolección',
  entrega:     'Entrega',
}

function fmtFecha(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default async function ConductorViajeDetail({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: viaje }, { data: evidencias }] = await Promise.all([
    supabase
      .from('viaje')
      .select(`
        id, cliente, estado, fecha_programada, fecha_recoleccion_real, fecha_entrega_real,
        anticipo_monto,
        presupuesto_combustible_congelado, presupuesto_casetas_congelado,
        presupuesto_viaticos_congelado,    presupuesto_imprevistos_congelado,
        ruta:ruta_plantilla_id ( nombre, origen, destino, distancia_km ),
        vehiculo:vehiculo_id  ( placas, configuracion_vehicular, tipo_caja )
      `)
      .eq('id', params.id)
      .single(),
    supabase
      .from('evidencia_viaje')
      .select('id, tipo, nombre_receptor, notas, timestamp, foto_url, firma_url')
      .eq('viaje_id', params.id)
      .order('timestamp', { ascending: true }),
  ])

  if (!viaje) notFound()

  const v     = viaje as any
  const evs   = (evidencias ?? []) as any[]
  const tiposCapturados = new Set(evs.map((e: any) => e.tipo))

  const puedeRecoleccion = viaje.estado === 'programado' && !tiposCapturados.has('recoleccion')
  const puedeEntrega     = viaje.estado === 'en_curso'   && !tiposCapturados.has('entrega')

  return (
    <div className="max-w-lg mx-auto space-y-5 pt-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link href="/conductor" className="text-gray-400 hover:text-gray-600 text-sm">← Inicio</Link>
        <span className="text-gray-300">/</span>
        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${ESTADO_BADGE[viaje.estado] ?? 'bg-gray-100'}`}>
          {ESTADO_LABEL[viaje.estado] ?? viaje.estado}
        </span>
      </div>

      {/* Datos principales */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
        <p className="text-lg font-bold text-gray-900">{viaje.cliente}</p>
        {v.ruta && (
          <p className="text-sm text-gray-600">
            {v.ruta.origen} → {v.ruta.destino}
            {v.ruta.distancia_km ? ` · ${v.ruta.distancia_km} km` : ''}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <p className="text-xs text-gray-400">Vehículo</p>
            <p className="text-sm font-medium text-gray-900">{v.vehiculo?.placas ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Programado</p>
            <p className="text-sm text-gray-900">{fmtFecha(viaje.fecha_programada)}</p>
          </div>
          {viaje.anticipo_monto ? (
            <div>
              <p className="text-xs text-gray-400">Anticipo</p>
              <p className="text-sm font-medium text-green-700">
                {(viaje.anticipo_monto as number).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Botones de captura — ACCIÓN PRINCIPAL */}
      {puedeRecoleccion && (
        <Link
          href={`/conductor/viaje/${params.id}/evidencia/recoleccion`}
          className="flex items-center justify-between w-full bg-blue-600 text-white rounded-2xl px-5 py-5 shadow-md active:scale-95 transition-transform"
        >
          <div>
            <p className="text-base font-bold">Capturar recolección</p>
            <p className="text-sm text-blue-200 mt-0.5">Foto + firma del cliente</p>
          </div>
          <span className="text-2xl">📦</span>
        </Link>
      )}

      {puedeEntrega && (
        <Link
          href={`/conductor/viaje/${params.id}/evidencia/entrega`}
          className="flex items-center justify-between w-full bg-green-600 text-white rounded-2xl px-5 py-5 shadow-md active:scale-95 transition-transform"
        >
          <div>
            <p className="text-base font-bold">Capturar entrega</p>
            <p className="text-sm text-green-200 mt-0.5">Foto + firma del receptor</p>
          </div>
          <span className="text-2xl">✅</span>
        </Link>
      )}

      {/* Bitácora de horas NOM-087 */}
      {['programado', 'en_curso'].includes(viaje.estado) && (
        <Link
          href={`/conductor/viaje/${params.id}/bitacora`}
          className="flex items-center justify-between w-full bg-white border border-gray-200 rounded-2xl px-5 py-4 active:bg-gray-50 transition-colors"
        >
          <div>
            <p className="text-base font-semibold text-gray-900">Bitácora de horas</p>
            <p className="text-sm text-gray-400 mt-0.5">Iniciar / terminar tramo · NOM-087</p>
          </div>
          <span className="text-2xl">🕐</span>
        </Link>
      )}

      {/* Gastos del viaje */}
      {['programado', 'en_curso', 'entregado'].includes(viaje.estado) && (
        <Link
          href={`/conductor/viaje/${params.id}/gastos`}
          className="flex items-center justify-between w-full bg-white border border-gray-200 rounded-2xl px-5 py-4 active:bg-gray-50 transition-colors"
        >
          <div>
            <p className="text-base font-semibold text-gray-900">Gastos del viaje</p>
            <p className="text-sm text-gray-400 mt-0.5">Registrar y ver comprobantes</p>
          </div>
          <span className="text-2xl">🧾</span>
        </Link>
      )}

      {/* Evidencias capturadas */}
      {evs.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <p className="px-5 py-3 text-sm font-semibold text-gray-700 border-b border-gray-100">
            Evidencias capturadas
          </p>
          <ul className="divide-y divide-gray-100">
            {evs.map((e: any) => (
              <li key={e.id} className="px-5 py-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-gray-900">
                    {TIPO_LABEL[e.tipo] ?? e.tipo}
                  </span>
                  <span className="text-xs text-gray-400">{fmtFecha(e.timestamp)}</span>
                </div>
                {e.nombre_receptor && (
                  <p className="text-xs text-gray-500">Receptor: {e.nombre_receptor}</p>
                )}
                {e.notas && (
                  <p className="text-xs text-gray-400 mt-0.5">{e.notas}</p>
                )}
                <div className="flex gap-3 mt-1">
                  {e.foto_url  && <span className="text-xs text-green-600">✓ Foto</span>}
                  {e.firma_url && <span className="text-xs text-green-600">✓ Firma</span>}
                  {!e.foto_url  && <span className="text-xs text-gray-400">Sin foto</span>}
                  {!e.firma_url && <span className="text-xs text-gray-400">Sin firma</span>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
