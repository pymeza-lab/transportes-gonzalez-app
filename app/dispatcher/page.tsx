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

function fmtFecha(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export default async function DispatcherDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuario').select('nombre, rol').eq('auth_user_id', user.id).single()
  if (!usuario || !['dispatcher', 'admin'].includes(usuario.rol)) redirect('/login')

  const [
    { data: viajesActivos },
    { count: totalProgramados },
    { count: totalEnCurso },
    { data: alertasDoc },
  ] = await Promise.all([
    supabase
      .from('viaje')
      .select(`
        id, cliente, estado, fecha_programada, fecha_recoleccion_real,
        ruta:ruta_plantilla_id ( origen, destino ),
        vehiculo:vehiculo_id  ( placas ),
        conductor:conductor_id ( usuario:usuario_id ( nombre ) )
      `)
      .in('estado', ['programado', 'en_curso'])
      .order('fecha_programada', { ascending: true })
      .limit(20),
    supabase.from('viaje').select('*', { count: 'exact', head: true }).eq('estado', 'programado'),
    supabase.from('viaje').select('*', { count: 'exact', head: true }).eq('estado', 'en_curso'),
    supabase
      .from('alerta')
      .select('id, descripcion')
      .eq('atendida', false)
      .eq('tipo', 'documento_por_vencer')
      .limit(3),
  ])

  const lista = (viajesActivos ?? []) as any[]

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Operaciones</h1>
          <p className="text-sm text-gray-500 mt-1">{usuario.nombre}</p>
        </div>
        <Link
          href="/dispatcher/viajes"
          className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Nuevo viaje
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Programados</p>
          <p className="text-3xl font-bold text-blue-900 mt-1">{totalProgramados ?? 0}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">En ruta</p>
          <p className="text-3xl font-bold text-amber-900 mt-1">{totalEnCurso ?? 0}</p>
        </div>
      </div>

      {/* Alertas de documentos */}
      {(alertasDoc ?? []).length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">
            Documentos por vencer
          </p>
          {(alertasDoc ?? []).map((a: any) => (
            <p key={a.id} className="text-sm text-amber-800">{a.descripcion}</p>
          ))}
          <Link href="/admin/vehiculos" className="text-xs text-amber-700 font-semibold hover:underline">
            Ver vehículos →
          </Link>
        </div>
      )}

      {/* Lista de viajes activos */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Viajes activos</h2>
          <Link href="/dispatcher/viajes" className="text-xs text-blue-600 hover:underline">Ver todos →</Link>
        </div>

        {lista.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm bg-white rounded-xl border border-gray-200">
            No hay viajes programados ni en curso.
          </div>
        ) : (
          <div className="space-y-3">
            {lista.map((v: any) => (
              <Link
                key={v.id}
                href={`/dispatcher/viajes/${v.id}`}
                className="block bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ESTADO_BADGE[v.estado]}`}>
                        {ESTADO_LABEL[v.estado]}
                      </span>
                    </div>
                    <p className="font-semibold text-gray-900 truncate">{v.cliente}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {v.ruta?.origen && v.ruta?.destino ? `${v.ruta.origen} → ${v.ruta.destino}` : '—'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-400">
                      {v.estado === 'en_curso' ? 'Recolección' : 'Programado'}
                    </p>
                    <p className="text-sm font-medium text-gray-700">
                      {fmtFecha(v.estado === 'en_curso' ? v.fecha_recoleccion_real : v.fecha_programada)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {v.vehiculo?.placas ?? '—'}
                      {v.conductor?.usuario?.nombre ? ` · ${v.conductor.usuario.nombre}` : ''}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
