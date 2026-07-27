'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const LIMITE_HORAS_NOM087 = 10

async function getConductorId(supabase: ReturnType<typeof createClient>): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: usuario } = await supabase
    .from('usuario')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()
  if (!usuario) return null

  const { data: conductor } = await supabase
    .from('conductor')
    .select('id')
    .eq('usuario_id', usuario.id)
    .single()
  return conductor?.id ?? null
}

export async function iniciarTramo(
  _prev: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const supabase     = createClient()
  const conductorId  = await getConductorId(supabase)
  if (!conductorId) return { error: 'Sin sesión o perfil de conductor.' }

  const viajeId = formData.get('viaje_id') as string

  // Verificar que no haya un tramo abierto para este conductor
  const { data: abierto } = await supabase
    .from('bitacora_horas')
    .select('id')
    .eq('conductor_id', conductorId)
    .is('hora_fin_conduccion', null)
    .maybeSingle()

  if (abierto) return { error: 'Ya hay un tramo en curso. Termínalo antes de iniciar otro.' }

  const ahora = new Date()
  const fechaLocal = ahora.toISOString().slice(0, 10) // YYYY-MM-DD

  const { error } = await supabase.from('bitacora_horas').insert({
    conductor_id:          conductorId,
    viaje_id:              viajeId || null,
    fecha:                 fechaLocal,
    hora_inicio_conduccion: ahora.toISOString(),
  })

  if (error) return { error: error.message }

  revalidatePath(`/conductor/viaje/${viajeId}/bitacora`)
  return null
}

export async function terminarTramo(
  _prev: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const supabase    = createClient()
  const conductorId = await getConductorId(supabase)
  if (!conductorId) return { error: 'Sin sesión o perfil de conductor.' }

  const viajeId      = formData.get('viaje_id') as string
  const minutosStr   = formData.get('minutos_pausa') as string
  const minutosPausa = parseInt(minutosStr ?? '0', 10) || 0

  // Encontrar tramo abierto
  const { data: tramo } = await supabase
    .from('bitacora_horas')
    .select('id, hora_inicio_conduccion')
    .eq('conductor_id', conductorId)
    .is('hora_fin_conduccion', null)
    .maybeSingle()

  if (!tramo) return { error: 'No hay un tramo en curso.' }

  const ahora    = new Date()
  const inicio   = new Date(tramo.hora_inicio_conduccion)
  const durMs    = ahora.getTime() - inicio.getTime() - minutosPausa * 60_000
  const durHoras = Math.max(0, durMs / 3_600_000)

  // Calcular horas acumuladas en las últimas 24h (tramos ya cerrados)
  const hace24h = new Date(ahora.getTime() - 24 * 3_600_000).toISOString()
  const { data: tramosRecientes } = await supabase
    .from('bitacora_horas')
    .select('hora_inicio_conduccion, hora_fin_conduccion, minutos_pausa')
    .eq('conductor_id', conductorId)
    .gte('hora_inicio_conduccion', hace24h)
    .not('id', 'eq', tramo.id)            // excluir el tramo actual
    .not('hora_fin_conduccion', 'is', null)

  const horasAnteriores = (tramosRecientes ?? []).reduce((acc, t) => {
    const ini  = new Date(t.hora_inicio_conduccion).getTime()
    const fin  = new Date(t.hora_fin_conduccion!).getTime()
    const pausa = (t.minutos_pausa ?? 0) * 60_000
    return acc + Math.max(0, (fin - ini - pausa) / 3_600_000)
  }, 0)

  const horasAcumuladas = horasAnteriores + durHoras

  const admin = createAdminClient()

  const { error } = await admin.from('bitacora_horas').update({
    hora_fin_conduccion:           ahora.toISOString(),
    minutos_pausa:                 minutosPausa,
    horas_conducidas_24h_acumuladas: parseFloat(horasAcumuladas.toFixed(2)),
  }).eq('id', tramo.id)

  if (error) return { error: error.message }

  // Alerta NOM-087 si supera el límite
  if (horasAcumuladas >= LIMITE_HORAS_NOM087) {
    await admin.from('alerta').insert({
      tipo:               'limite_horas_conductor',
      entidad_referencia: conductorId,
      descripcion:        `Conductor acumuló ${horasAcumuladas.toFixed(1)}h de conducción en 24h (límite NOM-087: ${LIMITE_HORAS_NOM087}h)`,
    })
  }

  revalidatePath(`/conductor/viaje/${viajeId}/bitacora`)
  return null
}
