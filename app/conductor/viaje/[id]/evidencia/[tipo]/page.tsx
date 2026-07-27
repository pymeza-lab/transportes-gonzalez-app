import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EvidenciaForm from './EvidenciaForm'
import type { TipoEvidencia } from '@/lib/offlineQueue'

export const dynamic = 'force-dynamic'

const TIPO_LABEL: Record<TipoEvidencia, string> = {
  recoleccion: 'Recolección',
  entrega:     'Entrega',
}

export default async function EvidenciaPage({
  params,
}: {
  params: { id: string; tipo: string }
}) {
  if (params.tipo !== 'recoleccion' && params.tipo !== 'entrega') notFound()

  const tipo = params.tipo as TipoEvidencia

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: viaje } = await supabase
    .from('viaje')
    .select('id, cliente, estado')
    .eq('id', params.id)
    .single()

  if (!viaje) notFound()

  // Validar que la evidencia de este tipo no haya sido capturada ya
  const { data: existente } = await supabase
    .from('evidencia_viaje')
    .select('id')
    .eq('viaje_id', params.id)
    .eq('tipo', tipo)
    .maybeSingle()

  if (existente) {
    // Ya capturada — redirigir al detalle del viaje
    redirect(`/conductor/viaje/${params.id}`)
  }

  // Validar que el estado permita este tipo de evidencia
  if (tipo === 'recoleccion' && viaje.estado !== 'programado') {
    redirect(`/conductor/viaje/${params.id}`)
  }
  if (tipo === 'entrega' && viaje.estado !== 'en_curso') {
    redirect(`/conductor/viaje/${params.id}`)
  }

  return (
    <div className="max-w-lg mx-auto pt-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Link href={`/conductor/viaje/${params.id}`} className="text-gray-400 hover:text-gray-600 text-sm">
          ← Viaje
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-base font-semibold text-gray-900">
          Capturar {TIPO_LABEL[tipo].toLowerCase()}
        </h1>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-6">
        <p className="text-sm text-blue-800 font-medium">{viaje.cliente}</p>
        <p className="text-xs text-blue-600 mt-0.5">{TIPO_LABEL[tipo]}</p>
      </div>

      <EvidenciaForm
        viajeId={viaje.id}
        tipo={tipo}
        cliente={viaje.cliente}
      />
    </div>
  )
}
