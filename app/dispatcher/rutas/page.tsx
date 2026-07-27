import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { toggleRutaActiva } from '../actions'
import NuevaRutaForm from './NuevaRutaForm'

export const dynamic = 'force-dynamic'

function mxn(n: number | null) {
  if (n === null || n === undefined) return '—'
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
}

export default async function RutasPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: caller } = await supabase
    .from('usuario').select('rol').eq('auth_user_id', user.id).single()
  if (!caller || !['admin', 'dispatcher'].includes(caller.rol)) redirect('/login')

  const { data: rutas } = await supabase
    .from('ruta_plantilla')
    .select('*')
    .order('nombre')

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Rutas</h1>
        <p className="text-sm text-gray-500 mt-1">Plantillas de rutas recurrentes</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">
            Catálogo ({rutas?.length ?? 0})
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Ruta</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">km</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Presupuesto total</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rutas?.map(r => {
              const total = (r.presupuesto_combustible ?? 0)
                + (r.presupuesto_casetas ?? 0)
                + (r.presupuesto_viaticos ?? 0)
                + (r.presupuesto_imprevistos ?? 0)
              return (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3">
                    <p className="font-medium text-gray-900">{r.nombre}</p>
                    <p className="text-xs text-gray-400">{r.origen} → {r.destino}</p>
                  </td>
                  <td className="px-6 py-3 text-gray-600">{r.distancia_km}</td>
                  <td className="px-6 py-3 text-right font-medium text-gray-900">{mxn(total)}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${r.activa ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {r.activa ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <form action={toggleRutaActiva}>
                      <input type="hidden" name="ruta_id" value={r.id} />
                      <input type="hidden" name="activa"  value={String(r.activa)} />
                      <button type="submit" className="text-xs text-gray-500 hover:text-gray-700 underline">
                        {r.activa ? 'Desactivar' : 'Activar'}
                      </button>
                    </form>
                  </td>
                </tr>
              )
            })}
            {!rutas?.length && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-gray-400 text-sm">
                  Sin rutas registradas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-5">Nueva ruta</h2>
        <NuevaRutaForm />
      </div>
    </div>
  )
}
