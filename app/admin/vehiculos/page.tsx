import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NuevoVehiculoForm from './NuevoVehiculoForm'
import type { Vehiculo, EstadoVehiculo } from '@/lib/types'
import { ESTADO_VEHICULO_LABELS } from '@/lib/types'

export const dynamic = 'force-dynamic'

const ESTADO_BADGE: Record<EstadoVehiculo, string> = {
  disponible:     'bg-green-100 text-green-700',
  en_ruta:        'bg-blue-100 text-blue-700',
  mantenimiento:  'bg-amber-100 text-amber-700',
  fuera_servicio: 'bg-red-100 text-red-700',
}

export default async function VehiculosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: caller } = await supabase
    .from('usuario').select('rol').eq('auth_user_id', user.id).single()
  if (!caller || caller.rol !== 'admin') redirect('/login')

  const [{ data: vehiculos }, { data: alertas }] = await Promise.all([
    supabase.from('vehiculo').select('*').order('placas'),
    supabase
      .from('alerta')
      .select('entidad_referencia')
      .eq('tipo', 'documento_por_vencer')
      .eq('atendida', false),
  ])

  // Contar alertas activas por vehiculo_id
  const alertasPorVehiculo = new Map<string, number>()
  alertas?.forEach(a => {
    if (a.entidad_referencia) {
      alertasPorVehiculo.set(
        a.entidad_referencia,
        (alertasPorVehiculo.get(a.entidad_referencia) ?? 0) + 1
      )
    }
  })

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Vehículos</h1>
        <p className="text-sm text-gray-500 mt-1">Flota de Transportes González</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">
            Unidades registradas ({vehiculos?.length ?? 0})
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Placas</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Config.</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Caja</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Alertas</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(vehiculos as Vehiculo[])?.map(v => {
              const numAlertas = alertasPorVehiculo.get(v.id) ?? 0
              return (
                <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 font-medium text-gray-900">{v.placas}</td>
                  <td className="px-6 py-3 text-gray-600">{v.configuracion_vehicular}</td>
                  <td className="px-6 py-3 text-gray-500">{v.tipo_caja ?? '—'}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${ESTADO_BADGE[v.estado]}`}>
                      {ESTADO_VEHICULO_LABELS[v.estado]}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    {numAlertas > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                        ⚠ {numAlertas} alerta{numAlertas !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <Link
                      href={`/admin/vehiculos/${v.id}`}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Ver →
                    </Link>
                  </td>
                </tr>
              )
            })}
            {!vehiculos?.length && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-gray-400 text-sm">
                  Sin vehículos registrados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-5">Agregar vehículo</h2>
        <NuevoVehiculoForm />
      </div>
    </div>
  )
}
