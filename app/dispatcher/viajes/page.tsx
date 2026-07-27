import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NuevoViajeForm from './NuevoViajeForm'

export const dynamic = 'force-dynamic'

const ESTADO_BADGE: Record<string, string> = {
  programado:  'bg-blue-100 text-blue-700',
  en_curso:    'bg-amber-100 text-amber-700',
  entregado:   'bg-green-100 text-green-700',
  cerrado:     'bg-gray-100 text-gray-600',
  cancelado:   'bg-red-100 text-red-700',
}

const ESTADO_LABELS: Record<string, string> = {
  programado:  'Programado',
  en_curso:    'En curso',
  entregado:   'Entregado',
  cerrado:     'Cerrado',
  cancelado:   'Cancelado',
}

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default async function ViajesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: caller } = await supabase
    .from('usuario').select('rol').eq('auth_user_id', user.id).single()
  if (!caller || !['admin', 'dispatcher'].includes(caller.rol)) redirect('/login')

  // Vehículos/conductores con un viaje programado o en curso no deben ofrecerse
  // de nuevo en el formulario, aunque su estado individual siga en 'disponible'/
  // 'activo' (eso pasa con los viajes 'programado', que todavía no tocan
  // vehiculo.estado porque el camión no ha salido).
  const { data: viajesActivos } = await supabase
    .from('viaje')
    .select('vehiculo_id, conductor_id')
    .in('estado', ['programado', 'en_curso'])

  const SIN_COINCIDENCIA = '00000000-0000-0000-0000-000000000000'
  const vehiculosOcupados = [...new Set((viajesActivos ?? []).map(v => v.vehiculo_id))]
  const conductoresOcupados = [...new Set((viajesActivos ?? []).map(v => v.conductor_id))]
  const vehiculosExcluidos = vehiculosOcupados.length ? vehiculosOcupados : [SIN_COINCIDENCIA]
  const conductoresExcluidos = conductoresOcupados.length ? conductoresOcupados : [SIN_COINCIDENCIA]

  const [
    { data: viajes },
    { data: rutas },
    { data: vehiculos },
    { data: conductores },
  ] = await Promise.all([
    supabase
      .from('viaje')
      .select(`
        id, cliente, estado, fecha_programada,
        vehiculo:vehiculo_id ( placas ),
        conductor:conductor_id ( usuario:usuario_id ( nombre ) )
      `)
      .order('fecha_programada', { ascending: false })
      .limit(100),

    supabase
      .from('ruta_plantilla')
      .select('id, nombre, origen, destino, presupuesto_combustible, presupuesto_casetas, presupuesto_viaticos, presupuesto_imprevistos')
      .eq('activa', true)
      .order('nombre'),

    supabase
      .from('vehiculo')
      .select('id, placas, configuracion_vehicular, tipo_caja')
      .eq('estado', 'disponible')
      .not('id', 'in', `(${vehiculosExcluidos.join(',')})`)
      .order('placas'),

    supabase
      .from('conductor')
      .select('id, licencia_federal_numero, usuario:usuario_id ( nombre )')
      .eq('estado', 'activo')
      .not('id', 'in', `(${conductoresExcluidos.join(',')})`)
      .order('id'),
  ])

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Viajes</h1>
        <p className="text-sm text-gray-500 mt-1">Asignación y seguimiento de viajes</p>
      </div>

      {/* Lista de viajes */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">
            Viajes recientes ({viajes?.length ?? 0})
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Conductor</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Vehículo</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {viajes?.map((v: any) => (
              <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-3 font-medium text-gray-900">{v.cliente}</td>
                <td className="px-6 py-3 text-gray-600">{v.conductor?.usuario?.nombre ?? '—'}</td>
                <td className="px-6 py-3 text-gray-600">{v.vehiculo?.placas ?? '—'}</td>
                <td className="px-6 py-3 text-gray-500">{fmtFecha(v.fecha_programada)}</td>
                <td className="px-6 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${ESTADO_BADGE[v.estado] ?? 'bg-gray-100 text-gray-600'}`}>
                    {ESTADO_LABELS[v.estado] ?? v.estado}
                  </span>
                </td>
                <td className="px-6 py-3 text-right">
                  <Link href={`/dispatcher/viajes/${v.id}`} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                    Ver →
                  </Link>
                </td>
              </tr>
            ))}
            {!viajes?.length && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-gray-400 text-sm">
                  Sin viajes registrados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Crear viaje */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-5">Nuevo viaje</h2>
        <NuevoViajeForm
          rutas={rutas ?? []}
          vehiculos={vehiculos ?? []}
          conductores={(conductores ?? []) as any}
        />
      </div>
    </div>
  )
}
