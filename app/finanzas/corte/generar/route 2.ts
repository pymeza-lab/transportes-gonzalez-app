import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { obtenerCorteConductor } from '@/lib/corte'
import { generarCorteXlsx } from '@/lib/corteXlsx'
import { generarCortePdf } from '@/lib/cortePdf'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sin sesión.' }, { status: 401 })

  const { data: usuario } = await supabase
    .from('usuario').select('rol').eq('auth_user_id', user.id).single()
  if (!usuario || !['finanzas', 'admin'].includes(usuario.rol)) {
    return NextResponse.json({ error: 'Sin permisos.' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const conductorId = searchParams.get('conductor_id')
  const desde = searchParams.get('desde')
  const hasta = searchParams.get('hasta')
  const formato = searchParams.get('formato') === 'pdf' ? 'pdf' : 'xlsx'

  if (!conductorId || !desde || !hasta) {
    return NextResponse.json({ error: 'Faltan conductor_id, desde y hasta.' }, { status: 400 })
  }

  const data = await obtenerCorteConductor(supabase, conductorId, desde, hasta)
  if (!data) return NextResponse.json({ error: 'Conductor no encontrado.' }, { status: 404 })

  const nombreArchivo = `Corte_${data.conductor.nombre.replace(/\s+/g, '_')}_${desde}_a_${hasta}`

  if (formato === 'pdf') {
    const buffer = await generarCortePdf(data)
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${nombreArchivo}.pdf"`,
      },
    })
  }

  const buffer = await generarCorteXlsx(data)
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${nombreArchivo}.xlsx"`,
    },
  })
}
