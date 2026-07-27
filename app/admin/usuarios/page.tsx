import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NuevoUsuarioForm from './NuevoUsuarioForm'
import { ROL_LABELS, type Usuario } from '@/lib/types'

// Segunda capa de defensa: verificar el rol directamente en la página,
// independientemente del layout, para proteger contra cache de router client-side.
export const dynamic = 'force-dynamic'

const ROL_BADGE: Record<string, string> = {
  admin:      'bg-purple-100 text-purple-700',
  dispatcher: 'bg-blue-100 text-blue-700',
  finanzas:   'bg-green-100 text-green-700',
  conductor:  'bg-gray-100 text-gray-700',
}

export default async function UsuariosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: caller } = await supabase
    .from('usuario')
    .select('rol')
    .eq('auth_user_id', user.id)
    .single()

  // Check explícito de rol a nivel de página — no depender solo del layout
  if (!caller || caller.rol !== 'admin') redirect('/login')

  const { data: usuarios } = await supabase
    .from('usuario')
    .select('*')
    .eq('activo', true)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Usuarios</h1>
        <p className="text-sm text-gray-500 mt-1">Cuentas activas del sistema</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">
            Usuarios activos ({usuarios?.length ?? 0})
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Alta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(usuarios as Usuario[])?.map(u => (
              <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-3 font-medium text-gray-900">{u.nombre}</td>
                <td className="px-6 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${ROL_BADGE[u.rol] ?? 'bg-gray-100 text-gray-700'}`}>
                    {ROL_LABELS[u.rol] ?? u.rol}
                  </span>
                </td>
                <td className="px-6 py-3 text-gray-500">
                  {new Date(u.created_at).toLocaleDateString('es-MX', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  })}
                </td>
              </tr>
            ))}
            {!usuarios?.length && (
              <tr>
                <td colSpan={3} className="px-6 py-10 text-center text-gray-400 text-sm">
                  Sin usuarios registrados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-5">Nuevo usuario</h2>
        <NuevoUsuarioForm />
      </div>
    </div>
  )
}
