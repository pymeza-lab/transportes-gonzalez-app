'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { getPendientes, removePendiente } from '@/lib/offlineQueue'
import { guardarEvidencia } from '@/app/conductor/actions'

export default function SyncPendientes() {
  const isOnline = useOnlineStatus()
  const router   = useRouter()

  useEffect(() => {
    if (!isOnline) return
    const pendientes = getPendientes()
    if (!pendientes.length) return

    async function sync() {
      for (const item of pendientes) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, ...payload } = item
        const result = await guardarEvidencia(payload)
        if (!result?.error) {
          removePendiente(id)
        }
      }
      router.refresh()
    }

    sync()
  }, [isOnline]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
