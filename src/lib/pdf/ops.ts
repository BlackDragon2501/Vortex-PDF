// Operaciones de PDF de Vórtex PDF (Vortex Company).
// Todo el procesamiento ocurre localmente en el navegador del usuario:
// pdf-lib para manipular documentos y pdf.js para renderizar paginas.
// Ningun archivo se sube a servidor alguno.

import { PDFDocument, PDFName } from 'pdf-lib'
import { PDFDocument as CryptoPDFDocument } from '@cantoo/pdf-lib'
import { zipSync } from 'fflate'

export interface NamedBytes {
  name: string
  data: Uint8Array
}

// ---------- utilidades ----------

export function readFileBytes(file: File): Promise<Uint8Array> {
  return file.arrayBuffer().then((buf) => new Uint8Array(buf))
}

export function formatSize(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

function baseName(name: string): string {
  return name.replace(/\.pdf$/i, '').replace(/[^\w\-áéíóúñÁÉÍÓÚÑ ]+/g, '').trim() || 'documento'
}

/** Descarga bytes (PDF, ZIP, TXT...) al equipo del usuario */
export function downloadBytes(data: Uint8Array | Blob, filename: string): void {
  const blob = data instanceof Blob ? data : new Blob([data as BlobPart], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

/** Empaqueta varios archivos en un ZIP y devuelve el blob */
export function zipFiles(files: NamedBytes[]): Blob {
  const map: Record<string, Uint8Array> = {}
  for (const f of files) {
    let key = f.name
    let i = 2
    while (map[key]) key = f.name.replace(/(\.\w+)?$/, `-${i++}$1`)
    map[key] = f.data
  }
  const zipped = zipSync(map, { level: 6 })
  return new Blob([zipped as BlobPart], { type: 'application/zip' })
}

async function loadPdfLib(bytes: Uint8Array): Promise<PDFDocument> {
  let doc: PDFDocument
  try {
    doc = await PDFDocument.load(bytes, { ignoreEncryption: true, throwOnInvalidObject: false })
  } catch {
    throw new Error('El archivo no es un PDF valido o esta danado.')
  }
  // pdf-lib no puede descifrar el contenido de un PDF cifrado: si se deja pasar,
  // las herramientas produciran archivos corruptos. Rechazamos con un mensaje claro.
  if (doc.isEncrypted) {
    throw new Error('Este PDF esta protegido con contraseña. Quita la proteccion antes de usarlo aqui.')
  }
  return doc
}

export async function getPageCount(bytes: Uint8Array): Promise<number> {
  const doc = await loadPdfLib(bytes)
  return doc.getPageCount()
}

// ---------- pdf.js (renderizado) ----------

let pdfjsReady: Promise<typeof import('pdfjs-dist')> | null = null

/** Carga pdf.js una sola vez con el worker local (sin CDN) */
async function getPdfjs(): Promise<typeof import('pdfjs-dist')> {
  if (!pdfjsReady) {
    pdfjsReady = import('pdfjs-dist').then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
      return pdfjs
    })
  }
  return pdfjsReady
}

export interface RenderedPage {
  canvas: HTMLCanvasElement
  /** dimensiones de la pagina en puntos PDF (72 ppp) */
  widthPt: number
  heightPt: number
}

/** Renderiza una pagina (indice 0-based) a un canvas con el ancho indicado en px */
export async function renderPdfPage(bytes: Uint8Array, pageIndex: number, maxWidth = 480): Promise<RenderedPage> {
  const pdfjs = await getPdfjs()
  const doc = await pdfjs.getDocument({ data: bytes.slice() }).promise
  if (pageIndex < 0 || pageIndex >= doc.numPages) throw new Error('El numero de pagina no existe en el documento.')
  const page = await doc.getPage(pageIndex + 1)
  const base = page.getViewport({ scale: 1 })
  const scale = Math.max(0.2, maxWidth / base.width)
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.floor(viewport.width))
  canvas.height = Math.max(1, Math.floor(viewport.height))
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  await page.render({ canvasContext: ctx, viewport }).promise
  return { canvas, widthPt: base.width, heightPt: base.height }
}

// ---------- UNIR ----------

/** Une varios PDF en uno solo, en el orden indicado */
export async function mergePdfs(files: File[]): Promise<NamedBytes> {
  if (files.length < 2) throw new Error('Selecciona al menos dos PDF para unirlos.')
  const out = await PDFDocument.create()
  let total = 0
  for (const file of files) {
    const bytes = await readFileBytes(file)
    const src = await loadPdfLib(bytes)
    const pages = await out.copyPages(src, src.getPageIndices())
    pages.forEach((p) => out.addPage(p))
    total += pages.length
  }
  if (total === 0) throw new Error('Los PDF seleccionados no contienen paginas.')
  const data = await out.save()
  return { name: 'vortex-pdf-unido.pdf', data }
}

// ---------- DIVIDIR ----------

/**
 * Interpreta una especificacion de rangos tipo "1-3, 5, 8-10".
 * Devuelve grupos de indices 0-based; valida contra el numero de paginas.
 */
export function parseRanges(spec: string, pageCount: number): number[][] {
  const cleaned = spec.trim()
  if (!cleaned) throw new Error('Escribe los rangos de paginas, por ejemplo: 1-3, 5')
  const groups = cleaned
    .split(',')
    .map((g) => g.trim())
    .filter(Boolean)
  if (!groups.length) throw new Error('Escribe los rangos de paginas, por ejemplo: 1-3, 5')
  const out: number[][] = []
  for (const g of groups) {
    const m = g.match(/^(\d+)(?:\s*-\s*(\d+))?$/)
    if (!m) throw new Error(`Rango invalido: "${g}". Usa numeros o intervalos como 2-5.`)
    const a = Number(m[1])
    const b = m[2] === undefined ? a : Number(m[2])
    if (a < 1 || b < 1 || a > pageCount || b > pageCount) {
      throw new Error(`El rango "${g}" esta fuera del documento (1-${pageCount}).`)
    }
    const lo = Math.min(a, b)
    const hi = Math.max(a, b)
    const pages: number[] = []
    for (let i = lo; i <= hi; i++) pages.push(i - 1)
    out.push(pages)
  }
  return out
}

/** Divide el PDF en varios archivos segun los rangos indicados */
export async function splitByRanges(bytes: Uint8Array, spec: string, baseName: string): Promise<NamedBytes[]> {
  const src = await loadPdfLib(bytes)
  const groups = parseRanges(spec, src.getPageCount())
  const out: NamedBytes[] = []
  for (let gi = 0; gi < groups.length; gi++) {
    const doc = await PDFDocument.create()
    const pages = await doc.copyPages(src, groups[gi])
    pages.forEach((p) => doc.addPage(p))
    const data = await doc.save()
    out.push({ name: `${baseName}-paginas-${groups[gi][0] + 1}-${groups[gi][groups[gi].length - 1] + 1}.pdf`, data })
  }
  return out
}

/** Separa cada pagina en un PDF independiente */
export async function splitEveryPage(bytes: Uint8Array, baseName: string): Promise<NamedBytes[]> {
  const src = await loadPdfLib(bytes)
  const out: NamedBytes[] = []
  for (let i = 0; i < src.getPageCount(); i++) {
    const doc = await PDFDocument.create()
    const pages = await doc.copyPages(src, [i])
    pages.forEach((p) => doc.addPage(p))
    const data = await doc.save()
    out.push({ name: `${baseName}-pagina-${i + 1}.pdf`, data })
  }
  return out
}

// ---------- CONVERTIR ----------

/** Convierte imagenes (JPG/PNG u otras via canvas) en un unico PDF */
export async function imagesToPdf(files: File[]): Promise<NamedBytes> {
  if (!files.length) throw new Error('Selecciona al menos una imagen.')
  const doc = await PDFDocument.create()
  for (const file of files) {
    const type = file.type
    if (type === 'image/jpeg') {
      const img = await doc.embedJpg(await readFileBytes(file))
      const page = doc.addPage([img.width, img.height])
      page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height })
    } else if (type === 'image/png') {
      const img = await doc.embedPng(await readFileBytes(file))
      const page = doc.addPage([img.width, img.height])
      page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height })
    } else {
      // webp, gif, bmp...: convertir a PNG via canvas
      const url = URL.createObjectURL(file)
      try {
        const img = new Image()
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve()
          img.onerror = () => reject(new Error(`No se pudo leer la imagen "${file.name}".`))
          img.src = url
        })
        const c = document.createElement('canvas')
        c.width = Math.max(1, img.naturalWidth)
        c.height = Math.max(1, img.naturalHeight)
        c.getContext('2d')!.drawImage(img, 0, 0)
        const pngBytes = new Uint8Array(await (await fetch(c.toDataURL('image/png'))).arrayBuffer())
        const embedded = await doc.embedPng(pngBytes)
        const page = doc.addPage([embedded.width, embedded.height])
        page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height })
      } finally {
        URL.revokeObjectURL(url)
      }
    }
  }
  const data = await doc.save()
  return { name: 'vortex-pdf-imagenes.pdf', data }
}

/** Renderiza una pagina pdf.js a bytes de imagen (fondo blanco, sin transparencia) */
async function renderPageToImageData(
  page: import('pdfjs-dist').PDFPageProxy,
  scale: number,
  mime: 'image/png' | 'image/jpeg',
  quality?: number
): Promise<Uint8Array> {
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.floor(viewport.width))
  canvas.height = Math.max(1, Math.floor(viewport.height))
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  await page.render({ canvasContext: ctx, viewport }).promise
  const dataUrl = canvas.toDataURL(mime, quality)
  return new Uint8Array(await (await fetch(dataUrl)).arrayBuffer())
}

/** Convierte cada pagina del PDF en una imagen PNG o JPEG */
export async function pdfToImages(
  bytes: Uint8Array,
  format: 'png' | 'jpeg',
  baseName: string,
  scale = 2
): Promise<NamedBytes[]> {
  const pdfjs = await getPdfjs()
  const doc = await pdfjs.getDocument({ data: bytes.slice() }).promise
  const out: NamedBytes[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const data = await renderPageToImageData(page, scale, format === 'png' ? 'image/png' : 'image/jpeg', 0.92)
    out.push({ name: `${baseName}-pagina-${i}.${format === 'png' ? 'png' : 'jpg'}`, data })
  }
  return out
}

/** Extrae el texto de todas las paginas del PDF */
export async function pdfToText(bytes: Uint8Array, baseName: string): Promise<NamedBytes> {
  const pdfjs = await getPdfjs()
  const doc = await pdfjs.getDocument({ data: bytes.slice() }).promise
  const parts: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    const line = content.items
      .map((it) => ('str' in it ? it.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    parts.push(`--- Pagina ${i} ---\n${line}\n`)
  }
  const encoder = new TextEncoder()
  return { name: `${baseName}-texto.txt`, data: encoder.encode(parts.join('\n')) }
}

// ---------- FIRMAR ----------

/** Dibuja una firma PNG sobre la pagina indicada. Coordenadas en puntos PDF; yTop desde el borde superior. */
export async function signPdf(
  bytes: Uint8Array,
  signaturePng: Uint8Array,
  pageIndex: number,
  opts: { xPt: number; yTopPt: number; widthPt: number; opacity?: number }
): Promise<NamedBytes> {
  const doc = await loadPdfLib(bytes)
  if (pageIndex < 0 || pageIndex >= doc.getPageCount()) throw new Error('El numero de pagina no existe en el documento.')
  const page = doc.getPage(pageIndex)
  const img = await doc.embedPng(signaturePng)
  const heightPt = (img.height / img.width) * opts.widthPt
  const y = page.getHeight() - opts.yTopPt - heightPt
  page.drawImage(img, {
    x: opts.xPt,
    y,
    width: opts.widthPt,
    height: heightPt,
    opacity: opts.opacity ?? 1,
  })
  const data = await doc.save()
  return { name: 'vortex-pdf-firmado.pdf', data }
}

/** Convierte el canvas de firma a bytes PNG */
export async function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const dataUrl = canvas.toDataURL('image/png')
  return new Uint8Array(await (await fetch(dataUrl)).arrayBuffer())
}

// ---------- COMPRIMIR ----------

/**
 * Compresion SIN perdida de calidad: reorganiza la estructura interna del PDF
 * en "object streams" (mas compactos) y opcionalmente elimina metadatos.
 * El contenido visual y las imagenes no se tocan.
 */
export async function compressPdfLossless(
  bytes: Uint8Array,
  base: string,
  opts: { stripMetadata: boolean }
): Promise<NamedBytes> {
  const doc = await loadPdfLib(bytes)
  if (opts.stripMetadata) stripMetadata(doc)
  const data = await doc.save({ useObjectStreams: true })
  return { name: `${base}-comprimido.pdf`, data }
}

/**
 * Compresion maxima: vuelve a crear cada pagina como imagen JPEG optimizada,
 * respetando el tamaño original de la pagina en puntos. Reduce mucho mas que
 * la compresion sin perdida, con una perdida visual ligera y controlada.
 */
export async function compressPdfRaster(bytes: Uint8Array, base: string, quality: number): Promise<NamedBytes> {
  const pdfjs = await getPdfjs()
  const src = await pdfjs.getDocument({ data: bytes.slice() }).promise
  const out = await PDFDocument.create()
  for (let i = 1; i <= src.numPages; i++) {
    const page = await src.getPage(i)
    const dims = page.getViewport({ scale: 1 })
    const jpg = await renderPageToImageData(page, 2, 'image/jpeg', quality)
    const img = await out.embedJpg(jpg)
    const outPage = out.addPage([dims.width, dims.height])
    outPage.drawImage(img, { x: 0, y: 0, width: dims.width, height: dims.height })
  }
  const data = await out.save({ useObjectStreams: true })
  return { name: `${base}-comprimido.pdf`, data }
}

/** Elimina XMP y vacia el diccionario de informacion (autor, software, fechas...) */
function stripMetadata(doc: PDFDocument): void {
  try {
    doc.catalog.delete(PDFName.of('Metadata'))
  } catch {
    // el PDF no tenia metadatos XMP
  }
  doc.setTitle('')
  doc.setAuthor('')
  doc.setSubject('')
  doc.setKeywords([])
  doc.setProducer('')
  doc.setCreator('')
}

// ---------- PROTEGER ----------

export interface ProtectOptions {
  /** Contraseña para abrir el documento */
  userPassword: string
  /** Contraseña de propietario (cambiar permisos). Si se omite, se usa la de usuario. */
  ownerPassword?: string
  allowPrinting: boolean
  allowCopying: boolean
  allowModifying: boolean
}

/**
 * Cifra el PDF con AES-256 (estandar revision 6) y aplica permisos.
 * La lectura de accesibilidad (lectores de pantalla) y el relleno de formularios
 * se dejan siempre permitidos.
 */
export async function protectPdf(bytes: Uint8Array, base: string, opts: ProtectOptions): Promise<NamedBytes> {
  let doc: CryptoPDFDocument
  try {
    doc = await CryptoPDFDocument.load(bytes, { ignoreEncryption: true, throwOnInvalidObject: false })
  } catch {
    throw new Error('El archivo no es un PDF valido o esta danado.')
  }
  if (doc.isEncrypted) {
    throw new Error('Este PDF ya esta protegido con contraseña. Vórtex PDF no duplica protecciones.')
  }
  doc.encrypt({
    userPassword: opts.userPassword,
    ownerPassword: opts.ownerPassword?.trim() ? opts.ownerPassword.trim() : opts.userPassword,
    permissions: {
      printing: opts.allowPrinting ? 'highResolution' : false,
      copying: opts.allowCopying,
      modifying: opts.allowModifying,
      annotating: opts.allowModifying,
      fillingForms: true,
      contentAccessibility: true,
      documentAssembly: opts.allowModifying,
    },
    algorithm: 'AES-256',
  })
  const data = await doc.save()
  return { name: `${base}-protegido.pdf`, data }
}

export { baseName }
