'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { crearDocumento } from '../actions'
import type { TipoDocumento } from '@/lib/types'
import { TIPO_DOCUMENTO_LABELS } from '@/lib/types'

const TIPOS: TipoDocumento[] = ['permiso_sict', 'seguro', 'verificacion', 'tenencia']

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
    >
      {pending ? 'Guardando…' : 'Guardar documento'}
    </button>
  )
}

export default function NuevoDocumentoForm({ vehiculoId }: { vehiculoId: string }) {
  const [state, formAction] = useFormState(crearDocumento, null)

  return (
    <form action={formAction} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <input type="hidden" name="vehiculo_id" value={vehiculoId} />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tipo de documento <span className="text-red-500">*</span>
        </label>
        <select
          name="tipo"
          required
          defaultValue=""
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="" disabled>Seleccionar…</option>
          {TIPOS.map(t => (
            <option key={t} value={t}>{TIPO_DOCUMENTO_LABELS[t]}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Fecha de vencimiento <span className="text-red-500">*</span>
        </label>
        <input
          name="fecha_vencimiento"
          type="date"
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          No. de documento / póliza
        </label>
        <input
          name="numero_documento"
          type="text"
          placeholder="Opcional"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {state?.error && (
        <div className="sm:col-span-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
          <p className="text-sm text-red-700">{state.error}</p>
        </div>
      )}

      <div className="sm:col-span-3 flex justify-end">
        <SubmitButton />
      </div>
    </form>
  )
}
