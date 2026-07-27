import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const ESTADO_BADGE: Record<string, string> = {
  programado: 'bg-blue-100 text-blue-700',
  en_curso:   'bg-amber-100 text-amber-700',
}

const ESTADO_LABEL: Record<string, string> = {
  programado: 'Programado',
  en_curso:   'En curso',
}

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleString('es-MX', {
    weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export default async function ConductorHome() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: viajes } = await supabase
    .from('viaje')
    .select(`
      id, cliente, estado, fecha_programada,
      ruta:ruta_plantilla_id ( nombre, origen, destino ),
      vehiculo:vehiculo_id ( placas, configuracion_vehicular )
    `)
    .in('estado', ['programado', 'en_curso'])
    .order('fecha_programada', { ascending: true })

  return (
    <div className="max-w-lg mx-auto space-y-4 pt-4">
      <h1 className="text-lg font-semibold text-gray-900 mb-2">Mis viajes</h1>

      {!viajes?.length && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">🛣</p>
          <p className="text-sm">No tienes viajes asignados en este momento.</p>
        </div>
      )}

      {viajes?.map((v: any) => (
        <Link
          key={v.id}
          href={`/conductor/viaje/${v.id}`}
          className="block bg-white rounded-2xl border border-gray-200 p-5 shadow-sm active:scale-95 transition-transform"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0 mr-3">
              <p className="font-semibold text-gray-900 text-base truncate">{v.cliente}</p>
              {v.ruta && (
                <p className="text-sm text-gray-500 mt-0.5 truncate">
                  {v.ruta.origen} → {v.ruta.destino}
                </p>
              )}
            </div>
            <span className={`shrink-0 inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${ESTADO_BADGE[v.estado] ?? 'bg-gray-100 text-gray-600'}`}>
              {ESTADO_LABEL[v.estado] ?? v.estado}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span>📅 {fmtFecha(v.fecha_programada)}</span>
            {v.vehiculo && <span>🚛 {v.vehiculo.placas}</span>}
          </div>

          <div className="mt-3 text-right">
            <span className="text-sm text-blue-600 font-medium">Ver detalles →</span>
          </div>
        </Link>
      ))}
    </div>
  )
}
