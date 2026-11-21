'use client'

// Panel "Convertir": PDF a imagenes, PDF a texto e imagenes a PDF.

import { useState } from 'react'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FileText, Repeat } from 'lucide-react'
import { BusyButton, FileDrop, PanelShell } from './Shared'
import {
  downloadBytes,
  getPageCount,
  imagesToPdf,
  pdfToImages,
  pdfToText,
  readFileBytes,
  zipFiles,
} from '@/lib/pdf/ops'

type ConvertMode = 'pdf-to-images' | 'pdf-to-text' | 'images-to-pdf'

export function ConvertPanel({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<ConvertMode>('pdf-to-images')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null)
  const [pdfPages, setPdfPages] = useState(0)
  const [images, setImages] = useState<File[]>([])
  const [format, setFormat] = useState<'png' | 'jpeg'>('png')
  const [scale, setScale] = useState<'1' | '2' | '3'>('2')
  const [busy, setBusy] = useState(false)

  const pickPdf = async (files: File[]) => {
    setBusy(true)
    try {
      const data = await readFileBytes(files[0])
      const count = await getPageCount(data)
      setPdfFile(files[0])
      setPdfBytes(data)
      setPdfPages(count)
    } catch {
      toast({
        title: 'PDF invalido',
        description: 'No se pudo leer el documento. Comprueba que es un PDF correcto.',
        variant: 'destructive',
      })
      setPdfFile(null)
      setPdfBytes(null)
      setPdfPages(0)
    } finally {
      setBusy(false)
    }
  }

  const run = async () => {
    setBusy(true)
    try {
      if (mode === 'images-to-pdf') {
        const result = await imagesToPdf(images)
        downloadBytes(result.data, result.name)
        toast({ title: 'Imagenes convertidas', description: `Se descargo "${result.name}".` })
        return
      }
      if (!pdfBytes || !pdfFile) return
      const base = pdfFile.name.replace(/\.pdf$/i, '')
      if (mode === 'pdf-to-text') {
        const result = await pdfToText(pdfBytes, base)
        downloadBytes(result.data, result.name)
        toast({ title: 'Texto extraido', description: `Se descargo "${result.name}".` })
        return
      }
      const pages = await pdfToImages(pdfBytes, format, base, Number(scale))
      if (pages.length === 1) {
        downloadBytes(pages[0].data, pages[0].name)
        toast({ title: 'PDF convertido', description: `Se descargo "${pages[0].name}".` })
      } else {
        const zip = zipFiles(pages)
        downloadBytes(zip, `${base}-imagenes.zip`)
        toast({
          title: 'PDF convertido',
          description: `Se generaron ${pages.length} imagenes en "${base}-imagenes.zip".`,
        })
      }
    } catch (err) {
      toast({
        title: 'No se pudo convertir',
        description: err instanceof Error ? err.message : 'Intenta de nuevo.',
        variant: 'destructive',
      })
    } finally {
      setBusy(false)
    }
  }

  const pickImages = (files: File[]) => setImages((prev) => [...prev, ...files.filter((f) => f.type.startsWith('image/'))])

  return (
    <PanelShell
      title="Convertir"
      description="Convierte entre formatos sin subir tu documento a ningun servidor."
      icon={<Repeat className="w-5 h-5" aria-hidden />}
      onBack={onBack}
    >
      <RadioGroup value={mode} onValueChange={(v) => setMode(v as ConvertMode)} className="flex flex-col gap-2">
        <div className="flex items-start gap-2 rounded-md border border-border/70 bg-[#141414] px-3 py-2.5">
          <RadioGroupItem value="pdf-to-images" id="conv-img" className="mt-0.5" />
          <Label htmlFor="conv-img" className="text-xs font-normal cursor-pointer">
            PDF a imagenes
            <span className="block text-[11px] text-muted-foreground">Cada pagina se convierte en PNG o JPG</span>
          </Label>
        </div>
        <div className="flex items-start gap-2 rounded-md border border-border/70 bg-[#141414] px-3 py-2.5">
          <RadioGroupItem value="pdf-to-text" id="conv-txt" className="mt-0.5" />
          <Label htmlFor="conv-txt" className="text-xs font-normal cursor-pointer">
            PDF a texto
            <span className="block text-[11px] text-muted-foreground">Extrae el texto completo a un archivo .txt</span>
          </Label>
        </div>
        <div className="flex items-start gap-2 rounded-md border border-border/70 bg-[#141414] px-3 py-2.5">
          <RadioGroupItem value="images-to-pdf" id="conv-pdf" className="mt-0.5" />
          <Label htmlFor="conv-pdf" className="text-xs font-normal cursor-pointer">
            Imagenes a PDF
            <span className="block text-[11px] text-muted-foreground">Une varias imagenes en un solo documento PDF</span>
          </Label>
        </div>
      </RadioGroup>

      {mode !== 'images-to-pdf' && (
        <FileDrop
          accept="application/pdf,.pdf"
          label="Arrastra o pulsa para elegir un PDF"
          onFiles={(fs) => void pickPdf(fs)}
        />
      )}
      {mode === 'images-to-pdf' && (
        <FileDrop
          accept="image/*"
          multiple
          label="Arrastra o pulsa para añadir imagenes"
          hint="JPG, PNG, WebP... se convierten en paginas en el orden indicado"
          onFiles={pickImages}
        />
      )}

      {mode !== 'images-to-pdf' && pdfFile && pdfPages > 0 && (
        <div className="flex items-center gap-2.5 rounded-md border border-border/70 bg-[#141414] px-3 py-2">
          <FileText className="w-4 h-4 text-violet-400 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium truncate">{pdfFile.name}</p>
            <p className="text-[10.5px] text-muted-foreground tabular-nums">
              {pdfPages} pagina{pdfPages === 1 ? '' : 's'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              setPdfFile(null)
              setPdfBytes(null)
              setPdfPages(0)
            }}
          >
            Quitar
          </Button>
        </div>
      )}

      {mode === 'images-to-pdf' && images.length > 0 && (
        <div className="rounded-md border border-border/70 bg-[#141414] px-3 py-2 space-y-1">
          <p className="text-xs font-medium">
            {images.length} imagen{images.length === 1 ? '' : 'es'} seleccionada{images.length === 1 ? '' : 's'}
          </p>
          <div className="max-h-28 overflow-y-auto editor-scrollbar space-y-0.5">
            {images.map((f, i) => (
              <div key={`${f.name}-${i}`} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="tabular-nums w-5 text-right">{i + 1}.</span>
                <span className="truncate flex-1">{f.name}</span>
                <button
                  type="button"
                  className="text-destructive hover:text-destructive shrink-0"
                  onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                  aria-label={`Quitar ${f.name}`}
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {mode === 'pdf-to-images' && (
        <div className="flex flex-wrap gap-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Formato</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as typeof format)}>
              <SelectTrigger className="h-9 w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="png" className="text-xs">PNG</SelectItem>
                <SelectItem value="jpeg" className="text-xs">JPG</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Calidad</Label>
            <Select value={scale} onValueChange={(v) => setScale(v as typeof scale)}>
              <SelectTrigger className="h-9 w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1" className="text-xs">Estandar (1x)</SelectItem>
                <SelectItem value="2" className="text-xs">Alta (2x)</SelectItem>
                <SelectItem value="3" className="text-xs">Maxima (3x)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div>
        <BusyButton
          busy={busy}
          onClick={() => void run()}
          disabled={mode === 'images-to-pdf' ? images.length === 0 : !pdfBytes}
        >
          {mode === 'pdf-to-images'
            ? 'Convertir a imagenes'
            : mode === 'pdf-to-text'
              ? 'Extraer texto'
              : 'Crear PDF'}
        </BusyButton>
      </div>
    </PanelShell>
  )
}
