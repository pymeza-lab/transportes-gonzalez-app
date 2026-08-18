import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function fmt(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
}

function fmtPct(n: number | null) {
  if (n === null) return '—'
  return `${n > 0 ? '+' : ''}${n.toFixed(1)}%`
}

const SALDO_LABEL: Record<string, string> = {
  a_favor_empresa:   'A favor empresa',
  a_favor_conductor: 'A favor conductor',
  cuadrado:          'Cuadrado',
}

export default async function FinanzasDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuario').select('nombre, rol').eq('auth_user_id', user.id).single()
  if (!usuario || !['finanzas', 'admin'].includes(usuario.rol)) redirect('/login')

  const [
    { data: pendientes },
    { count: totalAprobadas },
    { count: totalRechazadas },
    { data: conDesviacion },
  ] = await Promise.all([
    supabase
      .from('conciliacion_viaje')
      .select(`
        id, saldo, desviacion_pct, total_gastado, anticipo, created_at,
        viaje:viaje_id (
          cliente,
          vehiculo:vehiculo_id  ( placas ),
          conductor:conductor_id ( usuario:usuario_id ( nombre ) )
        )
      `)
      .eq('estado', 'pendiente_revision')
      .order('created_at', { ascending: true })
      .limit(10),
    supabase.from('conciliacion_viaje').select('*', { count: 'exact', head: true }).eq('estado', 'aprobado'),
    supabase.from('conciliacion_viaje').select('*', { count: 'exact', head: true }).eq('estado', 'rechazado'),
    supabase
      .from('conciliacion_viaje')
      .select('id, desviacion_pct, viaje:viaje_id ( cliente )')
      .eq('estado', 'pendiente_revision')
      .not('desviacion_pct', 'is', null)
      .limit(50),
  ])

  const listaPendientes = (pendientes ?? []) as any[]
  const listaDesviacion = ((conDesviacion ?? []) as any[]).filter(c => Math.abs(c.desviacion_pct) > 15)

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Finanzas</h1>
        <p className="text-sm text-gray-500 mt-1">{usuario.nombre}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className={`rounded-xl border p-5 ${listaPendientes.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}`}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pendientes</p>
          <p className={`text-3xl font-bold mt-1 ${listaPendientes.length > 0 ? 'text-amber-700' : 'text-gray-900'}`}>
            {listaPendientes.length}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Aprobadas</p>
          <p className="text-3xl font-bold text-green-700 mt-1">{totalAprobadas ?? 0}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Rechazadas</p>
          <p className="text-3xl font-bold text-red-600 mt-1">{totalRechazadas ?? 0}</p>
        </div>
      </div>

      {/* Corte semanal de operador */}
      <Link
        href="/finanzas/corte"
        className="block bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all p-5"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-gray-900">Generar corte semanal de operador</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Elige conductor y periodo, y descarga el documento de liquidación en Excel o PDF, listo para firma.
            </p>
          </div>
          <span className="text-blue-600 text-sm font-medium shrink-0">Generar →</span>
        </div>
      </Link>

      {/* Alertas de desviación */}
      {listaDesviacion.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-xs font-bold text-red-700 uppercase tracking-wide mb-2">
            Desviación &gt;15% — requieren atención
          </p>
          <ul className="space-y-1">
            {listaDesviacion.map((c: any) => (
              <li key={c.id}>
                <Link href={`/finanzas/viajes/${c.id}`} className="text-sm text-red-800 hover:underline">
                  {c.viaje?.cliente ?? '—'} · {fmtPct(c.desviacion_pct)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Lista de pendientes */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Pendientes de revisión</h2>
          <Link href="/finanzas/viajes" className="text-xs text-blue-600 hover:underline">Ver todas →</Link>
        </div>

        {listaPendientes.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm bg-white rounded-xl border border-gray-200">
            Sin conciliaciones pendientes. Todo al día.
          </div>
        ) : (
          <div className="space-y-3">
            {listaPendientes.map((c: any) => {
              const pct    = c.desviacion_pct as number | null
              const alerta = pct !== null && Math.abs(pct) > 15
              return (
                <Link
                  key={c.id}
                  href={`/finanzas/viajes/${c.id}`}
                  className="block bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {alerta && (
                        <span className="inline-block text-xs bg-red-100 text-red-700 font-semibold px-2 py-0.5 rounded-full mb-1">
                          Desviación {fmtPct(pct)}
                        </span>
                      )}
                      <p className="font-semibold text-gray-900 truncate">
                        {c.viaje?.cliente ?? '—'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {c.viaje?.vehiculo?.placas ?? '—'}
                        {c.viaje?.conductor?.usuario?.nombre ? ` · ${c.viaje.conductor.usuario.nombre}` : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-900">{fmt(c.total_gastado)}</p>
                      <p className="text-xs mt-0.5 text-gray-500">
                        {SALDO_LABEL[c.saldo] ?? c.saldo}
                      </p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
