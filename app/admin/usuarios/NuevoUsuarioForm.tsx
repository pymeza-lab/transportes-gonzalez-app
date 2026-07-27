'use client'

import { useState } from 'react'
import { crearUsuario } from './actions'
import { ROL_LABELS, type RolUsuario } from '@/lib/types'

const ROLES: RolUsuario[] = ['conductor', 'dispatcher', 'finanzas', 'admin']

export default function NuevoUsuarioForm() {
  const [pending, setPending] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [rol,     setRol]     = useState<RolUsuario | ''>('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)
    setSuccess(false)

    const result = await crearUsuario(new FormData(e.currentTarget))

    if (result?.error) {
      setError(result.error)
    } else {
      setSuccess(true)
      ;(e.target as HTMLFormElement).reset()
      setRol('')
    }

    setPending(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre completo
          </label>
          <input
            name="nombre"
            type="text"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Juan Pérez"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Correo
          </label>
          <input
            name="email"
            type="email"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="usuario@tag.mx"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contraseña temporal
          </label>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Mínimo 8 caracteres"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rol
          </label>
          <select
            name="rol"
            required
            value={rol}
            onChange={e => setRol(e.target.value as RolUsuario | '')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="" disabled>Seleccionar rol…</option>
            {ROLES.map(r => (
              <option key={r} value={r}>{ROL_LABELS[r]}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Teléfono
          </label>
          <input
            name="telefono"
            type="tel"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Opcional"
          />
        </div>
      </div>

      {/* ── Campos extra solo para conductores ──────────────────────────── */}
      {rol === 'conductor' && (
        <div className="border-t border-gray-100 pt-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Perfil de conductor
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                No. de licencia federal <span className="text-red-500">*</span>
              </label>
              <input
                name="licencia_federal_numero"
                type="text"
                required={rol === 'conductor'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej. LIC-123456"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vencimiento de licencia <span className="text-red-500">*</span>
              </label>
              <input
                name="licencia_vencimiento"
                type="date"
                required={rol === 'conductor'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vencimiento examen médico
              </label>
              <input
                name="examen_medico_vencimiento"
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}
      {success && (
        <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
          Usuario creado exitosamente.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {pending ? 'Creando…' : 'Crear usuario'}
      </button>
    </form>
  )
}
