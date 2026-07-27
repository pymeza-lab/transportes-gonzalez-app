import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { IniciarTramoForm, TerminarTramoForm } from './BitacoraControles'

export const dynamic = 'force-dynamic'

const LIMITE_NOM087 = 10

function fmtHoras(h: number) {
  const hrs = Math.floor(h)
  const min = Math.round((h - hrs) * 60)
  return `${hrs}h ${min.toString().padStart(2, '0')}m`
}

function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

function fmtFechaHora(iso: string) {
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export default async function BitacoraPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Obtener usuario + conductor_id
  const { data: usuario } = await supabase
    .from('usuario')
    .select('id, rol')
    .eq('auth_user_id', user.id)
    .single()

  if (!usuario) redirect('/login')

  const { data: conductor } = await supabase
    .from('conductor')
    .select('id')
    .eq('usuario_id', usuario.id)
    .maybeSingle()

  if (!conductor) notFound()

  const { data: viaje } = await supabase
    .from('viaje')
    .select('id, cliente, estado')
    .eq('id', params.id)
    .single()

  if (!viaje) notFound()

  // Tramos de este viaje para este conductor
  const { data: tramos } = await supabase
    .from('bitacora_horas')
    .select('id, fecha, hora_inicio_conduccion, hora_fin_conduccion, minutos_pausa, horas_conducidas_24h_acumuladas')
    .eq('conductor_id', conductor.id)
    .eq('viaje_id', params.id)
    .order('hora_inicio_conduccion', { ascending: false })

  const lista = (tramos ?? []) as {
    id: string
    fecha: string
    hora_inicio_conduccion: string
    hora_fin_conduccion: string | null
    minutos_pausa: number
    horas_conducidas_24h_acumuladas: number | null
  }[]

  const tramoAbierto = lista.find(t => !t.hora_fin_conduccion) ?? null
  const tramosCerrados = lista.filter(t => !!t.hora_fin_conduccion)

  // Horas acumuladas en las últimas 24h (del tramo más reciente cerrado)
  const horasAcum = tramosCerrados[0]?.horas_conducidas_24h_acumuladas ?? 0
  const alerta24h = horasAcum >= LIMITE_NOM087
  const puedeIniciar = !tramoAbierto && ['programado', 'en_curso'].includes(viaje.estado)

  return (
    <div className="max-w-lg mx-auto space-y-5 pt-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link href={`/conductor/viaje/${params.id}`} className="text-gray-400 hover:text-gray-600 text-sm">
          ← Viaje
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-base font-semibold text-gray-900">Bitácora de horas</h1>
      </div>

      {/* Cliente / viaje */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
        <p className="text-sm font-semibold text-blue-800">{viaje.cliente}</p>
        <p className="text-xs text-blue-600 mt-0.5">NOM-087 · Límite: {LIMITE_NOM087}h en 24h</p>
      </div>

      {/* Alerta límite NOM-087 */}
      {alerta24h && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4">
          <p className="text-sm font-bold text-red-800">Límite NOM-087 alcanzado</p>
          <p className="text-xs text-red-600 mt-1">
            Acumulaste {fmtHoras(horasAcum)} de conducción en las últimas 24h.
            Debes descansar antes de continuar.
          </p>
        </div>
      )}

      {/* Resumen acumulado */}
      {tramosCerrados.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-xs text-gray-400 mb-1">Horas acumuladas (últimas 24h)</p>
          <p className={`text-3xl font-bold ${alerta24h ? 'text-red-600' : 'text-gray-900'}`}>
            {fmtHoras(horasAcum)}
          </p>
          <div className="mt-3 bg-gray-100 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${alerta24h ? 'bg-red-500' : 'bg-blue-500'}`}
              style={{ width: `${Math.min(100, (horasAcum / LIMITE_NOM087) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1 text-right">{LIMITE_NOM087}h máx.</p>
        </div>
      )}

      {/* Tramo en curso */}
      {tramoAbierto && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <p className="text-sm font-bold text-amber-800">Tramo en curso</p>
          </div>
          <p className="text-xs text-amber-700">
            Iniciado a las {fmtHora(tramoAbierto.hora_inicio_conduccion)}
          </p>
          <TerminarTramoForm viajeId={params.id} />
        </div>
      )}

      {/* Botón iniciar */}
      {puedeIniciar && (
        <IniciarTramoForm viajeId={params.id} />
      )}

      {/* Viaje terminado / cancelado */}
      {!puedeIniciar && !tramoAbierto && (
        <div className="text-center py-4 text-sm text-gray-400">
          El viaje no admite nuevos tramos de conducción.
        </div>
      )}

      {/* Historial de tramos */}
      {tramosCerrados.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <p className="px-5 py-3 text-sm font-semibold text-gray-700 border-b border-gray-100">
            Tramos registrados ({tramosCerrados.length})
          </p>
          <ul className="divide-y divide-gray-100">
            {tramosCerrados.map(t => {
              const ini    = new Date(t.hora_inicio_conduccion)
              const fin    = new Date(t.hora_fin_conduccion!)
              const durMs  = fin.getTime() - ini.getTime() - (t.minutos_pausa ?? 0) * 60_000
              const durH   = Math.max(0, durMs / 3_600_000)
              return (
                <li key={t.id} className="px-5 py-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-gray-900">
                      {fmtHora(t.hora_inicio_conduccion)} – {fmtHora(t.hora_fin_conduccion!)}
                    </span>
                    <span className="text-sm font-bold text-blue-700">{fmtHoras(durH)}</span>
                  </div>
                  <div className="flex gap-4 text-xs text-gray-400">
                    <span>{fmtFechaHora(t.hora_inicio_conduccion).split(',')[0]}</span>
                    {t.minutos_pausa > 0 && <span>Pausa: {t.minutos_pausa} min</span>}
                    {t.horas_conducidas_24h_acumuladas !== null && (
                      <span className={t.horas_conducidas_24h_acumuladas >= LIMITE_NOM087 ? 'text-red-500 font-semibold' : ''}>
                        Acum 24h: {fmtHoras(t.horas_conducidas_24h_acumuladas)}
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
