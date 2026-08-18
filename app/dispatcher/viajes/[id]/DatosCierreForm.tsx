'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { actualizarDatosCierre } from '../../actions'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
    >
      {pending ? 'Guardando…' : 'Guardar datos de cierre'}
    </button>
  )
}

function fechaInputValue(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toISOString().slice(0, 10)
}

export default function DatosCierreForm({
  viajeId,
  remolque,
  documento,
  kmInicial,
  kmFinal,
  litros,
  fechaCobro,
}: {
  viajeId: string
  remolque: string | null
  documento: string | null
  kmInicial: number | null
  kmFinal: number | null
  litros: number | null
  fechaCobro: string | null
}) {
  const [state, formAction] = useFormState(actualizarDatosCierre, null)
  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="viaje_id" value={viajeId} />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Remolque</label>
          <input name="remolque" type="text" defaultValue={remolque ?? ''} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Documento</label>
          <input name="documento" type="text" defaultValue={documento ?? ''} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Fecha de cobro</label>
          <input name="fecha_cobro" type="date" defaultValue={fechaInputValue(fechaCobro)} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Km inicial</label>
          <input name="km_inicial" type="number" step="0.1" defaultValue={kmInicial ?? ''} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Km final</label>
          <input name="km_final" type="number" step="0.1" defaultValue={kmFinal ?? ''} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Litros</label>
          <input name="litros" type="number" step="0.1" defaultValue={litros ?? ''} className={inputClass} />
        </div>
      </div>

      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{state.error}</p>
      )}

      <SubmitButton />
    </form>
  )
}
