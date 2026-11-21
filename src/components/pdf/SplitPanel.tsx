'use client'

// Panel "Dividir PDF": extraer rangos de paginas o separar todas las paginas.

import { useState } from 'react'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { FileText, Split } from 'lucide-react'
import { BusyButton, FileDrop, PanelShell } from './Shared'
import {
  downloadBytes,
  formatSize,
  getPageCount,
  readFileBytes,
  splitByRanges,
  splitEveryPage,
  zipFiles,
  type NamedBytes,
} from '@/lib/pdf/ops'

export function SplitPanel() {
  const [file, setFile] = useState<File | null>(null)
  const [bytes, setBytes] = useState<Uint8Array | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [mode, setMode] = useState<'ranges' | 'each'>('ranges')
  const [ranges, setRanges] = useState('')
  const [busy, setBusy] = useState(false)

  const pick = async (files: File[]) => {
    const f = files[0]
    setBusy(true)
    try {
      const data = await readFileBytes(f)
      const count = await getPageCount(data)
      setFile(f)
      setBytes(data)
      setPageCount(count)
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

  const run = async () => {
    if (!bytes || !file) return
    setBusy(true)
    try {
      let results: NamedBytes[]
      if (mode === 'ranges') {
        results = await splitByRanges(bytes, ranges, file.name.replace(/\.pdf$/i, ''))
      } else {
        results = await splitEveryPage(bytes, file.name.replace(/\.pdf$/i, ''))
      }
      if (results.length === 1) {
        downloadBytes(results[0].data, results[0].name)
        toast({ title: 'PDF dividido', description: `Se descargo "${results[0].name}".` })
      } else {
        const zip = zipFiles(results)
        downloadBytes(zip, 'vortex-pdf-division.zip')
        toast({
          title: 'PDF dividido',
          description: `Se generaron ${results.length} archivos y se descargaron como "vortex-pdf-division.zip".`,
        })
      }
    } catch (err) {
      toast({
        title: 'No se pudo dividir',
        description: err instanceof Error ? err.message : 'Intenta de nuevo.',
        variant: 'destructive',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <PanelShell
      title="Dividir PDF"
      description="Extrae un rango de paginas en un PDF nuevo o separa el documento pagina a pagina."
      icon={<Split className="w-5 h-5" aria-hidden />}
    >
      <FileDrop
        accept="application/pdf,.pdf"
        label="Arrastra o pulsa para elegir un PDF"
        onFiles={(fs) => void pick(fs)}
      />

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
              }}
            >
              Quitar
            </Button>
          </div>

          <RadioGroup value={mode} onValueChange={(v) => setMode(v as typeof mode)} className="flex flex-col gap-2">
            <div className="flex items-start gap-2 rounded-md border border-border/70 bg-[#141414] px-3 py-2.5">
              <RadioGroupItem value="ranges" id="mode-ranges" className="mt-0.5" />
              <Label htmlFor="mode-ranges" className="text-xs font-normal cursor-pointer">
                Extraer paginas por rangos
                <span className="block text-[11px] text-muted-foreground">
                  Crea un PDF nuevo con las paginas indicadas (ejemplo: 1-3, 5)
                </span>
              </Label>
            </div>
            <div className="flex items-start gap-2 rounded-md border border-border/70 bg-[#141414] px-3 py-2.5">
              <RadioGroupItem value="each" id="mode-each" className="mt-0.5" />
              <Label htmlFor="mode-each" className="text-xs font-normal cursor-pointer">
                Separar todas las paginas
                <span className="block text-[11px] text-muted-foreground">
                  Genera un PDF por pagina y los descarga en un ZIP
                </span>
              </Label>
            </div>
          </RadioGroup>

          {mode === 'ranges' && (
            <div className="space-y-1">
              <Label htmlFor="ranges-input" className="text-xs text-muted-foreground">
                Paginas a extraer (1-{pageCount})
              </Label>
              <Input
                id="ranges-input"
                value={ranges}
                onChange={(e) => setRanges(e.target.value)}
                placeholder="1-3, 5, 8-10"
                className="h-9 text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Varios rangos separados por comas crean varios archivos.
              </p>
            </div>
          )}

          <div>
            <BusyButton busy={busy} onClick={() => void run()}>
              {mode === 'ranges' ? 'Extraer paginas' : 'Separar en paginas'}
            </BusyButton>
          </div>
        </>
      )}
    </PanelShell>
  )
}
