import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { RolUsuario } from '@/lib/types'

const ACCESO_RUTAS: Record<RolUsuario, string[]> = {
  admin:      ['/admin', '/dispatcher', '/finanzas', '/conductor'],
  dispatcher: ['/dispatcher'],
  finanzas:   ['/finanzas'],
  conductor:  ['/conductor'],
}

const HOME_POR_ROL: Record<RolUsuario, string> = {
  admin:      '/admin',
  dispatcher: '/dispatcher',
  finanzas:   '/finanzas',
  conductor:  '/conductor',
}

// Crea una respuesta de redirección que incluye las cookies de sesión de
// supabaseResponse. Supabase exige que TODA respuesta del middleware propague
// esas cookies; si no se hace, el servidor y el navegador quedan fuera de sync
// y la sesión puede romperse o aparecer como válida cuando ya no lo es.
function redirigir(
  destination: string,
  request: NextRequest,
  supabaseResponse: NextResponse
): NextResponse {
  const res = NextResponse.redirect(new URL(destination, request.url))
  supabaseResponse.cookies.getAll().forEach(({ name, value }) =>
    res.cookies.set(name, value)
  )
  return res
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // No añadir lógica entre createServerClient y getUser().
  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // ── Raíz ──────────────────────────────────────────────────────────────────
  if (pathname === '/') {
    if (!user) return redirigir('/login', request, supabaseResponse)

    const { data: usuario } = await supabase
      .from('usuario').select('rol').eq('auth_user_id', user.id).single()

    return redirigir(
      usuario ? (HOME_POR_ROL[usuario.rol as RolUsuario] ?? '/login') : '/login',
      request,
      supabaseResponse
    )
  }

  // ── Login ──────────────────────────────────────────────────────────────────
  if (pathname === '/login') {
    if (!user) return supabaseResponse

    const { data: usuario } = await supabase
      .from('usuario').select('rol').eq('auth_user_id', user.id).single()

    // Si el usuario tiene sesión pero no tiene perfil en la tabla, lo dejamos
    // en /login en lugar de redirigir a /login (lo que causaría un bucle).
    if (!usuario) return supabaseResponse

    return redirigir(
      HOME_POR_ROL[usuario.rol as RolUsuario] ?? '/login',
      request,
      supabaseResponse
    )
  }

  // ── Rutas protegidas ───────────────────────────────────────────────────────
  if (!user) {
    return redirigir('/login', request, supabaseResponse)
  }

  const { data: usuario } = await supabase
    .from('usuario').select('rol').eq('auth_user_id', user.id).single()

  if (!usuario) {
    // Sesión válida pero sin perfil → expulsar a login.
    // No llamamos signOut() aquí porque en Edge Runtime no propaga las cookies
    // correctamente; el cliente debe hacer el sign-out si llega a este estado.
    return redirigir('/login', request, supabaseResponse)
  }

  const rol = usuario.rol as RolUsuario
  const rutasPermitidas = ACCESO_RUTAS[rol] ?? []
  const tieneAcceso = rutasPermitidas.some(ruta => pathname.startsWith(ruta))

  if (!tieneAcceso) {
    return redirigir(HOME_POR_ROL[rol], request, supabaseResponse)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
