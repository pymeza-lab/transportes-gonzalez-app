import ExcelJS from 'exceljs'
import type { CorteData } from './corte'

const NAVY = 'FF1F3864'
const HEADER_FILL = 'FFD9E1F2'
const NOTE_COLOR = 'FF7F6000'
const CUR = '$#,##0.00;[RED]-$#,##0.00;"-"'
const DATEFMT = 'dd/mm/yyyy'
const THIN: ExcelJS.Border = { style: 'thin', color: { argb: 'FFBFBFBF' } }
const BORDER: Partial<ExcelJS.Borders> = { top: THIN, left: THIN, right: THIN, bottom: THIN }

/**
 * Genera el Excel del corte semanal ya lleno con los datos del conductor,
 * usando el mismo layout que la plantilla en blanco ya entregada (misma
 * tabla de viajes + liquidación + resumen), pero con valores en vez de
 * celdas vacías. Las fórmulas de Diferencia/Subtotal/A pagar/Neto siguen
 * siendo fórmulas de Excel (no números fijos), para que si finanzas corrige
 * algo a mano, los totales se recalculen solos.
 */
export async function generarCorteXlsx(data: CorteData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Corte Semanal', {
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 1 },
    views: [{ showGridLines: false }],
  })

  const widths = [11, 11, 14, 14, 14, 12, 10, 10, 10, 8, 11, 14, 7, 12]
  widths.forEach((w, i) => (ws.getColumn(i + 1).width = w))

  // Título
  ws.mergeCells('A1:N1')
  const title = ws.getCell('A1')
  title.value = 'TRANSPORTES GONZÁLEZ (TAG) — CORTE SEMANAL / LIQUIDACIÓN DE OPERADOR'
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }
  title.font = { name: 'Arial', color: { argb: 'FFFFFFFF' }, bold: true, size: 13 }
  title.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  ws.getRow(1).height = 26

  ws.mergeCells('A2:N2')
  ws.getCell('A2').value =
    'Generado automáticamente por la app a partir de los datos capturados. Revisa antes de imprimir para firma.'
  ws.getCell('A2').font = { name: 'Arial', color: { argb: NOTE_COLOR }, italic: true, size: 10 }

  // Datos generales
  const label = (coord: string, text: string) => {
    const c = ws.getCell(coord)
    c.value = text
    c.font = { name: 'Arial', bold: true, size: 10 }
  }
  const value = (coord: string, val: any, fmt?: string) => {
    const c = ws.getCell(coord)
    c.value = val
    c.border = BORDER
    c.font = { name: 'Arial', size: 10 }
    if (fmt) c.numFmt = fmt
  }

  label('A4', 'Operador:')
  ws.mergeCells('B4:D4')
  value('B4', data.conductor.nombre)
  label('A5', 'Unidad (ECO):')
  ws.mergeCells('B5:D5')
  value('B5', data.conductor.unidad ?? '')

  label('F4', 'Semana del:')
  value('G4', new Date(`${data.periodo.desde}T00:00:00`), DATEFMT)
  label('H4', 'al:')
  value('I4', new Date(`${data.periodo.hasta}T00:00:00`), DATEFMT)

  // Tabla de viajes
  ws.mergeCells('A7:N7')
  ws.getCell('A7').value = 'VIAJES DE LA SEMANA'
  ws.getCell('A7').font = { name: 'Arial', bold: true, size: 10 }

  const tripHeaders = [
    'Fecha cita', 'Remolque', 'Cliente', 'Origen', 'Destino', 'Documento',
    'Km inicial', 'Km final', 'Diferencia en km', 'Litros', 'Rendimiento (km/l)',
    'Operador', 'ECO', 'Fecha de cobro',
  ]
  const headerRow = ws.getRow(8)
  tripHeaders.forEach((h, i) => {
    const c = headerRow.getCell(i + 1)
    c.value = h
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } }
    c.font = { name: 'Arial', bold: true, size: 9, color: { argb: NAVY } }
    c.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' }
    c.border = BORDER
  })
  headerRow.height = 28

  let r = 9
  for (const v of data.viajes) {
    const row = ws.getRow(r)
    const diffKm = v.kmInicial !== null && v.kmFinal !== null ? v.kmFinal - v.kmInicial : null
    const rendimiento = diffKm !== null && v.litros ? diffKm / v.litros : null
    const cells = [
      v.fechaProgramada ? new Date(v.fechaProgramada) : null,
      v.remolque, v.cliente, v.origen, v.destino, v.documento,
      v.kmInicial, v.kmFinal, diffKm, v.litros,
      rendimiento !== null ? Math.round(rendimiento * 100) / 100 : null,
      data.conductor.nombre, v.vehiculoPlacas, v.fechaCobro ? new Date(v.fechaCobro) : null,
    ]
    cells.forEach((val, i) => {
      const c = row.getCell(i + 1)
      c.value = val
      c.border = BORDER
      c.font = { name: 'Arial', size: 10 }
      if (i === 0 || i === 13) c.numFmt = DATEFMT
    })
    r++
  }
  const lastTripRow = Math.max(r - 1, 9)

  // Liquidación (izquierda) y Resumen (derecha)
  const liqTitleRow = lastTripRow + 3
  ws.mergeCells(`A${liqTitleRow}:D${liqTitleRow}`)
  ws.getCell(`A${liqTitleRow}`).value = 'LIQUIDACIÓN DEL PERIODO'
  ws.getCell(`A${liqTitleRow}`).font = { name: 'Arial', bold: true, size: 10 }
  ws.mergeCells(`F${liqTitleRow}:I${liqTitleRow}`)
  ws.getCell(`F${liqTitleRow}`).value = 'RESUMEN / NETO A PAGAR'
  ws.getCell(`F${liqTitleRow}`).font = { name: 'Arial', bold: true, size: 10 }

  const headRow2 = liqTitleRow + 1
  const headCell = (coord: string, text: string) => {
    const c = ws.getCell(coord)
    c.value = text
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } }
    c.font = { name: 'Arial', bold: true, size: 9, color: { argb: NAVY } }
    c.alignment = { horizontal: 'center' }
    c.border = BORDER
  }
  ws.mergeCells(`A${headRow2}:C${headRow2}`); headCell(`A${headRow2}`, 'Concepto')
  headCell(`D${headRow2}`, 'Monto')
  ws.mergeCells(`F${headRow2}:H${headRow2}`); headCell(`F${headRow2}`, 'Concepto')
  headCell(`I${headRow2}`, 'Monto')

  const liq = data.liquidacion
  let lr = headRow2 + 1
  const liqRows: [string, number][] = [
    ['Pago de viajes', liq.pagoViajes],
    ['Anticipos entregados', liq.anticipos],
    ['Gastos comprobables', liq.gastosComprobables],
  ]
  const liqCoord: Record<string, string> = {}
  for (const [name, val] of liqRows) {
    ws.mergeCells(`A${lr}:C${lr}`)
    ws.getCell(`A${lr}`).value = name
    ws.getCell(`A${lr}`).font = { name: 'Arial', size: 10 }
    value(`D${lr}`, val, CUR)
    liqCoord[name] = `D${lr}`
    lr++
  }
  // Observaciones de gastos: texto libre, sin dato automático (no hay campo para esto en el esquema)
  ws.mergeCells(`A${lr}:C${lr}`)
  ws.getCell(`A${lr}`).value = 'Observaciones de gastos'
  ws.getCell(`A${lr}`).font = { name: 'Arial', size: 10 }
  ws.getCell(`D${lr}`).border = BORDER
  lr++

  ws.mergeCells(`A${lr}:C${lr}`)
  ws.getCell(`A${lr}`).value = 'Diferencia (anticipos - comprobado)'
  ws.getCell(`A${lr}`).font = { name: 'Arial', bold: true, size: 10 }
  ws.getCell(`D${lr}`).value = { formula: `${liqCoord['Anticipos entregados']}-${liqCoord['Gastos comprobables']}` }
  ws.getCell(`D${lr}`).numFmt = CUR
  ws.getCell(`D${lr}`).border = BORDER
  ws.getCell(`D${lr}`).font = { name: 'Arial', bold: true, size: 10 }
  lr++

  ws.mergeCells(`A${lr}:C${lr}`)
  ws.getCell(`A${lr}`).value = 'Abono a préstamo (del periodo)'
  ws.getCell(`A${lr}`).font = { name: 'Arial', size: 10 }
  value(`D${lr}`, liq.abonoPrestamoPeriodo, CUR)
  lr++

  ws.mergeCells(`A${lr}:C${lr}`)
  ws.getCell(`A${lr}`).value = 'Saldo de préstamo pendiente (acumulado)'
  ws.getCell(`A${lr}`).font = { name: 'Arial', bold: true, size: 10 }
  value(`D${lr}`, liq.saldoPrestamo, CUR)
  lr++

  // Resumen / neto a pagar (derecha)
  let rr = headRow2 + 1
  const set = (coord: string, label: string, val: number | { formula: string }, bold = false, kpi = false) => {
    ws.mergeCells(`F${rr}:H${rr}`)
    ws.getCell(`F${rr}`).value = label
    ws.getCell(`F${rr}`).font = { name: 'Arial', bold, size: kpi ? 12 : 10 }
    const c = ws.getCell(`I${rr}`)
    c.value = val
    c.numFmt = CUR
    c.border = BORDER
    c.font = { name: 'Arial', bold, size: kpi ? 13 : 10, color: kpi ? { argb: NAVY } : undefined }
  }
  const anticipoRow = rr; set('I' + rr, 'Anticipo', liq.anticipos); rr++
  const gastosRow = rr; set('I' + rr, 'Gastos a comprobar', liq.gastosComprobables); rr++
  const difRow = rr; set('I' + rr, 'Diferencia', { formula: `I${anticipoRow}-I${gastosRow}` }); rr++
  const salarioRow = rr; set('I' + rr, 'Salario', liq.pagoViajes); rr++
  const subtotalRow = rr; set('I' + rr, 'Subtotal (salario - diferencia)', { formula: `I${salarioRow}-I${difRow}` }, true); rr++
  const descRow = rr; set('I' + rr, 'Descuentos', liq.descuentos); rr++
  const aPagarRow = rr; set('I' + rr, 'A pagar (subtotal - descuentos)', { formula: `I${subtotalRow}-I${descRow}` }, true); rr++
  rr++ // Gastos entregado: sin dato automático, se deja en blanco a propósito (ver nota más abajo)
  ws.mergeCells(`F${rr - 1}:H${rr - 1}`)
  ws.getCell(`F${rr - 1}`).value = 'Gastos entregado'
  ws.getCell(`F${rr - 1}`).font = { name: 'Arial', size: 10 }
  ws.getCell(`I${rr - 1}`).border = BORDER
  const bonoRow = rr; set('I' + rr, 'Más bono', liq.bono); rr++
  const netoRow = rr; set('I' + rr, 'NETO A PAGAR', { formula: `I${aPagarRow}+I${bonoRow}` }, true, true); rr++

  const noteRow = Math.max(lr, rr) + 1
  ws.mergeCells(`A${noteRow}:N${noteRow}`)
  ws.getCell(`A${noteRow}`).value =
    '"Gastos entregado" y "Observaciones de gastos" quedan en blanco: no hay un campo en la app para esos datos todavía.'
  ws.getCell(`A${noteRow}`).font = { name: 'Arial', italic: true, size: 9, color: { argb: NOTE_COLOR } }
  ws.getCell(`A${noteRow}`).alignment = { wrapText: true }

  // Firma
  const firmaRow = noteRow + 3
  ws.mergeCells(`A${firmaRow}:D${firmaRow}`)
  ws.getCell(`A${firmaRow}`).border = { top: { style: 'thin', color: { argb: NAVY } } }
  ws.mergeCells(`A${firmaRow + 1}:D${firmaRow + 1}`)
  ws.getCell(`A${firmaRow + 1}`).value = 'FIRMA DEL OPERADOR'
  ws.getCell(`A${firmaRow + 1}`).font = { name: 'Arial', bold: true, size: 10 }
  ws.getCell(`A${firmaRow + 1}`).alignment = { horizontal: 'center' }

  ws.mergeCells(`F${firmaRow}:I${firmaRow}`)
  ws.getCell(`F${firmaRow}`).border = { top: { style: 'thin', color: { argb: NAVY } } }
  ws.mergeCells(`F${firmaRow + 1}:I${firmaRow + 1}`)
  ws.getCell(`F${firmaRow + 1}`).value = 'FIRMA / VO.BO. FINANZAS'
  ws.getCell(`F${firmaRow + 1}`).font = { name: 'Arial', bold: true, size: 10 }
  ws.getCell(`F${firmaRow + 1}`).alignment = { horizontal: 'center' }

  ws.pageSetup.printArea = `A1:N${firmaRow + 2}`

  const buf = await wb.xlsx.writeBuffer()
  return Buffer.from(buf)
}
