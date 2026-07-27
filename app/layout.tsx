import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Transportes González — Operaciones',
  description: 'App interna de operaciones para Transportes González (TAG)',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-gray-50">{children}</body>
    </html>
  )
}
