'use client'

// Componentes compartidos de los paneles de Vórtex PDF.

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, UploadCloud } from 'lucide-react'

export function PanelShell({
  title,
  description,
  icon,
  children,
}: {
  title: string
  description: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section aria-label={title} className="w-full max-w-2xl rounded-xl border border-border bg-[#181818] p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="text-violet-400 mt-0.5">{icon}</div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

export function FileDrop({
  accept,
  multiple = false,
  onFiles,
  label,
  hint,
}: {
  accept: string
  multiple?: boolean
  onFiles: (files: File[]) => void
  label: string
  hint?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
      }}
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        const files = Array.from(e.dataTransfer.files ?? [])
        if (files.length) onFiles(multiple ? files : [files[0]])
      }}
      className={
        'rounded-lg border border-dashed px-6 py-7 text-center cursor-pointer transition-colors ' +
        (over ? 'border-amber-500 bg-amber-500/10' : 'border-border hover:border-amber-500/60 bg-[#141414]')
      }
    >
      <UploadCloud className="w-6 h-6 mx-auto mb-2 text-muted-foreground" aria-hidden />
      <p className="text-xs font-medium">{label}</p>
      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          if (files.length) onFiles(files)
          e.target.value = ''
        }}
      />
    </div>
  )
}

export function BusyButton({
  busy,
  children,
  onClick,
  disabled,
}: {
  busy: boolean
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <Button
      size="sm"
      className="h-9 text-xs bg-amber-500 text-black hover:bg-amber-400 gap-2"
      onClick={onClick}
      disabled={busy || disabled}
    >
      {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
      {children}
    </Button>
  )
}
