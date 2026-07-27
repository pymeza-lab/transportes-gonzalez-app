import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import GastoForm from './GastoForm'

export const dynamic = 'force-dynamic'

const CAT_LABEL: Record<string, string> = {
  combustible: 'Combustible',
  caseta:      'Caseta',
  comida:      'Comida',
  hospedaje:   'Hospedaje',
  imprevisto:  'Imprevisto',
}

// Límites SAT (solo visuales)
const LIMITE_SAT: Partial<Record<string, number>> = {
  comida: 750,
}

function fmt(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

export default async function GastosPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: viaje }, { data: gastos }] = await Promise.all([
    supabase
      .from('viaje')
      .select('id, cliente, estado, anticipo_monto')
      .eq('id', params.id)
      .single(),
    supabase
      .from('gasto_viaje')
      .select('id, categoria, monto, tiene_cfdi, foto_comprobante_url, fecha')
      .eq('viaje_id', params.id)
      .order('fecha', { ascending: false }),
  ])

  if (!viaje) notFound()

  const listaGastos = (gastos ?? []) as {
    id: string; categoria: string; monto: number; tiene_cfdi: boolean
    foto_comprobante_url: string | null; fecha: string
  }[]

  const totalGastado = listaGastos.reduce((s, g) => s + Number(g.monto), 0)
  const anticipo     = Number(viaje.anticipo_monto ?? 0)
  const diferencia   = anticipo - totalGastado

  const puedeCapturar = ['programado', 'en_curso', 'entregado'].includes(viaje.estado)

  return (
    <div className="max-w-lg mx-auto space-y-5 pt-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link href={`/conductor/viaje/${params.id}`} className="text-gray-400 hover:text-gray-600 text-sm">
          ← Viaje
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-base font-semibold text-gray-900">Gastos</h1>
      </div>

      {/* Resumen financiero */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <p className="text-sm font-semibold text-gray-700 mb-3">{viaje.cliente}</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-xs text-gray-400">Anticipo</p>
            <p className="text-sm font-bold text-blue-700">{fmt(anticipo)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">Gastado</p>
            <p className="text-sm font-bold text-gray-900">{fmt(totalGastado)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">
              {diferencia >= 0 ? 'Sobrante' : 'Faltante'}
            </p>
            <p className={`text-sm font-bold ${diferencia >= 0 ? 'text-green-700' : 'text-red-600'}`}>
              {fmt(Math.abs(diferencia))}
            </p>
          </div>
        </div>
      </div>

      {/* Formulario de captura (solo si el viaje no está cerrado/cancelado) */}
      {puedeCapturar && (
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-3">Registrar gasto</p>
          <GastoForm viajeId={params.id} />
        </div>
      )}

      {/* Lista de gastos */}
      {listaGastos.length > 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <p className="px-5 py-3 text-sm font-semibold text-gray-700 border-b border-gray-100">
            Gastos registrados ({listaGastos.length})
          </p>
          <ul className="divide-y divide-gray-100">
            {listaGastos.map(g => {
              const monto             = Number(g.monto)
              const limite            = LIMITE_SAT[g.categoria]
              const excede            = limite !== undefined && monto > limite
              const sinFoto           = !g.foto_comprobante_url
              const hospedajeSinCfdi  = g.categoria === 'hospedaje' && !g.tiene_cfdi
              return (
                <li key={g.id} className="px-5 py-4 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900">
                        {CAT_LABEL[g.categoria] ?? g.categoria}
                      </span>
                      {sinFoto && (
                        <span className="text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">
                          Sin soporte
                        </span>
                      )}
                      {hospedajeSinCfdi ? (
                        <span className="text-xs bg-red-100 text-red-700 rounded-full px-2 py-0.5">
                          Hospedaje sin CFDI
                        </span>
                      ) : !g.tiene_cfdi && (
                        <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
                          Sin CFDI
                        </span>
                      )}
                      {excede && (
                        <span className="text-xs bg-orange-100 text-orange-700 rounded-full px-2 py-0.5">
                          Excede límite SAT
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(g.fecha).toLocaleString('es-MX', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-gray-900 shrink-0">{fmt(monto)}</p>
                </li>
              )
            })}
          </ul>
        </div>
      ) : (
        <div className="text-center py-10 text-gray-400 text-sm">
          Aún no hay gastos registrados para este viaje.
        </div>
      )}
    </div>
  )
}
