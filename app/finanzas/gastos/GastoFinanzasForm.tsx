'use client'

import { useMemo, useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { registrarGastoFinanzas } from './actions'
import { compressImage } from '@/lib/compressImage'

const CATEGORIAS = [
  { value: 'combustible', label: 'Combustible' },
  { value: 'caseta',      label: 'Caseta' },
  { value: 'comida',      label: 'Comida' },
  { value: 'hospedaje',   label: 'Hospedaje' },
  { value: 'imprevisto',  label: 'Imprevisto' },
] as const

// Límites SAT: solo para indicación visual, nunca bloquean la captura
// (misma regla que app/conductor/viaje/[id]/gastos/GastoForm.tsx).
const LIMITE_SAT: Partial<Record<string, number>> = {
  comida: 750,
}

const CAT_LABEL: Record<string, string> = Object.fromEntries(CATEGORIAS.map(c => [c.value, c.label]))

const ESTADO_LABEL: Record<string, string> = {
  programado: 'Programado',
  en_curso:   'En curso',
}

interface ConductorOption {
  id: string
  licencia_federal_numero: string
  usuario: { nombre: string } | null
}

interface ViajeOption {
  id: string
  cliente: string
  estado: string
  fecha_programada: string
  conductor_id: string
}

interface GastoExistente {
  id: string
  viaje_id: string
  categoria: string
  monto: number
  tiene_cfdi: boolean
  foto_comprobante_url: string | null
  fecha: string
  descripcion: string | null
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
      {pending ? 'Guardando…' : 'Registrar gasto'}
    </button>
  )
}

export default function GastoFinanzasForm({
  conductores,
  viajesAbiertos,
  gastosExistentes,
  conductorInicialId,
}: {
  conductores: ConductorOption[]
  viajesAbiertos: ViajeOption[]
  gastosExistentes: GastoExistente[]
  conductorInicialId: string | null
}) {
  const [state, action] = useFormState(registrarGastoFinanzas, null)
  const [conductorId, setConductorId] = useState(conductorInicialId ?? '')
  const [viajeId, setViajeId] = useState('')
  const [categoria, setCategoria] = useState('')
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [fotoBase64,  setFotoBase64]  = useState<string | null>(null)
  const [fotoError,   setFotoError]   = useState<string | null>(null)

  const viajesDelConductor = useMemo(
    () => viajesAbiertos.filter(v => v.conductor_id === conductorId),
    [viajesAbiertos, conductorId]
  )

  const gastosDelViaje = useMemo(
    () => gastosExistentes.filter(g => g.viaje_id === viajeId),
    [gastosExistentes, viajeId]
  )

  function onConductorChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setConductorId(e.target.value)
    setViajeId('') // el viaje seleccionado ya no aplica al cambiar de conductor
  }

  async function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFotoError(null)
    try {
      const compressed = await compressImage(file)
      setFotoPreview(compressed)
      setFotoBase64(compressed)
    } catch {
      setFotoError('No se pudo procesar la foto. Intenta de nuevo.')
    }
  }

  return (
    <div className="space-y-5">
      <form action={action} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-5">
        <input type="hidden" name="viaje_id" value={viajeId} />
        <input type="hidden" name="foto_base64" value={fotoBase64 ?? ''} />

        {/* Conductor */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Conductor <span className="text-red-500">*</span>
          </label>
          <select
            value={conductorId}
            onChange={onConductorChange}
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
          {!conductores.length && (
            <p className="mt-1 text-xs text-amber-600">Sin conductores activos registrados.</p>
          )}
        </div>

        {/* Viaje */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Viaje <span className="text-red-500">*</span>
          </label>
          <select
            value={viajeId}
            onChange={e => setViajeId(e.target.value)}
            required
            disabled={!conductorId}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-50 disabled:text-gray-400"
          >
            <option value="" disabled>
              {conductorId ? 'Seleccionar viaje…' : 'Primero elige un conductor'}
            </option>
            {viajesDelConductor.map(v => (
              <option key={v.id} value={v.id}>
                {v.cliente} — {ESTADO_LABEL[v.estado] ?? v.estado} · {new Date(v.fecha_programada).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
              </option>
            ))}
          </select>
          {conductorId && !viajesDelConductor.length && (
            <p className="mt-1 text-xs text-amber-600">
              Ese conductor no tiene viajes programados o en curso ahora mismo.
            </p>
          )}
        </div>

        {/* Categoría */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Categoría <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {CATEGORIAS.map(c => (
              <label
                key={c.value}
                className="flex items-center gap-2 p-3 border border-gray-200 rounded-xl cursor-pointer has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 transition-colors"
              >
                <input
                  type="radio"
                  name="categoria"
                  value={c.value}
                  checked={categoria === c.value}
                  onChange={() => setCategoria(c.value)}
                  required
                  className="accent-blue-600"
                />
                <span className="text-sm font-medium text-gray-800">{c.label}</span>
              </label>
            ))}
          </div>

          {categoria === 'imprevisto' && (
            <div className="mt-3">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Describe en qué consistió <span className="text-red-500">*</span>
              </label>
              <textarea
                name="descripcion"
                required
                rows={2}
                placeholder="Ej. Ponchadura de llanta, propina por descarga, cuota extra de caseta…"
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
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
            <p className="text-xs text-gray-400 mt-1">
              Límite SAT referencial comida: $750/día · hospedaje requiere CFDI
            </p>
          </div>

          {/* Fecha real del gasto (la del recibo, no necesariamente hoy) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Fecha del gasto <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="fecha"
              required
              defaultValue={hoyISO()}
              max={hoyISO()}
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              La fecha del comprobante, no cuando lo capturas en la oficina.
            </p>
          </div>
        </div>

        {/* Foto del comprobante */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Foto del comprobante <span className="font-normal text-gray-400">(opcional)</span>
          </label>
          {fotoPreview ? (
            <div className="relative rounded-xl overflow-hidden border border-gray-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={fotoPreview} alt="Vista previa" className="w-full max-h-56 object-cover" />
              <button
                type="button"
                onClick={() => { setFotoPreview(null); setFotoBase64(null) }}
                className="absolute top-2 right-2 bg-white/90 backdrop-blur rounded-full w-8 h-8 flex items-center justify-center shadow text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
              <span className="text-3xl mb-1">📷</span>
              <span className="text-xs text-gray-500 font-medium">Subir foto del comprobante (WhatsApp)</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFoto}
                className="hidden"
              />
            </label>
          )}
          {fotoError && <p className="text-xs text-red-600 mt-1">{fotoError}</p>}
          {!fotoPreview && !fotoError && (
            <p className="text-xs text-gray-400 mt-1">
              Sin foto, el gasto se guarda igual pero queda marcado como &quot;sin soporte&quot;.
            </p>
          )}
        </div>

        {/* Tiene CFDI */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="tiene_cfdi"
            name="tiene_cfdi"
            value="true"
            className="w-5 h-5 rounded accent-blue-600"
          />
          <label htmlFor="tiene_cfdi" className="text-sm font-medium text-gray-700">
            El conductor tiene comprobante fiscal (CFDI)
          </label>
        </div>

        {state?.error && (
          <p className="text-sm text-red-700 bg-red-50 rounded-xl px-4 py-3">{state.error}</p>
        )}

        <SubmitButton />
      </form>

      {/* Gastos ya registrados para el viaje seleccionado, para confirmar la captura */}
      {viajeId && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <p className="px-5 py-3 text-sm font-semibold text-gray-700 border-b border-gray-100">
            Gastos ya registrados en este viaje ({gastosDelViaje.length})
          </p>
          {gastosDelViaje.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-gray-400">Aún no hay gastos para este viaje.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {gastosDelViaje.map(g => {
                const monto            = Number(g.monto)
                const limite           = LIMITE_SAT[g.categoria]
                const excede           = limite !== undefined && monto > limite
                const sinFoto          = !g.foto_comprobante_url
                const hospedajeSinCfdi = g.categoria === 'hospedaje' && !g.tiene_cfdi
                return (
                  <li key={g.id} className="px-5 py-3 flex items-center justify-between gap-3">
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
                      {g.descripcion && (
                        <p className="text-xs text-gray-600 mt-0.5 italic">{g.descripcion}</p>
                      )}
                    </div>
                    <p className="text-sm font-bold text-gray-900 shrink-0">{fmt(monto)}</p>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
