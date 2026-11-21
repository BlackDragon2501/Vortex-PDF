'use client'

// Panel "Unir PDF": combina varios PDF en un solo documento.

import { useState } from 'react'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp, FileText, Merge, X } from 'lucide-react'
import { BusyButton, FileDrop, PanelShell } from './Shared'
import { downloadBytes, formatSize, mergePdfs } from '@/lib/pdf/ops'

export function MergePanel() {
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= files.length) return
    const next = [...files]
    ;[next[i], next[j]] = [next[j], next[i]]
    setFiles(next)
  }

  const run = async () => {
    setBusy(true)
    try {
      const result = await mergePdfs(files)
      downloadBytes(result.data, result.name)
      toast({ title: 'PDF unido', description: `"${result.name}" se descargo con todos los documentos combinados.` })
    } catch (err) {
      toast({
        title: 'No se pudo unir',
        description: err instanceof Error ? err.message : 'Intenta de nuevo.',
        variant: 'destructive',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <PanelShell
      title="Unir PDF"
      description="Combina varios PDF en un solo documento, en el orden que elijas. Todo se procesa en tu navegador."
      icon={<Merge className="w-5 h-5" aria-hidden />}
    >
      <FileDrop
        accept="application/pdf,.pdf"
        multiple
        label="Arrastra o pulsa para añadir PDF"
        hint="Puedes añadir varios archivos y ordenarlos"
        onFiles={(added) => setFiles((prev) => [...prev, ...added])}
      />

      {files.length > 0 && (
        <ul className="space-y-1.5" aria-label="Archivos a unir">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center gap-2.5 rounded-md border border-border/70 bg-[#141414] px-3 py-2"
            >
              <FileText className="w-4 h-4 text-violet-400 shrink-0" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">{f.name}</p>
                <p className="text-[10.5px] text-muted-foreground tabular-nums">{formatSize(f.size)}</p>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label={`Subir ${f.name}`}
                >
                  <ChevronUp className="w-3.5 h-3.5" aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => move(i, 1)}
                  disabled={i === files.length - 1}
                  aria-label={`Bajar ${f.name}`}
                >
                  <ChevronDown className="w-3.5 h-3.5" aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                  onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                  aria-label={`Quitar ${f.name}`}
                >
                  <X className="w-3.5 h-3.5" aria-hidden />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-3">
        <BusyButton busy={busy} onClick={() => void run()} disabled={files.length < 2}>
          Unir {files.length > 1 ? `${files.length} PDF` : 'PDF'}
        </BusyButton>
        {files.length > 0 && (
          <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={() => setFiles([])}>
            Vaciar lista
          </Button>
        )}
        <span className="text-[11px] text-muted-foreground ml-auto">Necesitas al menos 2 PDF</span>
      </div>
    </PanelShell>
  )
}
