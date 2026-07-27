'use client'

import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { crearViaje } from '../actions'

interface RutaOption {
  id: string
  nombre: string
  origen: string
  destino: string
  presupuesto_combustible: number
  presupuesto_casetas: number
  presupuesto_viaticos: number
  presupuesto_imprevistos: number
}

interface VehiculoOption {
  id: string
  placas: string
  configuracion_vehicular: string
  tipo_caja: string | null
}

interface ConductorOption {
  id: string
  licencia_federal_numero: string
  usuario: { nombre: string } | null
}

function mxn(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
    >
      {pending ? 'Creando viaje…' : 'Crear viaje'}
    </button>
  )
}

export default function NuevoViajeForm({
  rutas,
  vehiculos,
  conductores,
}: {
  rutas: RutaOption[]
  vehiculos: VehiculoOption[]
  conductores: ConductorOption[]
}) {
  const [state, formAction] = useFormState(crearViaje, null)
  const [rutaSeleccionada, setRutaSeleccionada] = useState<RutaOption | null>(null)

  function onRutaChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const ruta = rutas.find(r => r.id === e.target.value) ?? null
    setRutaSeleccionada(ruta)
  }

  const totalPresupuesto = rutaSeleccionada
    ? rutaSeleccionada.presupuesto_combustible
    + rutaSeleccionada.presupuesto_casetas
    + rutaSeleccionada.presupuesto_viaticos
    + rutaSeleccionada.presupuesto_imprevistos
    : null

  return (
    <form action={formAction} className="space-y-6">
      {/* Ruta */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Ruta <span className="text-red-500">*</span>
        </label>
        <select
          name="ruta_plantilla_id"
          required
          defaultValue=""
          onChange={onRutaChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="" disabled>Seleccionar ruta…</option>
          {rutas.map(r => (
            <option key={r.id} value={r.id}>{r.nombre}</option>
          ))}
        </select>
        {rutaSeleccionada && (
          <p className="mt-1 text-xs text-gray-500">
            {rutaSeleccionada.origen} → {rutaSeleccionada.destino}
          </p>
        )}
      </div>

      {/* Presupuesto congelado (solo lectura) */}
      {rutaSeleccionada && (
        <div className="rounded-lg bg-blue-50 border border-blue-100 p-4">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-3">
            Presupuesto que se congelará en este viaje
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Combustible', val: rutaSeleccionada.presupuesto_combustible },
              { label: 'Casetas',     val: rutaSeleccionada.presupuesto_casetas },
              { label: 'Viáticos',    val: rutaSeleccionada.presupuesto_viaticos },
              { label: 'Imprevistos', val: rutaSeleccionada.presupuesto_imprevistos },
            ].map(({ label, val }) => (
              <div key={label}>
                <p className="text-xs text-blue-600 mb-0.5">{label}</p>
                <p className="text-sm font-medium text-blue-900">{mxn(val)}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-blue-200 flex justify-between">
            <p className="text-xs font-semibold text-blue-700">Total</p>
            <p className="text-sm font-bold text-blue-900">{mxn(totalPresupuesto!)}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Vehículo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Vehículo (disponible) <span className="text-red-500">*</span>
          </label>
          <select
            name="vehiculo_id"
            required
            defaultValue=""
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="" disabled>Seleccionar…</option>
            {vehiculos.map(v => (
              <option key={v.id} value={v.id}>
                {v.placas} — {v.configuracion_vehicular}{v.tipo_caja ? ` ${v.tipo_caja}` : ''}
              </option>
            ))}
          </select>
          {!vehiculos.length && (
            <p className="mt-1 text-xs text-amber-600">Sin vehículos disponibles en este momento.</p>
          )}
        </div>

        {/* Conductor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Conductor (activo) <span className="text-red-500">*</span>
          </label>
          <select
            name="conductor_id"
            required
            defaultValue=""
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="" disabled>Seleccionar…</option>
            {conductores.map(c => (
              <option key={c.id} value={c.id}>
                {c.usuario?.nombre ?? '—'} — Lic. {c.licencia_federal_numero}
              </option>
            ))}
          </select>
          {!conductores.length && (
            <p className="mt-1 text-xs text-amber-600">Sin conductores activos registrados.</p>
          )}
        </div>

        {/* Cliente */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cliente <span className="text-red-500">*</span>
          </label>
          <input
            name="cliente"
            type="text"
            required
            placeholder="Ej. FEMSA Distribución"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Fecha programada */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fecha programada <span className="text-red-500">*</span>
          </label>
          <input
            name="fecha_programada"
            type="datetime-local"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Anticipo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Anticipo al conductor (MXN)
          </label>
          <input
            name="anticipo_monto"
            type="number"
            min={0}
            step={0.01}
            placeholder="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {state?.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
          <p className="text-sm text-red-700">{state.error}</p>
        </div>
      )}

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  )
}
