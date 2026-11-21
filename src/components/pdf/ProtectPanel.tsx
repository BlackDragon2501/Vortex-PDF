'use client'

// Panel "Proteger PDF": cifra el documento con contraseña (AES-256) y deja
// decidir si quien lo abra puede imprimir, copiar texto o modificarlo.

import { useState } from 'react'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Eye, EyeOff, FileText, LockKeyhole, ShieldAlert } from 'lucide-react'
import { BusyButton, FileDrop, PanelShell } from './Shared'
import { downloadBytes, formatSize, getPageCount, protectPdf, readFileBytes } from '@/lib/pdf/ops'

export function ProtectPanel({ onBack }: { onBack: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [bytes, setBytes] = useState<Uint8Array | null>(null)
  const [pages, setPages] = useState(0)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [ownerPassword, setOwnerPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [allowPrinting, setAllowPrinting] = useState(true)
  const [allowCopying, setAllowCopying] = useState(false)
  const [allowModifying, setAllowModifying] = useState(false)
  const [busy, setBusy] = useState(false)

  const valid = file !== null && password.length >= 4 && password === confirm

  const pickPdf = async (files: File[]) => {
    setBusy(true)
    try {
      const data = await readFileBytes(files[0])
      const count = await getPageCount(data)
      setFile(files[0])
      setBytes(data)
      setPages(count)
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
    if (!bytes || !file || !valid) return
    setBusy(true)
    try {
      const base = file.name.replace(/\.pdf$/i, '')
      const res = await protectPdf(bytes, base, {
        userPassword: password,
        ownerPassword: ownerPassword.trim() || undefined,
        allowPrinting,
        allowCopying,
        allowModifying,
      })
      downloadBytes(res.data, res.name)
      // Seguridad: no conservar las contraseñas en memoria tras terminar
      setPassword('')
      setConfirm('')
      setOwnerPassword('')
      toast({
        title: 'PDF protegido',
        description: `"${res.name}" se descargo cifrado con AES-256. Guarda tu contraseña: no se puede recuperar.`,
      })
    } catch (err) {
      toast({
        title: 'No se pudo proteger',
        description: err instanceof Error ? err.message : 'Intenta de nuevo.',
        variant: 'destructive',
      })
    } finally {
      setBusy(false)
    }
  }

  const permissionChecks: { id: string; label: string; hint: string; value: boolean; set: (v: boolean) => void }[] = [
    {
      id: 'perm-print',
      label: 'Permitir imprimir',
      hint: 'Quien abra el PDF podra imprimirlo',
      value: allowPrinting,
      set: setAllowPrinting,
    },
    {
      id: 'perm-copy',
      label: 'Permitir copiar texto',
      hint: 'Seleccionar y copiar contenido del documento',
      value: allowCopying,
      set: setAllowCopying,
    },
    {
      id: 'perm-modify',
      label: 'Permitir modificar',
      hint: 'Cambiar el contenido o reorganizar paginas',
      value: allowModifying,
      set: setAllowModifying,
    },
  ]

  return (
    <PanelShell
      title="Proteger PDF"
      description="Cifra tu documento con contraseña y controla sus permisos. Todo local en tu navegador."
      icon={<LockKeyhole className="w-5 h-5" aria-hidden />}
      onBack={onBack}
    >
      <FileDrop
        accept="application/pdf,.pdf"
        label="Arrastra o pulsa para elegir un PDF"
        hint="Se cifrara con el estandar AES-256 de los PDF modernos"
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
            }}
          >
            Quitar
          </Button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="prot-pass" className="text-xs">
            Contraseña para abrir
          </Label>
          <div className="relative">
            <Input
              id="prot-pass"
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimo 4 caracteres"
              autoComplete="new-password"
              className="h-9 pr-9 text-xs"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPw ? <EyeOff className="w-4 h-4" aria-hidden /> : <Eye className="w-4 h-4" aria-hidden />}
            </button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="prot-confirm" className="text-xs">
            Confirmar contraseña
          </Label>
          <Input
            id="prot-confirm"
            type={showPw ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repite la contraseña"
            autoComplete="new-password"
            className="h-9 text-xs"
            aria-invalid={confirm.length > 0 && confirm !== password}
          />
          {confirm.length > 0 && confirm !== password && (
            <p className="text-[11px] text-destructive">Las contraseñas no coinciden.</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="prot-owner" className="text-xs">
          Contraseña de propietario (opcional)
        </Label>
        <Input
          id="prot-owner"
          type={showPw ? 'text' : 'password'}
          value={ownerPassword}
          onChange={(e) => setOwnerPassword(e.target.value)}
          placeholder="Si la dejas vacia se usa la contraseña de apertura"
          autoComplete="new-password"
          className="h-9 text-xs"
        />
        <p className="text-[11px] text-muted-foreground">
          Es la que se pide para cambiar los permisos del documento.
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-xs font-medium mb-1">Permisos para quien abra con la contraseña</legend>
        {permissionChecks.map((p) => (
          <div key={p.id} className="flex items-start gap-2 rounded-md border border-border/70 bg-[#141414] px-3 py-2">
            <Checkbox id={p.id} checked={p.value} onCheckedChange={(v) => p.set(v === true)} className="mt-0.5" />
            <Label htmlFor={p.id} className="text-xs font-normal cursor-pointer">
              {p.label}
              <span className="block text-[11px] text-muted-foreground">{p.hint}</span>
            </Label>
          </div>
        ))}
        <p className="text-[11px] text-muted-foreground px-1">
          La lectura con lectores de pantalla y el relleno de formularios quedan siempre permitidos.
        </p>
      </fieldset>

      <div className="flex items-start gap-2.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" aria-hidden />
        <p className="text-[11.5px] leading-relaxed">
          Si pierdes la contraseña no hay forma de recuperarla. Guardala en un lugar seguro antes
          de proteger el documento.
        </p>
      </div>

      <div>
        <BusyButton busy={busy} onClick={() => void run()} disabled={!valid}>
          Proteger PDF
        </BusyButton>
        {!valid && file && (
          <span className="text-[11px] text-muted-foreground ml-3">
            Contraseña de al menos 4 caracteres, confirmada
          </span>
        )}
      </div>
    </PanelShell>
  )
}
