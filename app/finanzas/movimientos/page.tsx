import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MovimientoConductorForm from './MovimientoConductorForm'

export const dynamic = 'force-dynamic'

export default async function MovimientosConductorPage({
  searchParams,
}: {
  searchParams: { conductor?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuario').select('rol').eq('auth_user_id', user.id).single()
  if (!usuario || !['finanzas', 'admin'].includes(usuario.rol)) redirect('/login')

  const { data: conductores } = await supabase
    .from('conductor')
    .select('id, licencia_federal_numero, usuario:usuario_id ( nombre )')
    .eq('estado', 'activo')
    .order('id')

  // Se traen los movimientos de todos los conductores activos (no solo el
  // seleccionado) para poder calcular el saldo de préstamo en el cliente sin
  // ida y vuelta al servidor cada vez que finanzas cambia de conductor —
  // mismo patrón que app/finanzas/gastos/page.tsx.
  const { data: movimientos } = await supabase
    .from('movimiento_conductor')
    .select('id, conductor_id, tipo, monto, fecha, notas')
    .order('fecha', { ascending: false })
    .limit(1000)

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Movimientos de conductor</h1>
        <p className="text-sm text-gray-500 mt-1">
          Pago de viajes, descuentos, bonos y préstamos — todo lo que no es un gasto de viaje ni
          un anticipo. Se usa para armar el corte semanal de cada conductor.
        </p>
      </div>

      <MovimientoConductorForm
        conductores={(conductores ?? []) as any}
        movimientosExistentes={(movimientos ?? []) as any}
        conductorInicialId={searchParams.conductor ?? null}
      />
    </div>
  )
}
