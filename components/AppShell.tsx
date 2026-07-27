import Sidebar, { type NavItem } from './Sidebar'
import type { RolUsuario } from '@/lib/types'

interface Props {
  user: { nombre: string; rol: RolUsuario }
  navItems: NavItem[]
  children: React.ReactNode
}

export default function AppShell({ user, navItems, children }: Props) {
  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} navItems={navItems} />
      <main className="flex-1 p-8 overflow-auto bg-gray-50 min-h-screen">
        {children}
      </main>
    </div>
  )
}
