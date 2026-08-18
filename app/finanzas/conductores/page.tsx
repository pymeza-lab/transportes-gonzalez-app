import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const ESTADO_LABEL: Record<string, string> = {
  activo:   'Activo',
  inactivo: 'Inactivo',
}

interface ConductorRow {
  id: string
  estado: string
  licencia_federal_numero: string
  usuario: { nombre: string } | null
}

export default async function FinanzasConductoresPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: conductores }, { data: viajes }] = await Promise.all([
    supabase
      .from('conductor')
      .select('id, estado, licencia_federal_numero, usuario:usuario_id ( nombre )')
      .order('id'),
    supabase
      .from('viaje')
      .select('id, conductor_id, estado'),
  ])

  const listaConductores = (conductores ?? []) as unknown as ConductorRow[]
  const listaViajes = (viajes ?? []) as { id: string; conductor_id: string; estado: string }[]

  // Conteos por conductor, calculados aquí en vez de con una vista SQL nueva
  // (fuera de alcance agregar tablas/vistas para esta consulta).
  const conteoPorConductor = new Map<string, { abiertos: number; total: number }>()
  for (const v of listaViajes) {
    const actual = conteoPorConductor.get(v.conductor_id) ?? { abiertos: 0, total: 0 }
    actual.total += 1
    if (v.estado === 'programado' || v.estado === 'en_curso') actual.abiertos += 1
    conteoPorConductor.set(v.conductor_id, actual)
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Conductores</h1>
        <p className="text-sm text-gray-500 mt-1">
          Consulta en cualquier momento (no solo al cerrar un viaje): viajes abiertos/recientes,
          gastos capturados, y qué falta de soporte o CFDI.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Conductor</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Licencia</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Viajes abiertos</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Viajes (total)</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {listaConductores.map(c => {
              const conteo = conteoPorConductor.get(c.id) ?? { abiertos: 0, total: 0 }
              return (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 font-medium text-gray-900">{c.usuario?.nombre ?? '—'}</td>
                  <td className="px-6 py-3 text-gray-600">{c.licencia_federal_numero}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                      c.estado === 'activo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {ESTADO_LABEL[c.estado] ?? c.estado}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    {conteo.abiertos > 0 ? (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                        {conteo.abiertos}
                      </span>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right text-gray-600">{conteo.total}</td>
                  <td className="px-6 py-3 text-right">
                    <Link href={`/finanzas/conductores/${c.id}`} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                      Ver detalle →
                    </Link>
                  </td>
                </tr>
              )
            })}
            {!listaConductores.length && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-gray-400 text-sm">
                  Sin conductores registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
