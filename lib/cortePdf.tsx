import React from 'react'
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import type { CorteData } from './corte'

const NAVY = '#1F3864'
const NOTE = '#7F6000'
const BORDER = '#BFBFBF'

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 8, fontFamily: 'Helvetica' },
  title: {
    backgroundColor: NAVY, color: '#FFFFFF', padding: 8, fontSize: 12,
    fontWeight: 'bold', marginBottom: 4,
  },
  note: { color: NOTE, fontSize: 8, fontStyle: 'italic', marginBottom: 10 },
  headerRow: { flexDirection: 'row', marginBottom: 4, gap: 24 },
  headerField: { flexDirection: 'row', gap: 4 },
  headerLabel: { fontWeight: 'bold' },
  sectionTitle: { fontWeight: 'bold', fontSize: 9, marginTop: 12, marginBottom: 4 },
  table: { borderWidth: 1, borderColor: BORDER, marginBottom: 8 },
  trHead: { flexDirection: 'row', backgroundColor: '#D9E1F2' },
  tr: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: BORDER },
  th: { padding: 3, fontWeight: 'bold', fontSize: 6.5, borderRightWidth: 1, borderRightColor: BORDER },
  td: { padding: 3, fontSize: 7, borderRightWidth: 1, borderRightColor: BORDER },
  twoCol: { flexDirection: 'row', gap: 20 },
  col: { flex: 1 },
  liqRow: {
    flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1,
    borderBottomColor: BORDER, paddingVertical: 3,
  },
  liqLabel: { fontSize: 8 },
  liqLabelBold: { fontSize: 8, fontWeight: 'bold' },
  liqValue: { fontSize: 8 },
  liqValueBold: { fontSize: 9, fontWeight: 'bold' },
  netoRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5,
    marginTop: 2, borderTopWidth: 1, borderTopColor: NAVY,
  },
  firmas: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 40 },
  firmaBox: { width: '40%', borderTopWidth: 1, borderTopColor: NAVY, paddingTop: 4, textAlign: 'center' },
})

const TRIP_COLS = [
  { key: 'fecha', label: 'Fecha cita', w: 7 },
  { key: 'remolque', label: 'Remolque', w: 7 },
  { key: 'cliente', label: 'Cliente', w: 10 },
  { key: 'origen', label: 'Origen', w: 9 },
  { key: 'destino', label: 'Destino', w: 9 },
  { key: 'documento', label: 'Documento', w: 8 },
  { key: 'kmInicial', label: 'Km inicial', w: 6 },
  { key: 'kmFinal', label: 'Km final', w: 6 },
  { key: 'diffKm', label: 'Dif. km', w: 6 },
  { key: 'litros', label: 'Litros', w: 5 },
  { key: 'rendimiento', label: 'Rend. (km/l)', w: 7 },
  { key: 'operador', label: 'Operador', w: 9 },
  { key: 'eco', label: 'ECO', w: 5 },
  { key: 'fechaCobro', label: 'Fecha cobro', w: 6 },
]

function fmtMxn(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

function fmtFecha(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function LiqLine({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.liqRow}>
      <Text style={bold ? styles.liqLabelBold : styles.liqLabel}>{label}</Text>
      <Text style={bold ? styles.liqValueBold : styles.liqValue}>{value}</Text>
    </View>
  )
}

export function CortePdfDocument({ data }: { data: CorteData }) {
  const liq = data.liquidacion

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.title}>TRANSPORTES GONZÁLEZ (TAG) — CORTE SEMANAL / LIQUIDACIÓN DE OPERADOR</Text>
        <Text style={styles.note}>Generado automáticamente por la app. Revisa antes de firmar.</Text>

        <View style={styles.headerRow}>
          <View style={styles.headerField}>
            <Text style={styles.headerLabel}>Operador:</Text>
            <Text>{data.conductor.nombre}</Text>
          </View>
          <View style={styles.headerField}>
            <Text style={styles.headerLabel}>Unidad (ECO):</Text>
            <Text>{data.conductor.unidad ?? '—'}</Text>
          </View>
          <View style={styles.headerField}>
            <Text style={styles.headerLabel}>Semana del:</Text>
            <Text>{fmtFecha(data.periodo.desde)} al {fmtFecha(data.periodo.hasta)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>VIAJES DE LA SEMANA</Text>
        <View style={styles.table}>
          <View style={styles.trHead} fixed>
            {TRIP_COLS.map(c => (
              <Text key={c.key} style={[styles.th, { width: `${c.w}%` }]}>{c.label}</Text>
            ))}
          </View>
          {data.viajes.map(v => {
            const diffKm = v.kmInicial !== null && v.kmFinal !== null ? v.kmFinal - v.kmInicial : null
            const rendimiento = diffKm !== null && v.litros ? Math.round((diffKm / v.litros) * 100) / 100 : null
            const row: Record<string, string> = {
              fecha: fmtFecha(v.fechaProgramada),
              remolque: v.remolque ?? '',
              cliente: v.cliente,
              origen: v.origen ?? '',
              destino: v.destino ?? '',
              documento: v.documento ?? '',
              kmInicial: v.kmInicial?.toString() ?? '',
              kmFinal: v.kmFinal?.toString() ?? '',
              diffKm: diffKm?.toString() ?? '',
              litros: v.litros?.toString() ?? '',
              rendimiento: rendimiento?.toString() ?? '',
              operador: data.conductor.nombre,
              eco: v.vehiculoPlacas ?? '',
              fechaCobro: fmtFecha(v.fechaCobro),
            }
            return (
              <View key={v.id} style={styles.tr}>
                {TRIP_COLS.map(c => (
                  <Text key={c.key} style={[styles.td, { width: `${c.w}%` }]}>{row[c.key]}</Text>
                ))}
              </View>
            )
          })}
          {data.viajes.length === 0 && (
            <View style={styles.tr}>
              <Text style={[styles.td, { width: '100%' }]}>Sin viajes en este periodo.</Text>
            </View>
          )}
        </View>

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>LIQUIDACIÓN DEL PERIODO</Text>
            <LiqLine label="Pago de viajes" value={fmtMxn(liq.pagoViajes)} />
            <LiqLine label="Anticipos entregados" value={fmtMxn(liq.anticipos)} />
            <LiqLine label="Gastos comprobables" value={fmtMxn(liq.gastosComprobables)} />
            <LiqLine label="Observaciones de gastos" value="" />
            <LiqLine label="Diferencia (anticipos - comprobado)" value={fmtMxn(liq.diferencia)} bold />
            <LiqLine label="Abono a préstamo (del periodo)" value={fmtMxn(liq.abonoPrestamoPeriodo)} />
            <LiqLine label="Saldo de préstamo pendiente (acumulado)" value={fmtMxn(liq.saldoPrestamo)} bold />
          </View>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>RESUMEN / NETO A PAGAR</Text>
            <LiqLine label="Anticipo" value={fmtMxn(liq.anticipos)} />
            <LiqLine label="Gastos a comprobar" value={fmtMxn(liq.gastosComprobables)} />
            <LiqLine label="Diferencia" value={fmtMxn(liq.diferencia)} />
            <LiqLine label="Salario" value={fmtMxn(liq.pagoViajes)} />
            <LiqLine label="Subtotal (salario - diferencia)" value={fmtMxn(liq.subtotal)} bold />
            <LiqLine label="Descuentos" value={fmtMxn(liq.descuentos)} />
            <LiqLine label="A pagar (subtotal - descuentos)" value={fmtMxn(liq.aPagar)} bold />
            <LiqLine label="Gastos entregado" value="" />
            <LiqLine label="Más bono" value={fmtMxn(liq.bono)} />
            <View style={styles.netoRow}>
              <Text style={styles.liqValueBold}>NETO A PAGAR</Text>
              <Text style={styles.liqValueBold}>{fmtMxn(liq.netoAPagar)}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.note}>
          &quot;Gastos entregado&quot; y &quot;Observaciones de gastos&quot; quedan en blanco: no hay un campo en la
          app para esos datos todavía.
        </Text>

        <View style={styles.firmas}>
          <Text style={styles.firmaBox}>FIRMA DEL OPERADOR</Text>
          <Text style={styles.firmaBox}>FIRMA / VO.BO. FINANZAS</Text>
        </View>
      </Page>
    </Document>
  )
}

export async function generarCortePdf(data: CorteData): Promise<Buffer> {
  return renderToBuffer(<CortePdfDocument data={data} />)
}
