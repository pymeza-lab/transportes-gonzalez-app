'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ROL_LABELS, type RolUsuario } from '@/lib/types'

export interface NavItem {
  label: string
  href: string
}

interface Props {
  user: { nombre: string; rol: RolUsuario }
  navItems: NavItem[]
}

export default function Sidebar({ user, navItems }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-56 min-h-screen bg-white border-r border-gray-200 flex flex-col shrink-0">
      <div className="px-5 py-5 border-b border-gray-100">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">TAG</p>
        <p className="text-sm font-semibold text-gray-800 mt-0.5">Transportes González</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(item => {
          const active =
            pathname === item.href ||
            (item.href.length > 1 && pathname.startsWith(item.href + '/'))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Accesos rápidos a otras secciones para admin */}
      {user.rol === 'admin' && (
        <div className="px-3 pb-2 space-y-0.5">
          <p className="px-3 pt-1 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-widest">
            Secciones
          </p>
          {[
            { label: 'Admin',      href: '/admin' },
            { label: 'Dispatcher', href: '/dispatcher' },
            { label: 'Finanzas',   href: '/finanzas' },
          ].map(item => {
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </div>
      )}

      <div className="px-4 py-4 border-t border-gray-100">
        <p className="text-sm font-medium text-gray-900 truncate">{user.nombre}</p>
        <p className="text-xs text-gray-400 mt-0.5">{ROL_LABELS[user.rol]}</p>
        <button
          onClick={handleLogout}
          className="mt-3 w-full text-left text-sm text-gray-500 hover:text-gray-700 py-1.5 px-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
