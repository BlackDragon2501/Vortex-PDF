'use client'

// Panel "Comprimir PDF": reduce el peso del documento sin perder calidad
// (object streams + limpieza de metadatos) o, si se desea un archivo todavia
// mas pequeno, con compresion maxima via re-creacion de paginas.

import { useState } from 'react'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FileArchive, FileText, TrendingDown } from 'lucide-react'
import { BusyButton, FileDrop, PanelShell } from './Shared'
import {
  compressPdfLossless,
  compressPdfRaster,
  downloadBytes,
  formatSize,
  getPageCount,
  readFileBytes,
} from '@/lib/pdf/ops'

type CompressMode = 'lossless' | 'maxima'

interface CompressResult {
  original: number
  nuevo: number
}

export function CompressPanel({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<CompressMode>('lossless')
  const [stripMetadata, setStripMetadata] = useState(true)
  const [quality, setQuality] = useState<'0.85' | '0.7' | '0.5'>('0.7')
  const [file, setFile] = useState<File | null>(null)
  const [bytes, setBytes] = useState<Uint8Array | null>(null)
  const [pages, setPages] = useState(0)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<CompressResult | null>(null)

  const pickPdf = async (files: File[]) => {
    setBusy(true)
    try {
      const data = await readFileBytes(files[0])
      const count = await getPageCount(data)
      setFile(files[0])
      setBytes(data)
      setPages(count)
      setResult(null)
    } catch (err) {
      toast({
        title: 'PDF invalido',
        description: err instanceof Error ? err.message : 'No se pudo leer el documento.',
        variant: 'destructive',
      })
      setFile(null)
      setBytes(null)
      setPages(0)
    } finally {
      setBusy(false)
    }
  }

  const run = async () => {
    if (!bytes || !file) return
    setBusy(true)
    try {
      const base = file.name.replace(/\.pdf$/i, '')
      const res =
        mode === 'lossless'
          ? await compressPdfLossless(bytes, base, { stripMetadata })
          : await compressPdfRaster(bytes, base, Number(quality))
      downloadBytes(res.data, res.name)
      setResult({ original: file.size, nuevo: res.data.length })
      if (res.data.length >= file.size) {
        toast({
          title: 'No hubo reduccion',
          description:
            mode === 'maxima'
              ? 'Este PDF ya pesa muy poco; la compresion maxima rinde con documentos escaneados o con imagenes pesadas.'
              : 'El documento ya tenia una estructura eficiente. Se descargo la version reestructurada.',
        })
      } else {
        const pct = Math.round((1 - res.data.length / file.size) * 100)
        toast({
          title: 'PDF comprimido',
          description: `"${res.name}" se descargo un ${pct}% mas ligero, sin perder calidad.`,
        })
      }
    } catch (err) {
      toast({
        title: 'No se pudo comprimir',
        description: err instanceof Error ? err.message : 'Intenta de nuevo.',
        variant: 'destructive',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <PanelShell
      title="Comprimir PDF"
      description="Reduce el peso de tus PDF sin perder calidad. Todo se procesa en tu navegador."
      icon={<FileArchive className="w-5 h-5" aria-hidden />}
      onBack={onBack}
    >
      <FileDrop
        accept="application/pdf,.pdf"
        label="Arrastra o pulsa para elegir un PDF"
        hint="La compresion sin perdida nunca toca el contenido ni las imagenes"
        onFiles={(fs) => void pickPdf(fs)}
      />

      {file && bytes && pages > 0 && (
        <div className="flex items-center gap-2.5 rounded-md border border-border/70 bg-[#141414] px-3 py-2">
          <FileText className="w-4 h-4 text-violet-400 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium truncate">{file.name}</p>
            <p className="text-[10.5px] text-muted-foreground tabular-nums">
              {formatSize(file.size)} · {pages} pagina{pages === 1 ? '' : 's'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              setFile(null)
              setBytes(null)
              setPages(0)
              setResult(null)
            }}
          >
            Quitar
          </Button>
        </div>
      )}

      <RadioGroup
        value={mode}
        onValueChange={(v) => setMode(v as CompressMode)}
        className="flex flex-col gap-2"
      >
        <div className="flex items-start gap-2 rounded-md border border-border/70 bg-[#141414] px-3 py-2.5">
          <RadioGroupItem value="lossless" id="comp-lossless" className="mt-0.5" />
          <Label htmlFor="comp-lossless" className="text-xs font-normal cursor-pointer">
            Sin perdida de calidad (recomendado)
            <span className="block text-[11px] text-muted-foreground">
              Reorganiza la estructura interna y limpia metadatos. El aspecto del PDF no cambia.
            </span>
          </Label>
        </div>
        <div className="flex items-start gap-2 rounded-md border border-border/70 bg-[#141414] px-3 py-2.5">
          <RadioGroupItem value="maxima" id="comp-maxima" className="mt-0.5" />
          <Label htmlFor="comp-maxima" className="text-xs font-normal cursor-pointer">
            Compresion maxima
            <span className="block text-[11px] text-muted-foreground">
              Vuelve a crear cada pagina como imagen optimizada. Reduce mucho mas, con perdida
              visual ligera al hacer zoom.
            </span>
          </Label>
        </div>
      </RadioGroup>

      {mode === 'lossless' && (
        <div className="flex items-center gap-2 px-1">
          <Checkbox
            id="comp-metadata"
            checked={stripMetadata}
            onCheckedChange={(v) => setStripMetadata(v === true)}
          />
          <Label htmlFor="comp-metadata" className="text-xs font-normal cursor-pointer">
            Limpiar metadatos (autor, software de origen, historial)
          </Label>
        </div>
      )}

      {mode === 'maxima' && (
        <div className="flex flex-wrap gap-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Calidad de imagen</Label>
            <Select value={quality} onValueChange={(v) => setQuality(v as typeof quality)}>
              <SelectTrigger className="h-9 w-40 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.85" className="text-xs">Alta (poca perdida)</SelectItem>
                <SelectItem value="0.7" className="text-xs">Media (equilibrada)</SelectItem>
                <SelectItem value="0.5" className="text-xs">Baja (archivo minimo)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {result && (
        <div
          aria-live="polite"
          className="flex items-center gap-2.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5"
        >
          <TrendingDown className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden />
          <p className="text-xs">
            {formatSize(result.original)} →{' '}
            <span className="font-semibold text-emerald-400">{formatSize(result.nuevo)}</span>
            {result.nuevo < result.original && (
              <span className="text-emerald-400">
                {' '}({Math.round((1 - result.nuevo / result.original) * 100)}% menos)
              </span>
            )}
          </p>
        </div>
      )}

      <div>
        <BusyButton busy={busy} onClick={() => void run()} disabled={!bytes}>
          Comprimir PDF
        </BusyButton>
      </div>
    </PanelShell>
  )
}
