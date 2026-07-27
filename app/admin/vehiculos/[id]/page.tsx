import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NuevoDocumentoForm from './NuevoDocumentoForm'
import { actualizarEstado, marcarAtendida } from '../actions'
import type { Vehiculo, DocumentoVehiculo, Alerta, EstadoVehiculo } from '@/lib/types'
import { ESTADO_VEHICULO_LABELS, TIPO_DOCUMENTO_LABELS } from '@/lib/types'

export const dynamic = 'force-dynamic'

const ESTADO_BADGE: Record<EstadoVehiculo, string> = {
  disponible:     'bg-green-100 text-green-700',
  en_ruta:        'bg-blue-100 text-blue-700',
  mantenimiento:  'bg-amber-100 text-amber-700',
  fuera_servicio: 'bg-red-100 text-red-700',
}

const ESTADOS_OPCIONES: EstadoVehiculo[] = [
  'disponible', 'en_ruta', 'mantenimiento', 'fuera_servicio',
]

function badgeVencimiento(fecha: string) {
  const hoy = isoHoy()
  const limite = isoLimite(30)
  if (fecha < hoy)      return 'bg-red-100 text-red-700'
  if (fecha <= limite)  return 'bg-amber-100 text-amber-700'
  return 'bg-green-100 text-green-700'
}

function labelVencimiento(fecha: string) {
  const hoy = isoHoy()
  const limite = isoLimite(30)
  if (fecha < hoy)      return 'Vencido'
  if (fecha <= limite)  return 'Por vencer'
  return 'Vigente'
}

function isoHoy(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isoLimite(dias: number): string {
  const d = new Date()
  d.setDate(d.getDate() + dias)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmtFecha(iso: string): string {
  const [y, m, d] = iso.split('-')
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${d} ${meses[parseInt(m, 10) - 1]} ${y}`
}

export default async function VehiculoDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: caller } = await supabase
    .from('usuario').select('rol').eq('auth_user_id', user.id).single()
  if (!caller || !['admin', 'dispatcher'].includes(caller.rol)) redirect('/login')

  const [
    { data: vehiculo },
    { data: documentos },
    { data: alertas },
  ] = await Promise.all([
    supabase.from('vehiculo').select('*').eq('id', params.id).single(),
    supabase
      .from('documento_vehiculo')
      .select('*')
      .eq('vehiculo_id', params.id)
      .order('tipo')
      .order('fecha_vencimiento', { ascending: false }),
    supabase
      .from('alerta')
      .select('*')
      .eq('entidad_referencia', params.id)
      .eq('tipo', 'documento_por_vencer')
      .eq('atendida', false)
      .order('fecha_generada', { ascending: false }),
  ])

  if (!vehiculo) notFound()

  const v = vehiculo as Vehiculo

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <Link href="/admin/vehiculos" className="text-gray-400 hover:text-gray-600 text-sm">
          ← Vehículos
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-semibold text-gray-900">{v.placas}</h1>
        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${ESTADO_BADGE[v.estado]}`}>
          {ESTADO_VEHICULO_LABELS[v.estado]}
        </span>
      </div>

      {/* Info + cambio de estado */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Datos del vehículo</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Configuración</p>
            <p className="text-sm font-medium text-gray-900">{v.configuracion_vehicular}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Tipo de caja</p>
            <p className="text-sm font-medium text-gray-900">{v.tipo_caja ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Año</p>
            <p className="text-sm font-medium text-gray-900">{v.anio ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Capacidad</p>
            <p className="text-sm font-medium text-gray-900">
              {v.capacidad_peso_kg ? `${v.capacidad_peso_kg.toLocaleString('es-MX')} kg` : '—'}
            </p>
          </div>
        </div>

        <form action={actualizarEstado} className="flex items-center gap-3">
          <input type="hidden" name="vehiculo_id" value={v.id} />
          <label className="text-sm text-gray-700 font-medium">Estado:</label>
          <select
            name="estado"
            defaultValue={v.estado}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {ESTADOS_OPCIONES.map(e => (
              <option key={e} value={e}>{ESTADO_VEHICULO_LABELS[e]}</option>
            ))}
          </select>
          <button
            type="submit"
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition-colors"
          >
            Actualizar
          </button>
        </form>
      </div>

      {/* Alertas activas */}
      {(alertas as Alerta[])?.length > 0 && (
        <div className="bg-red-50 rounded-xl border border-red-200 overflow-hidden">
          <div className="px-6 py-3 border-b border-red-200">
            <h2 className="text-sm font-semibold text-red-700">
              ⚠ Alertas activas ({alertas?.length})
            </h2>
          </div>
          <ul className="divide-y divide-red-100">
            {(alertas as Alerta[])?.map(alerta => (
              <li key={alerta.id} className="px-6 py-3 flex items-center justify-between gap-4">
                <p className="text-sm text-red-800">{alerta.descripcion}</p>
                <form action={marcarAtendida} className="shrink-0">
                  <input type="hidden" name="alerta_id"   value={alerta.id} />
                  <input type="hidden" name="vehiculo_id" value={v.id} />
                  <button
                    type="submit"
                    className="text-xs px-3 py-1 bg-white border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Marcar atendida
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Documentos */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">
            Documentos ({documentos?.length ?? 0})
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">No. documento</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Vence</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(documentos as DocumentoVehiculo[])?.map(doc => (
              <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-3 font-medium text-gray-900">
                  {TIPO_DOCUMENTO_LABELS[doc.tipo] ?? doc.tipo}
                </td>
                <td className="px-6 py-3 text-gray-500">{doc.numero_documento ?? '—'}</td>
                <td className="px-6 py-3 text-gray-700">{fmtFecha(doc.fecha_vencimiento)}</td>
                <td className="px-6 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${badgeVencimiento(doc.fecha_vencimiento)}`}>
                    {labelVencimiento(doc.fecha_vencimiento)}
                  </span>
                </td>
              </tr>
            ))}
            {!documentos?.length && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-400 text-sm">
                  Sin documentos registrados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Agregar documento */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-5">Agregar documento</h2>
        <NuevoDocumentoForm vehiculoId={v.id} />
      </div>
    </div>
  )
}
