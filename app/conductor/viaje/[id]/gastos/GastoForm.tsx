'use client'

import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { registrarGasto } from './actions'
import { compressImage } from '@/lib/compressImage'

const CATEGORIAS = [
  { value: 'combustible', label: 'Combustible' },
  { value: 'caseta',      label: 'Caseta' },
  { value: 'comida',      label: 'Comida' },
  { value: 'hospedaje',   label: 'Hospedaje' },
  { value: 'imprevisto',  label: 'Imprevisto' },
] as const

// Límites SAT: solo para indicación visual, nunca bloquean.
const LIMITE_SAT: Partial<Record<string, number>> = {
  comida: 750,
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full py-4 bg-blue-600 text-white text-base font-bold rounded-2xl shadow active:scale-95 transition-all disabled:opacity-50"
    >
      {pending ? 'Guardando…' : 'Registrar gasto'}
    </button>
  )
}

export default function GastoForm({ viajeId }: { viajeId: string }) {
  const [state, action] = useFormState(registrarGasto, null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [fotoBase64,  setFotoBase64]  = useState<string | null>(null)
  const [fotoError,   setFotoError]   = useState<string | null>(null)

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
    <form action={action} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-5">
      <input type="hidden" name="viaje_id" value={viajeId} />
      <input type="hidden" name="foto_base64" value={fotoBase64 ?? ''} />

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
                required
                className="accent-blue-600"
              />
              <span className="text-sm font-medium text-gray-800">{c.label}</span>
            </label>
          ))}
        </div>
      </div>

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
            className="w-full pl-8 pr-4 py-3.5 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Límite SAT referencial comida: $750/día · hospedaje requiere CFDI
        </p>
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
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 active:bg-gray-100 transition-colors">
            <span className="text-3xl mb-1">📷</span>
            <span className="text-xs text-gray-500 font-medium">Toca para tomar foto</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
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
          Tengo comprobante fiscal (CFDI)
        </label>
      </div>

      {state?.error && (
        <p className="text-sm text-red-700 bg-red-50 rounded-xl px-4 py-3">{state.error}</p>
      )}

      <SubmitButton />
    </form>
  )
}
