'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { loginAction } from './actions'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
    >
      {pending ? 'Entrando…' : 'Entrar'}
    </button>
  )
}

export default function LoginPage() {
  const [state, formAction] = useFormState(loginAction, null)

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 w-full max-w-sm">
        <div className="mb-8">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">TAG</p>
          <h1 className="text-xl font-semibold text-gray-900 mt-1">Transportes González</h1>
          <p className="text-sm text-gray-500 mt-1">Sistema interno de operaciones</p>
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Correo
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="usuario@tag.mx"
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoComplete="current-password"
            />
          </div>

          {state?.error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
              <p className="text-sm text-red-700">{state.error}</p>
            </div>
          )}

          <SubmitButton />
        </form>
      </div>
    </main>
  )
}
