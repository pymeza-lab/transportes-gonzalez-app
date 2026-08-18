'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const TIPOS_VALIDOS = ['pago_viajes', 'descuento', 'bono', 'prestamo_otorgado', 'abono_prestamo']

// Movimientos de nómina/caja con el conductor que NO son gasto de viaje ni
// anticipo (esos ya existen en gasto_viaje / viaje.anticipo_monto): pago de
// viajes (salario), descuentos, bonos, préstamos otorgados y sus abonos.
// Un registro por movimiento — nunca se guarda un saldo ya calculado, el
// corte semanal lo suma por tipo (igual que hacía el Excel de caja chica).
export async function registrarMovimientoConductor(
  _prev: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sin sesión.' }

  const { data: usuario } = await supabase
    .from('usuario')
    .select('id, rol')
    .eq('auth_user_id', user.id)
    .single()

  if (!usuario || !['finanzas', 'admin'].includes(usuario.rol)) {
    return { error: 'Sin permisos.' }
  }

  const conductorId = formData.get('conductor_id') as string
  const tipo         = formData.get('tipo') as string
  const monto        = parseFloat(formData.get('monto') as string)
  const fechaStr      = (formData.get('fecha') as string)?.trim() || null
  const notas         = (formData.get('notas') as string)?.trim() || null

  if (!conductorId || !tipo || !TIPOS_VALIDOS.includes(tipo)) {
    return { error: 'Conductor y tipo de movimiento son requeridos.' }
  }
  if (isNaN(monto) || monto < 0) {
    return { error: 'El monto debe ser un número mayor o igual a cero.' }
  }

  const { error } = await supabase.from('movimiento_conductor').insert({
    conductor_id:   conductorId,
    tipo,
    monto,
    notas,
    capturado_por:  usuario.id,
    ...(fechaStr ? { fecha: new Date(fechaStr).toISOString() } : {}),
  })

  if (error) return { error: error.message }

  revalidatePath('/finanzas/movimientos')
  revalidatePath('/finanzas/conductores')
  revalidatePath(`/finanzas/conductores/${conductorId}`)
  revalidatePath('/finanzas/corte')

  return null
}
