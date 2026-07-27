import { createAdminClient } from '@/lib/supabase/admin'

// Lanza si la subida falla — el llamador decide si eso invalida la operación
// completa. Nunca debe devolver null en silencio: eso dejaría el registro con
// una URL nula aunque el usuario sí haya capturado la imagen.
export async function subirBase64(
  bucket: string,
  base64: string,
  path: string,
  mimeType: string
): Promise<string> {
  const adminClient = createAdminClient()
  const raw = base64.includes(',') ? base64.split(',')[1] : base64
  const buf = Buffer.from(raw, 'base64')
  const { data, error } = await adminClient.storage
    .from(bucket)
    .upload(path, buf, { contentType: mimeType, upsert: false })
  if (error) throw new Error(`No se pudo subir el archivo: ${error.message}`)
  return data.path
}
