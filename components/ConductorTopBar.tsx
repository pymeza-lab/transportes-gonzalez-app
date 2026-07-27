'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { countPendientes } from '@/lib/offlineQueue'
import { useEffect, useState } from 'react'

interface Props {
  nombre: string
}

export default function ConductorTopBar({ nombre }: Props) {
  const router   = useRouter()
  const supabase = createClient()
  const isOnline = useOnlineStatus()
  const [pendientes, setPendientes] = useState(0)

  useEffect(() => {
    setPendientes(countPendientes())
  }, [isOnline]) // Re-check when connectivity changes

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-10 bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">TAG</p>
          <p className="text-sm font-semibold text-gray-900 mt-0.5">{nombre}</p>
        </div>
        {!isOnline && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
            Sin señal
          </span>
        )}
        {isOnline && pendientes > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
            Enviando {pendientes}…
          </span>
        )}
      </div>
      <button
        onClick={handleLogout}
        className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
      >
        Salir
      </button>
    </header>
  )
}
