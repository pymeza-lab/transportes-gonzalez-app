export type TipoEvidencia = 'recoleccion' | 'entrega'

export interface PendingEvidencia {
  id: string           // UUID local para deduplicar
  viajeId: string
  tipo: TipoEvidencia
  nombreReceptor: string
  notas: string
  fotoBase64: string | null
  firmaBase64: string | null
  timestamp: string
}

const KEY = 'tag_evidencias_pendientes'

export function getPendientes(): PendingEvidencia[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as PendingEvidencia[]
  } catch {
    return []
  }
}

export function addPendiente(item: PendingEvidencia): void {
  const current = getPendientes()
  // Si ya hay un pendiente para el mismo viaje+tipo, reemplázalo
  const sin_dup = current.filter(p => !(p.viajeId === item.viajeId && p.tipo === item.tipo))
  localStorage.setItem(KEY, JSON.stringify([...sin_dup, item]))
}

export function removePendiente(id: string): void {
  const current = getPendientes()
  localStorage.setItem(KEY, JSON.stringify(current.filter(p => p.id !== id)))
}

export function countPendientes(): number {
  return getPendientes().length
}
