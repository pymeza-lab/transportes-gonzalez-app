export type RolUsuario = 'admin' | 'dispatcher' | 'conductor' | 'finanzas'

export interface Usuario {
  id: string
  auth_user_id: string | null
  nombre: string
  rol: RolUsuario
  telefono: string | null
  activo: boolean
  created_at: string
}

export const ROL_LABELS: Record<RolUsuario, string> = {
  admin: 'Administrador',
  dispatcher: 'Dispatcher',
  finanzas: 'Finanzas',
  conductor: 'Conductor',
}

// ── Vehículos ──────────────────────────────────────────────────────────────
export type EstadoVehiculo = 'disponible' | 'en_ruta' | 'mantenimiento' | 'fuera_servicio'
export type TipoDocumento  = 'permiso_sict' | 'seguro' | 'verificacion' | 'tenencia'
export type TipoAlerta     = 'documento_por_vencer' | 'desviacion_gasto' | 'limite_horas_conductor'

export interface Vehiculo {
  id: string
  placas: string
  configuracion_vehicular: string
  tipo_caja: string | null
  capacidad_peso_kg: number | null
  anio: number | null
  estado: EstadoVehiculo
  created_at: string
}

export interface DocumentoVehiculo {
  id: string
  vehiculo_id: string
  tipo: TipoDocumento
  numero_documento: string | null
  fecha_vencimiento: string
  archivo_url: string | null
  created_at: string
}

export interface Alerta {
  id: string
  tipo: TipoAlerta
  entidad_referencia: string | null
  descripcion: string | null
  fecha_generada: string
  atendida: boolean
}

export const ESTADO_VEHICULO_LABELS: Record<EstadoVehiculo, string> = {
  disponible:     'Disponible',
  en_ruta:        'En ruta',
  mantenimiento:  'Mantenimiento',
  fuera_servicio: 'Fuera de servicio',
}

export const TIPO_DOCUMENTO_LABELS: Record<TipoDocumento, string> = {
  permiso_sict: 'Permiso SICT',
  seguro:       'Seguro',
  verificacion: 'Verificación',
  tenencia:     'Tenencia',
}
