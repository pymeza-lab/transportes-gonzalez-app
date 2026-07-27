'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { iniciarTramo, terminarTramo } from './actions'

function Btn({ label, pending, color }: { label: string; pending: string; color: string }) {
  const { pending: isPending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={isPending}
      className={`w-full py-5 text-white text-lg font-bold rounded-2xl shadow-md active:scale-95 transition-all disabled:opacity-50 ${color}`}
    >
      {isPending ? pending : label}
    </button>
  )
}

export function IniciarTramoForm({ viajeId }: { viajeId: string }) {
  const [state, action] = useFormState(iniciarTramo, null)
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="viaje_id" value={viajeId} />
      {state?.error && (
        <p className="text-sm text-red-700 bg-red-50 rounded-xl px-4 py-3">{state.error}</p>
      )}
      <Btn label="Iniciar conducción" pending="Iniciando…" color="bg-blue-600 hover:bg-blue-700" />
    </form>
  )
}

export function TerminarTramoForm({ viajeId }: { viajeId: string }) {
  const [state, action] = useFormState(terminarTramo, null)
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="viaje_id" value={viajeId} />

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Minutos de pausa durante el tramo
        </label>
        <input
          type="number"
          name="minutos_pausa"
          min="0"
          defaultValue="0"
          placeholder="0"
          className="w-full px-4 py-3.5 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-400 mt-1">Comidas, descansos, carga/descarga, etc.</p>
      </div>

      {state?.error && (
        <p className="text-sm text-red-700 bg-red-50 rounded-xl px-4 py-3">{state.error}</p>
      )}

      <Btn label="Terminar conducción" pending="Guardando…" color="bg-amber-600 hover:bg-amber-700" />
    </form>
  )
}
