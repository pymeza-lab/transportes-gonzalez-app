import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

function hace7DiasISO() {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d.toISOString().slice(0, 10)
}

export default async function CorteSemanalPage({
  searchParams,
}: {
  searchParams: { conductor?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuario').select('rol').eq('auth_user_id', user.id).single()
  if (!usuario || !['finanzas', 'admin'].includes(usuario.rol)) redirect('/login')

  const { data: conductores } = await supabase
    .from('conductor')
    .select('id, licencia_federal_numero, usuario:usuario_id ( nombre )')
    .order('id')

  const listaConductores = (conductores ?? []) as any[]

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Corte semanal de operador</h1>
        <p className="text-sm text-gray-500 mt-1">
          Elige conductor y periodo. El documento se arma solo con lo capturado en la app
          (viajes, gastos, anticipos y movimientos de nómina) y queda listo para imprimir y firmar.
        </p>
      </div>

      <form
        action="/finanzas/corte/generar"
        method="get"
        className="bg-white rounded-2xl border border-gray-200 p-5 space-y-5"
      >
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Conductor <span className="text-red-500">*</span>
          </label>
          <select
            name="conductor_id"
            required
            defaultValue={searchParams.conductor ?? ''}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="" disabled>Seleccionar conductor…</option>
            {listaConductores.map(c => (
              <option key={c.id} value={c.id}>
                {c.usuario?.nombre ?? '—'} — Lic. {c.licencia_federal_numero}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Del <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="desde"
              required
              defaultValue={hace7DiasISO()}
              max={hoyISO()}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Al <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="hasta"
              required
              defaultValue={hoyISO()}
              max={hoyISO()}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex gap-3 flex-wrap pt-2">
          <button
            type="submit"
            name="formato"
            value="xlsx"
            className="flex-1 py-3 bg-green-700 text-white text-sm font-bold rounded-xl hover:bg-green-800 transition-colors"
          >
            Descargar Excel
          </button>
          <button
            type="submit"
            name="formato"
            value="pdf"
            className="flex-1 py-3 bg-red-700 text-white text-sm font-bold rounded-xl hover:bg-red-800 transition-colors"
          >
            Descargar PDF
          </button>
        </div>
      </form>
    </div>
  )
}
