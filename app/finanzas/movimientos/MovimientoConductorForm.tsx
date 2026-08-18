'use client'

import { useMemo, useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { registrarMovimientoConductor } from './actions'

const TIPOS = [
  { value: 'pago_viajes',       label: 'Pago de viajes (salario)' },
  { value: 'descuento',         label: 'Descuento' },
  { value: 'bono',              label: 'Bono' },
  { value: 'prestamo_otorgado', label: 'Préstamo otorgado' },
  { value: 'abono_prestamo',    label: 'Abono a préstamo' },
] as const

const TIPO_LABEL: Record<string, string> = Object.fromEntries(TIPOS.map(t => [t.value, t.label]))

interface ConductorOption {
  id: string
  licencia_federal_numero: string
  usuario: { nombre: string } | null
}

interface MovimientoExistente {
  id: string
  conductor_id: string
  tipo: string
  monto: number
  fecha: string
  notas: string | null
}

function fmt(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full py-3.5 bg-blue-600 text-white text-base font-bold rounded-2xl shadow active:scale-95 transition-all disabled:opacity-50"
    >
      {pending ? 'Guardando…' : 'Registrar movimiento'}
    </button>
  )
}

export default function MovimientoConductorForm({
  conductores,
  movimientosExistentes,
  conductorInicialId,
}: {
  conductores: ConductorOption[]
  movimientosExistentes: MovimientoExistente[]
  conductorInicialId: string | null
}) {
  const [state, action] = useFormState(registrarMovimientoConductor, null)
  const [conductorId, setConductorId] = useState(conductorInicialId ?? '')

  const movimientosDelConductor = useMemo(
    () =>
      movimientosExistentes
        .filter(m => m.conductor_id === conductorId)
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()),
    [movimientosExistentes, conductorId]
  )

  const saldoPrestamo = useMemo(() => {
    const otorgado = movimientosDelConductor
      .filter(m => m.tipo === 'prestamo_otorgado')
      .reduce((s, m) => s + Number(m.monto), 0)
    const abonado = movimientosDelConductor
      .filter(m => m.tipo === 'abono_prestamo')
      .reduce((s, m) => s + Number(m.monto), 0)
    return otorgado - abonado
  }, [movimientosDelConductor])

  return (
    <div className="space-y-5">
      <form action={action} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-5">
        {/* Conductor */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Conductor <span className="text-red-500">*</span>
          </label>
          <select
            name="conductor_id"
            value={conductorId}
            onChange={e => setConductorId(e.target.value)}
            required
            className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="" disabled>Seleccionar conductor…</option>
            {conductores.map(c => (
              <option key={c.id} value={c.id}>
                {c.usuario?.nombre ?? '—'} — Lic. {c.licencia_federal_numero}
              </option>
            ))}
          </select>
        </div>

        {conductorId && saldoPrestamo !== 0 && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Saldo de préstamo pendiente actual: <strong>{fmt(saldoPrestamo)}</strong>
          </p>
        )}

        {/* Tipo */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Tipo de movimiento <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {TIPOS.map(t => (
              <label
                key={t.value}
                className="flex items-center gap-2 p-3 border border-gray-200 rounded-xl cursor-pointer has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 transition-colors"
              >
                <input type="radio" name="tipo" value={t.value} required className="accent-blue-600" />
                <span className="text-sm font-medium text-gray-800">{t.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Monto */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Monto (MXN) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
              <input
                type="number"
                name="monto"
                min="0"
                step="0.01"
                required
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-2.5 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Fecha <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="fecha"
              required
              defaultValue={hoyISO()}
              max={hoyISO()}
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Notas */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Notas <span className="font-normal text-gray-400">(opcional)</span>
          </label>
          <textarea
            name="notas"
            rows={2}
            placeholder="Ej. Semana del 10 al 16 de agosto, préstamo para reparación de auto, etc."
            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {state?.error && (
          <p className="text-sm text-red-700 bg-red-50 rounded-xl px-4 py-3">{state.error}</p>
        )}

        <SubmitButton />
      </form>

      {/* Movimientos recientes del conductor seleccionado, para confirmar la captura */}
      {conductorId && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <p className="px-5 py-3 text-sm font-semibold text-gray-700 border-b border-gray-100">
            Movimientos recientes ({movimientosDelConductor.length})
          </p>
          {movimientosDelConductor.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-gray-400">Aún no hay movimientos para este conductor.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {movimientosDelConductor.slice(0, 20).map(m => (
                <li key={m.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{TIPO_LABEL[m.tipo] ?? m.tipo}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(m.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                    {m.notas && <p className="text-xs text-gray-600 mt-0.5 italic">{m.notas}</p>}
                  </div>
                  <p className="text-sm font-bold text-gray-900 shrink-0">{fmt(Number(m.monto))}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
