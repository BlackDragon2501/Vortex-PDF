'use client'

// Vórtex PDF: aplicación de Vortex Company para trabajar con documentos PDF.
// Unir, dividir, convertir, firmar, comprimir y proteger. Todo localmente.
// Repositorio independiente desplegable en Vercel.

import { useState } from 'react'
import { LegalFooter, VortexLogo } from '../editor/Branding'
import { Button } from '@/components/ui/button'
import { ArrowLeft, FileArchive, FileText, LockKeyhole, Merge, PenTool, Repeat, Split } from 'lucide-react'
import { MergePanel } from './MergePanel'
import { SplitPanel } from './SplitPanel'
import { ConvertPanel } from './ConvertPanel'
import { SignPanel } from './SignPanel'
import { CompressPanel } from './CompressPanel'
import { ProtectPanel } from './ProtectPanel'

type PdfTool = 'merge' | 'split' | 'convert' | 'sign' | 'compress' | 'protect' | null

const TOOL_CARDS: {
  id: Exclude<PdfTool, null>
  title: string
  description: string
  icon: React.ReactNode
}[] = [
  {
    id: 'merge',
    title: 'Unir PDF',
    description: 'Combina varios PDF en un solo documento, en el orden que elijas.',
    icon: <Merge className="w-5 h-5" aria-hidden />,
  },
  {
    id: 'split',
    title: 'Dividir PDF',
    description: 'Extrae paginas por rangos o separa el documento pagina a pagina.',
    icon: <Split className="w-5 h-5" aria-hidden />,
  },
  {
    id: 'convert',
    title: 'Convertir',
    description: 'PDF a imagenes o texto; imagenes a PDF. Sin subir nada a internet.',
    icon: <Repeat className="w-5 h-5" aria-hidden />,
  },
  {
    id: 'sign',
    title: 'Firmar PDF',
    description: 'Dibuja tu firma y colocala en cualquier pagina del documento.',
    icon: <PenTool className="w-5 h-5" aria-hidden />,
  },
  {
    id: 'compress',
    title: 'Comprimir PDF',
    description: 'Reduce el peso del documento sin perder calidad, con limpieza de metadatos.',
    icon: <FileArchive className="w-5 h-5" aria-hidden />,
  },
  {
    id: 'protect',
    title: 'Proteger PDF',
    description: 'Cifra con contraseña (AES-256) y decide si se puede imprimir, copiar o modificar.',
    icon: <LockKeyhole className="w-5 h-5" aria-hidden />,
  },
]

export function PdfApp() {
  const [tool, setTool] = useState<PdfTool>(null)

  const backToTools = () => setTool(null)

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#121212] text-foreground">
      <header className="border-b border-border bg-[#1c1c1c] px-3 md:px-4 h-10 flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <VortexLogo className="w-5 h-5" />
          <span className="text-xs font-semibold tracking-wide">
            <span className="text-violet-400">Vórtex</span> PDF
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground hidden sm:inline ml-2">
          Unir · Dividir · Convertir · Firmar · Comprimir · Proteger — 100% local en tu navegador
        </span>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 md:px-6 py-10 flex flex-col items-center">
        {tool === null ? (
          <>
            <div className="flex flex-col items-center text-center gap-3 mb-8">
              <VortexLogo className="w-12 h-12" />
              <h1 className="text-xl font-bold">
                <span className="text-violet-400">Vórtex</span> PDF
              </h1>
              <p className="text-sm text-muted-foreground max-w-md">
                Herramientas profesionales para tus documentos PDF. Elige una herramienta para comenzar:
                tus archivos nunca salen de tu navegador.
              </p>
            </div>
            <section aria-label="Herramientas de PDF" className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
              {TOOL_CARDS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTool(t.id)}
                  className="text-left rounded-xl border border-border bg-[#181818] p-5 flex flex-col gap-2 hover:border-amber-500/50 transition-colors"
                >
                  <div className="flex items-center gap-2.5 text-violet-400">
                    {t.icon}
                    <span className="text-sm font-semibold text-foreground">{t.title}</span>
                  </div>
                  <p className="text-[12.5px] leading-relaxed text-muted-foreground">{t.description}</p>
                  <span className="text-xs font-semibold text-amber-500 hover:text-amber-400 mt-auto">
                    Usar herramienta →
                  </span>
                </button>
              ))}
            </section>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="self-start h-8 px-2.5 -ml-2 mb-3 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={backToTools}
            >
              <ArrowLeft className="w-4 h-4" aria-hidden />
              Volver a las herramientas
            </Button>
            {tool === 'merge' && <MergePanel />}
            {tool === 'split' && <SplitPanel />}
            {tool === 'convert' && <ConvertPanel />}
            {tool === 'sign' && <SignPanel />}
            {tool === 'compress' && <CompressPanel />}
            {tool === 'protect' && <ProtectPanel />}
            <p className="text-[11px] text-muted-foreground mt-6 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" aria-hidden />
              Vórtex PDF procesa tus documentos localmente; no se suben copias a ningún servidor.
            </p>
          </>
        )}
      </main>

      <LegalFooter product="pdf" />
    </div>
  )
}
