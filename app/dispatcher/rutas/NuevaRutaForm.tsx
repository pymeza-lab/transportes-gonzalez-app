'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { crearRutaPlantilla } from '../actions'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
    >
      {pending ? 'Guardando…' : 'Guardar ruta'}
    </button>
  )
}

export default function NuevaRutaForm() {
  const [state, formAction] = useFormState(crearRutaPlantilla, null)

  return (
    <form action={formAction} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nombre de la ruta <span className="text-red-500">*</span>
        </label>
        <input
          name="nombre"
          type="text"
          required
          placeholder="Ej. Toluca → CDMX Vallejo"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Origen <span className="text-red-500">*</span>
        </label>
        <input
          name="origen"
          type="text"
          required
          placeholder="Ej. Toluca, MEX"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Destino <span className="text-red-500">*</span>
        </label>
        <input
          name="destino"
          type="text"
          required
          placeholder="Ej. CDMX, Vallejo"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Distancia (km) <span className="text-red-500">*</span>
        </label>
        <input
          name="distancia_km"
          type="number"
          required
          min={1}
          step={1}
          placeholder="Ej. 85"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div />

      <p className="sm:col-span-2 text-xs font-semibold text-gray-500 uppercase tracking-wide pt-2">
        Presupuesto estimado (MXN)
      </p>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Combustible</label>
        <input
          name="presupuesto_combustible"
          type="number"
          min={0}
          step={0.01}
          defaultValue={0}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Casetas</label>
        <input
          name="presupuesto_casetas"
          type="number"
          min={0}
          step={0.01}
          defaultValue={0}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Viáticos</label>
        <input
          name="presupuesto_viaticos"
          type="number"
          min={0}
          step={0.01}
          defaultValue={0}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Imprevistos</label>
        <input
          name="presupuesto_imprevistos"
          type="number"
          min={0}
          step={0.01}
          defaultValue={0}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {state?.error && (
        <div className="sm:col-span-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
          <p className="text-sm text-red-700">{state.error}</p>
        </div>
      )}

      <div className="sm:col-span-2 flex justify-end">
        <SubmitButton />
      </div>
    </form>
  )
}
