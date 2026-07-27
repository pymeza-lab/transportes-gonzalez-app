// Cliente de Supabase para uso en componentes de cliente (browser).
// Claude Code: completar según el módulo de auth (paso 1 del CLAUDE.md).
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
