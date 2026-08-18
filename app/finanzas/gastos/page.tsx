import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import GastoFinanzasForm from './GastoFinanzasForm'

export const dynamic = 'force-dynamic'

export default async function CapturaGastosFinanzas({
  searchParams,
}: {
  searchParams: { conductor?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Conductores activos (para el primer selector: "¿de quién es el gasto?").
  const { data: conductores } = await supabase
    .from('conductor')
    .select('id, licencia_federal_numero, usuario:usuario_id ( nombre )')
    .eq('estado', 'activo')
    .order('id')

  // Viajes todavía abiertos (programado o en_curso): solo esos admiten gastos
  // nuevos. Se traen todos de una vez (la flota es de ~40 unidades) y el
  // selector de conductor filtra en el cliente, igual que el patrón de
  // app/dispatcher/viajes/NuevoViajeForm.tsx.
  const { data: viajesAbiertos } = await supabase
    .from('viaje')
    .select('id, cliente, estado, fecha_programada, conductor_id')
    .in('estado', ['programado', 'en_curso'])
    .order('fecha_programada', { ascending: false })

  const viajeIds = (viajesAbiertos ?? []).map(v => v.id)

  const { data: gastosExistentes } = viajeIds.length
    ? await supabase
        .from('gasto_viaje')
        .select('id, viaje_id, categoria, monto, tiene_cfdi, foto_comprobante_url, fecha, descripcion')
        .in('viaje_id', viajeIds)
        .order('fecha', { ascending: false })
    : { data: [] }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Registrar gasto de viaje</h1>
        <p className="text-sm text-gray-500 mt-1">
          Para capturar gastos con base en fotos de comprobante que el conductor envía por
          WhatsApp. Elige al conductor y el viaje al que corresponde el gasto.
        </p>
      </div>

      <GastoFinanzasForm
        conductores={(conductores ?? []) as any}
        viajesAbiertos={(viajesAbiertos ?? []) as any}
        gastosExistentes={(gastosExistentes ?? []) as any}
        conductorInicialId={searchParams.conductor ?? null}
      />
    </div>
  )
}
