'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { addPendiente, type TipoEvidencia } from '@/lib/offlineQueue'
import { compressImage } from '@/lib/compressImage'
import { guardarEvidencia } from '@/app/conductor/actions'
import SignaturePad from '@/components/SignaturePad'

interface Props {
  viajeId: string
  tipo: TipoEvidencia
  cliente: string
}

export default function EvidenciaForm({ viajeId, tipo, cliente }: Props) {
  const router   = useRouter()
  const isOnline = useOnlineStatus()

  const [fotoPreview,  setFotoPreview]  = useState<string | null>(null)
  const [fotoBase64,   setFotoBase64]   = useState<string | null>(null)
  const [firmaBase64,  setFirmaBase64]  = useState<string | null>(null)
  const [receptor,     setReceptor]     = useState('')
  const [notas,        setNotas]        = useState('')
  const [submitting,   setSubmitting]   = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [done,         setDone]         = useState(false)
  const [savedOffline, setSavedOffline] = useState(false)

  async function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    try {
      const compressed = await compressImage(file)
      setFotoPreview(compressed)
      setFotoBase64(compressed)
    } catch {
      setError('No se pudo procesar la foto. Intenta de nuevo.')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const payload = {
      id:             crypto.randomUUID(),
      viajeId,
      tipo,
      nombreReceptor: receptor,
      notas,
      fotoBase64,
      firmaBase64,
      timestamp:      new Date().toISOString(),
    }

    if (isOnline) {
      const { id: _id, ...rest } = payload
      const result = await guardarEvidencia(rest)
      if (result?.error) {
        setError(result.error)
        setSubmitting(false)
        return
      }
    } else {
      try {
        addPendiente(payload)
        setSavedOffline(true)
      } catch {
        setError('Sin espacio en el dispositivo. Libera almacenamiento e intenta de nuevo.')
        setSubmitting(false)
        return
      }
    }

    setDone(true)
    setSubmitting(false)
    setTimeout(() => router.push(`/conductor/viaje/${viajeId}`), 1800)
  }

  // ── Pantalla de éxito ────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center bg-green-100">
          <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-xl font-bold text-gray-900">
          {savedOffline ? 'Guardado en el dispositivo' : 'Evidencia enviada'}
        </p>
        {savedOffline && (
          <p className="text-sm text-amber-700 bg-amber-50 px-4 py-2 rounded-xl">
            Se enviará al servidor cuando recuperes señal
          </p>
        )}
        <p className="text-sm text-gray-400">Regresando al viaje…</p>
      </div>
    )
  }

  // ── Formulario ───────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-7">

      {/* Foto */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Foto del comprobante
        </label>
        {fotoPreview ? (
          <div className="relative rounded-xl overflow-hidden border border-gray-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fotoPreview} alt="Vista previa" className="w-full max-h-72 object-cover" />
            <button
              type="button"
              onClick={() => { setFotoPreview(null); setFotoBase64(null) }}
              className="absolute top-2 right-2 bg-white/90 backdrop-blur rounded-full w-8 h-8 flex items-center justify-center shadow text-gray-600 text-sm"
            >
              ✕
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-44 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 active:bg-gray-100 transition-colors">
            <span className="text-4xl mb-2">📷</span>
            <span className="text-sm text-gray-500 font-medium">Toca para tomar foto</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFoto}
              className="hidden"
            />
          </label>
        )}
      </div>

      {/* Firma */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Firma del receptor
        </label>
        <SignaturePad onChange={setFirmaBase64} />
      </div>

      {/* Receptor */}
      <div>
        <label htmlFor="receptor" className="block text-sm font-semibold text-gray-700 mb-2">
          Nombre del receptor
        </label>
        <input
          id="receptor"
          type="text"
          value={receptor}
          onChange={e => setReceptor(e.target.value)}
          placeholder="Nombre completo"
          className="w-full px-4 py-3.5 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoComplete="off"
        />
      </div>

      {/* Notas */}
      <div>
        <label htmlFor="notas" className="block text-sm font-semibold text-gray-700 mb-2">
          Notas <span className="font-normal text-gray-400">(opcional)</span>
        </label>
        <textarea
          id="notas"
          value={notas}
          onChange={e => setNotas(e.target.value)}
          placeholder="Observaciones, incidencias, etc."
          rows={3}
          className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* Banner offline */}
      {!isOnline && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
          <p className="text-sm font-semibold text-amber-800">📵 Sin conexión</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Se guardará en tu celular y se enviará automáticamente cuando recuperes señal.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Botón principal */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full py-5 bg-blue-600 text-white text-lg font-bold rounded-2xl shadow-md hover:bg-blue-700 disabled:opacity-50 active:scale-95 transition-all"
      >
        {submitting
          ? 'Guardando…'
          : isOnline
            ? `Enviar ${tipo === 'recoleccion' ? 'recolección' : 'entrega'}`
            : 'Guardar sin conexión'}
      </button>
    </form>
  )
}
