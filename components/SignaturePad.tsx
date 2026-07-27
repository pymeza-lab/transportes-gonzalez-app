'use client'

import { useRef, useState } from 'react'

interface Props {
  onChange: (dataUrl: string | null) => void
}

export default function SignaturePad({ onChange }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const drawing    = useRef(false)
  const [isEmpty, setIsEmpty] = useState(true)

  function ctx() {
    const c = canvasRef.current
    if (!c) return null
    const ctx = c.getContext('2d')
    if (!ctx) return null
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth   = 2.5
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'
    return ctx
  }

  function pos(clientX: number, clientY: number) {
    const c = canvasRef.current!
    const r = c.getBoundingClientRect()
    return {
      x: (clientX - r.left) * (c.width  / r.width),
      y: (clientY - r.top)  * (c.height / r.height),
    }
  }

  function start(clientX: number, clientY: number) {
    drawing.current = true
    setIsEmpty(false)
    const c = ctx()
    if (!c) return
    const p = pos(clientX, clientY)
    c.beginPath()
    c.moveTo(p.x, p.y)
  }

  function move(clientX: number, clientY: number) {
    if (!drawing.current) return
    const c = ctx()
    if (!c) return
    const p = pos(clientX, clientY)
    c.lineTo(p.x, p.y)
    c.stroke()
  }

  function end() {
    if (!drawing.current) return
    drawing.current = false
    onChange(canvasRef.current?.toDataURL('image/png') ?? null)
  }

  function clear() {
    const c = canvasRef.current
    if (!c) return
    c.getContext('2d')?.clearRect(0, 0, c.width, c.height)
    setIsEmpty(true)
    onChange(null)
  }

  return (
    <div>
      <div className="relative border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-white">
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            <p className="text-gray-300 text-sm">Firmar aquí</p>
          </div>
        )}
        <canvas
          ref={canvasRef}
          width={600}
          height={160}
          className="w-full touch-none block"
          onMouseDown={e => start(e.clientX, e.clientY)}
          onMouseMove={e => move(e.clientX, e.clientY)}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={e => { e.preventDefault(); start(e.touches[0].clientX, e.touches[0].clientY) }}
          onTouchMove={e =>  { e.preventDefault(); move(e.touches[0].clientX,  e.touches[0].clientY) }}
          onTouchEnd={end}
        />
      </div>
      {!isEmpty && (
        <button type="button" onClick={clear} className="mt-2 text-xs text-gray-500 underline">
          Borrar firma
        </button>
      )}
    </div>
  )
}
