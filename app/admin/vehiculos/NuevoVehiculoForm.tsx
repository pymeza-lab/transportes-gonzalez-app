'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { crearVehiculo } from './actions'

const CONFIGURACIONES = ['C2', 'C3', 'T2S1', 'T2S2', 'T2S3', 'T3S2', 'T3S3']

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
    >
      {pending ? 'Guardando…' : 'Guardar vehículo'}
    </button>
  )
}

export default function NuevoVehiculoForm() {
  const [state, formAction] = useFormState(crearVehiculo, null)

  return (
    <form action={formAction} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Placas <span className="text-red-500">*</span>
        </label>
        <input
          name="placas"
          type="text"
          required
          placeholder="ABC-1234"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Configuración vehicular <span className="text-red-500">*</span>
        </label>
        <select
          name="configuracion_vehicular"
          required
          defaultValue=""
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="" disabled>Seleccionar…</option>
          {CONFIGURACIONES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de caja</label>
        <select
          name="tipo_caja"
          defaultValue=""
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">No aplica</option>
          <option value="48ft">48 ft</option>
          <option value="53ft">53 ft</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
        <input
          name="anio"
          type="number"
          min={1990}
          max={new Date().getFullYear() + 1}
          placeholder="Ej. 2019"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Capacidad (kg)</label>
        <input
          name="capacidad_peso_kg"
          type="number"
          min={0}
          step={100}
          placeholder="Ej. 28000"
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
