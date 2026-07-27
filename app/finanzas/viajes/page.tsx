import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const ESTADO_BADGE: Record<string, string> = {
  pendiente_revision: 'bg-amber-100 text-amber-700',
  aprobado:           'bg-green-100 text-green-700',
  rechazado:          'bg-red-100 text-red-700',
}

const ESTADO_LABEL: Record<string, string> = {
  pendiente_revision: 'Pendiente',
  aprobado:           'Aprobado',
  rechazado:          'Rechazado',
}

const SALDO_LABEL: Record<string, string> = {
  a_favor_empresa:    'A favor empresa',
  a_favor_conductor:  'A favor conductor',
  cuadrado:           'Cuadrado',
}

function fmt(n: number | null) {
  if (n === null) return '—'
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

function fmtPct(n: number | null) {
  if (n === null) return '—'
  const signo = n > 0 ? '+' : ''
  return `${signo}${n.toFixed(1)}%`
}

export default async function FinanzasViajes() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: conciliaciones } = await supabase
    .from('conciliacion_viaje')
    .select(`
      id, estado, saldo, desviacion_pct, total_gastado, anticipo, created_at,
      viaje:viaje_id (
        id, cliente, fecha_entrega_real,
        ruta:ruta_plantilla_id ( nombre, origen, destino ),
        vehiculo:vehiculo_id  ( placas ),
        conductor:conductor_id ( usuario:usuario_id ( nombre ) )
      )
    `)
    .order('created_at', { ascending: false })

  const lista = (conciliaciones ?? []) as any[]

  const pendientes = lista.filter(c => c.estado === 'pendiente_revision').length

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Conciliaciones de viajes</h1>
          <p className="text-sm text-gray-500 mt-1">
            {lista.length} viaje{lista.length !== 1 ? 's' : ''} con conciliación
            {pendientes > 0 && (
              <span className="ml-2 bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                {pendientes} pendiente{pendientes !== 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>
      </div>

      {lista.length === 0 ? (
        <div className="text-center py-20 text-gray-400 text-sm">
          Aún no hay viajes entregados con conciliación.
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map((c: any) => {
            const v      = c.viaje
            const pct    = c.desviacion_pct as number | null
            const alerta = pct !== null && Math.abs(pct) > 15
            return (
              <Link
                key={c.id}
                href={`/finanzas/viajes/${c.id}`}
                className="block bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${ESTADO_BADGE[c.estado] ?? 'bg-gray-100 text-gray-600'}`}>
                        {ESTADO_LABEL[c.estado] ?? c.estado}
                      </span>
                      {alerta && (
                        <span className="text-xs bg-red-100 text-red-700 font-semibold px-2 py-0.5 rounded-full">
                          Desviación {fmtPct(pct)}
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-gray-900 truncate">{v?.cliente ?? '—'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {v?.vehiculo?.placas ?? '—'}
                      {v?.conductor?.usuario?.nombre ? ` · ${v.conductor.usuario.nombre}` : ''}
                      {v?.ruta?.origen && v?.ruta?.destino ? ` · ${v.ruta.origen} → ${v.ruta.destino}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-900">{fmt(c.total_gastado)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{SALDO_LABEL[c.saldo] ?? c.saldo}</p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
