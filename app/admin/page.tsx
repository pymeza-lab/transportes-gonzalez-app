import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function StatCard({
  label, value, sub, href, color = 'gray',
}: {
  label: string; value: string | number; sub?: string; href?: string; color?: string
}) {
  const colors: Record<string, string> = {
    gray:  'bg-white border-gray-200',
    blue:  'bg-blue-50 border-blue-200',
    amber: 'bg-amber-50 border-amber-200',
    red:   'bg-red-50 border-red-200',
    green: 'bg-green-50 border-green-200',
  }
  const inner = (
    <div className={`rounded-xl border p-5 ${colors[color] ?? colors.gray} ${href ? 'hover:shadow-sm transition-shadow' : ''}`}>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

export default async function AdminDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuario').select('nombre, rol').eq('auth_user_id', user.id).single()
  if (!usuario || usuario.rol !== 'admin') redirect('/login')

  const [
    { count: totalVehiculos },
    { count: vehiculosActivos },
    { count: alertasVigentes },
    { count: totalUsuarios },
    { count: viajesActivos },
    { count: conciliacionesPendientes },
  ] = await Promise.all([
    supabase.from('vehiculo').select('*', { count: 'exact', head: true }),
    // "Activo" = sigue en la flota operativa (disponible / en_ruta / mantenimiento).
    // El enum estado_vehiculo no tiene el valor 'activo' — solo fuera_servicio se excluye.
    supabase.from('vehiculo').select('*', { count: 'exact', head: true }).neq('estado', 'fuera_servicio'),
    supabase.from('alerta').select('*', { count: 'exact', head: true }).eq('atendida', false),
    supabase.from('usuario').select('*', { count: 'exact', head: true }),
    supabase.from('viaje').select('*', { count: 'exact', head: true }).in('estado', ['programado', 'en_curso']),
    supabase.from('conciliacion_viaje').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente_revision'),
  ])

  const { data: alertasRecientes } = await supabase
    .from('alerta')
    .select('id, tipo, descripcion, fecha_generada')
    .eq('atendida', false)
    .order('fecha_generada', { ascending: false })
    .limit(5)

  const TIPO_BADGE: Record<string, string> = {
    documento_por_vencer:   'bg-amber-100 text-amber-700',
    desviacion_gasto:       'bg-red-100 text-red-700',
    limite_horas_conductor: 'bg-orange-100 text-orange-700',
  }
  const TIPO_LABEL: Record<string, string> = {
    documento_por_vencer:   'Documento',
    desviacion_gasto:       'Gasto',
    limite_horas_conductor: 'NOM-087',
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Bienvenido, {usuario.nombre}</h1>
        <p className="text-sm text-gray-500 mt-1">Transportes González — Panel de administración</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard label="Vehículos activos"   value={vehiculosActivos ?? 0}        sub={`de ${totalVehiculos ?? 0} total`} href="/admin/vehiculos"   color="blue" />
        <StatCard label="Viajes en operación" value={viajesActivos ?? 0}            sub="programados + en curso"            href="/dispatcher/viajes" color="green" />
        <StatCard label="Alertas pendientes"  value={alertasVigentes ?? 0}          sub="documentos y gastos"               color={(alertasVigentes ?? 0) > 0 ? 'red' : 'gray'} />
        <StatCard label="Usuarios"            value={totalUsuarios ?? 0}            sub="todos los roles"                   href="/admin/usuarios" />
        <StatCard label="Conciliaciones"      value={conciliacionesPendientes ?? 0} sub="pendientes de revisión"            href="/finanzas/viajes"   color={(conciliacionesPendientes ?? 0) > 0 ? 'amber' : 'gray'} />
      </div>

      {/* Alertas sin atender */}
      {(alertasRecientes ?? []).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Alertas sin atender</h2>
            <Link href="/admin/vehiculos" className="text-xs text-blue-600 hover:underline">Ver vehículos →</Link>
          </div>
          <ul className="divide-y divide-gray-100">
            {(alertasRecientes ?? []).map((a: any) => (
              <li key={a.id} className="px-5 py-4 flex items-start gap-3">
                <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${TIPO_BADGE[a.tipo] ?? 'bg-gray-100 text-gray-600'}`}>
                  {TIPO_LABEL[a.tipo] ?? a.tipo}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate">{a.descripcion ?? '—'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(a.fecha_generada).toLocaleString('es-MX', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Accesos rápidos */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Accesos rápidos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Agregar usuario',  href: '/admin/usuarios',    icon: '👤' },
            { label: 'Agregar vehículo', href: '/admin/vehiculos',   icon: '🚛' },
            { label: 'Crear viaje',      href: '/dispatcher/viajes', icon: '📋' },
            { label: 'Ver finanzas',     href: '/finanzas/viajes',   icon: '💰' },
          ].map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all text-center"
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="text-xs font-medium text-gray-700">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
