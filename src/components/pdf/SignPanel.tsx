'use client'

// Panel "Firmar PDF": dibuja la firma en una libreta y colocala sobre
// cualquier pagina del documento, con tamano y opacidad ajustables.

import { useEffect, useRef, useState } from 'react'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { ChevronLeft, ChevronRight, Eraser, FileText, PenTool } from 'lucide-react'
import { BusyButton, FileDrop, PanelShell } from './Shared'
import {
  canvasToPngBytes,
  downloadBytes,
  formatSize,
  getPageCount,
  readFileBytes,
  renderPdfPage,
  signPdf,
  type RenderedPage,
} from '@/lib/pdf/ops'

const PAD_W = 480
const PAD_H = 180

export function SignPanel({ onBack }: { onBack: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [bytes, setBytes] = useState<Uint8Array | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [pageNum, setPageNum] = useState(1)
  const [preview, setPreview] = useState<RenderedPage | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const [widthPct, setWidthPct] = useState(30)
  const [opacity, setOpacity] = useState(100)
  const [penColor, setPenColor] = useState<'ink' | 'blue'>('ink')
  const [sigEmpty, setSigEmpty] = useState(true)
  const [sigVersion, setSigVersion] = useState(0)
  const [busy, setBusy] = useState(false)
  const padRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const lastPt = useRef<{ x: number; y: number } | null>(null)

  // preparar la libreta de firma al montar
  useEffect(() => {
    const pad = padRef.current
    if (!pad) return
    const ctx = pad.getContext('2d')
    if (!ctx) return
    ctx.lineWidth = 2.6
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#111111'
  }, [])

  // renderizar la pagina seleccionada como vista previa
  useEffect(() => {
    if (!bytes) return
    let cancelled = false
    void (async () => {
      try {
        const rendered = await renderPdfPage(bytes, pageNum - 1, 440)
        if (cancelled) return
        setPreview(rendered)
        setPreviewUrl(rendered.canvas.toDataURL('image/png'))
        setPos(null)
      } catch {
        if (!cancelled) {
          toast({
            title: 'No se pudo mostrar la pagina',
            description: 'Revisa que el PDF no este danado.',
            variant: 'destructive',
          })
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [bytes, pageNum])

  const pickPdf = async (files: File[]) => {
    setBusy(true)
    try {
      const data = await readFileBytes(files[0])
      const count = await getPageCount(data)
      setFile(files[0])
      setBytes(data)
      setPageCount(count)
      setPageNum(1)
      setPos(null)
    } catch {
      toast({
        title: 'PDF invalido',
        description: 'No se pudo leer el documento. Comprueba que es un PDF correcto.',
        variant: 'destructive',
      })
      setFile(null)
      setBytes(null)
      setPageCount(0)
    } finally {
      setBusy(false)
    }
  }

  const padPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pad = padRef.current!
    const rect = pad.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * pad.width,
      y: ((e.clientY - rect.top) / rect.height) * pad.height,
    }
  }

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = padRef.current?.getContext('2d')
    if (!ctx) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drawing.current = true
    lastPt.current = padPos(e)
    ctx.strokeStyle = penColor === 'ink' ? '#111111' : '#1d4ed8'
  }

  const moveDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    const ctx = padRef.current?.getContext('2d')
    if (!ctx || !lastPt.current) return
    const p = padPos(e)
    ctx.beginPath()
    ctx.moveTo(lastPt.current.x, lastPt.current.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    lastPt.current = p
    if (sigEmpty) setSigEmpty(false)
  }

  const endDraw = () => {
    drawing.current = false
    lastPt.current = null
  }

  const clearPad = () => {
    const pad = padRef.current
    const ctx = pad?.getContext('2d')
    if (!pad || !ctx) return
    ctx.clearRect(0, 0, pad.width, pad.height)
    setSigEmpty(true)
  }

  const applySignature = async () => {
    if (!bytes || !preview || !pos) {
      toast({
        title: 'Falta colocar la firma',
        description: sigEmpty
          ? 'Dibuja tu firma en la libreta.'
          : 'Haz clic sobre la vista previa de la pagina para colocar la firma.',
        variant: 'destructive',
      })
      return
    }
    if (sigEmpty) {
      toast({ title: 'Falta la firma', description: 'Dibuja tu firma en la libreta.', variant: 'destructive' })
      return
    }
    setBusy(true)
    try {
      const pad = padRef.current!
      const png = await canvasToPngBytes(pad)
      const sigWpx = (widthPct / 100) * preview.canvas.width
      const sigHpx = sigWpx * (pad.height / pad.width)
      const leftPx = pos.x - sigWpx / 2
      const topPx = pos.y - sigHpx / 2
      const xPt = (leftPx / preview.canvas.width) * preview.widthPt
      const yTopPt = (topPx / preview.canvas.height) * preview.heightPt
      const widthPt = (widthPct / 100) * preview.widthPt
      const result = await signPdf(bytes, png, pageNum - 1, {
        xPt,
        yTopPt,
        widthPt,
        opacity: opacity / 100,
      })
      downloadBytes(result.data, result.name)
      toast({
        title: 'PDF firmado',
        description: `"${result.name}" se descargo con la firma en la pagina ${pageNum}.`,
      })
    } catch (err) {
      toast({
        title: 'No se pudo firmar',
        description: err instanceof Error ? err.message : 'Intenta de nuevo.',
        variant: 'destructive',
      })
    } finally {
      setBusy(false)
    }
  }

  const sigWpx = preview && pos ? (widthPct / 100) * preview.canvas.width : 0
  const sigHpx = preview ? sigWpx * (PAD_H / PAD_W) : 0

  return (
    <PanelShell
      title="Firmar PDF"
      description="Dibuja tu firma, colocala en la pagina que elijas y descarga el documento firmado. Nada sale de tu dispositivo."
      icon={<PenTool className="w-5 h-5" aria-hidden />}
      onBack={onBack}
    >
      <FileDrop accept="application/pdf,.pdf" label="Arrastra o pulsa para elegir un PDF" onFiles={(fs) => void pickPdf(fs)} />

      {file && pageCount > 0 && (
        <>
          <div className="flex items-center gap-2.5 rounded-md border border-border/70 bg-[#141414] px-3 py-2">
            <FileText className="w-4 h-4 text-violet-400 shrink-0" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate">{file.name}</p>
              <p className="text-[10.5px] text-muted-foreground tabular-nums">
                {pageCount} pagina{pageCount === 1 ? '' : 's'} · {formatSize(file.size)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                setFile(null)
                setBytes(null)
                setPageCount(0)
                setPreview(null)
                setPreviewUrl(null)
              }}
            >
              Quitar
            </Button>
          </div>

          {/* libreta de firma */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">1. Dibuja tu firma</Label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={'h-6 w-6 rounded-full border-2 ' + (penColor === 'ink' ? 'border-amber-500' : 'border-transparent')}
                  style={{ backgroundColor: '#111111' }}
                  onClick={() => setPenColor('ink')}
                  aria-label="Tinta negra"
                />
                <button
                  type="button"
                  className={'h-6 w-6 rounded-full border-2 ' + (penColor === 'blue' ? 'border-amber-500' : 'border-transparent')}
                  style={{ backgroundColor: '#1d4ed8' }}
                  onClick={() => setPenColor('blue')}
                  aria-label="Tinta azul"
                />
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={clearPad}>
                  <Eraser className="w-3.5 h-3.5" aria-hidden />
                  Limpiar
                </Button>
              </div>
            </div>
            <canvas
              ref={padRef}
              width={PAD_W}
              height={PAD_H}
              aria-label="Libreta para dibujar la firma"
              onPointerDown={startDraw}
              onPointerMove={moveDraw}
              onPointerUp={endDraw}
              onPointerLeave={endDraw}
              className="w-full max-w-full rounded-md border border-border bg-white touch-none cursor-crosshair"
              style={{ aspectRatio: `${PAD_W} / ${PAD_H}` }}
            />
          </div>

          {/* pagina y colocacion */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">2. Coloca la firma en la pagina</Label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setPageNum((n) => Math.max(1, n - 1))}
                disabled={pageNum <= 1 || !bytes}
                aria-label="Pagina anterior"
              >
                <ChevronLeft className="w-4 h-4" aria-hidden />
              </Button>
              <Input
                type="number"
                min={1}
                max={pageCount}
                value={pageNum}
                onChange={(e) => {
                  const v = Math.max(1, Math.min(pageCount, Number(e.target.value) || 1))
                  setPageNum(v)
                }}
                className="h-8 text-xs w-20"
                aria-label="Numero de pagina"
              />
              <span className="text-[11px] text-muted-foreground">de {pageCount}</span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setPageNum((n) => Math.min(pageCount, n + 1))}
                disabled={pageNum >= pageCount || !bytes}
                aria-label="Pagina siguiente"
              >
                <ChevronRight className="w-4 h-4" aria-hidden />
              </Button>
            </div>

            <div className="flex justify-center">
              <div
                className="relative inline-block cursor-crosshair"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  setPos({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                  })
                }}
              >
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={`Vista previa de la pagina ${pageNum}`}
                    className="max-w-full rounded-md border border-border"
                    style={{ width: 440 }}
                    draggable={false}
                  />
                ) : (
                  <div className="w-[440px] max-w-full h-[300px] rounded-md border border-border bg-[#141414] flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">Renderizando pagina...</span>
                  </div>
                )}
                {pos && !sigEmpty && sigVersion >= 0 && (
                  <img
                    src={padRef.current?.toDataURL('image/png') ?? ''}
                    alt="Firma colocada"
                    className="absolute pointer-events-none"
                    style={{
                      left: pos.x - sigWpx / 2,
                      top: pos.y - sigHpx / 2,
                      width: sigWpx,
                      opacity: opacity / 100,
                    }}
                    draggable={false}
                  />
                )}
                {!pos && (
                  <p className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 text-[10px] text-foreground/80 px-2 py-0.5 rounded">
                    Haz clic para colocar la firma
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* tamano y opacidad */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <Label className="text-muted-foreground">Tamano</Label>
                <span className="tabular-nums text-muted-foreground">{widthPct}% del ancho</span>
              </div>
              <Slider value={[widthPct]} min={10} max={60} onValueChange={(v) => setWidthPct(v[0])} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <Label className="text-muted-foreground">Opacidad</Label>
                <span className="tabular-nums text-muted-foreground">{opacity}%</span>
              </div>
              <Slider value={[opacity]} min={40} max={100} onValueChange={(v) => setOpacity(v[0])} />
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Pulsa de nuevo sobre la pagina para mover la firma a otra posicion.
          </p>

          <div>
            <BusyButton busy={busy} onClick={() => void applySignature()}>
              Descargar PDF firmado
            </BusyButton>
          </div>
        </>
      )}
    </PanelShell>
  )
}
