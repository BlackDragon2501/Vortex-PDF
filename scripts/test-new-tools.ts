// Verifica las nuevas operaciones de Vórtex PDF: compresion sin perdida y proteccion.
// Uso: bun scripts/test-new-tools.ts   (luego: python3 scripts/verify-new-tools.py)
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { compressPdfLossless, protectPdf } from '../src/lib/pdf/ops'

mkdirSync('/tmp/pdftest', { recursive: true })

// --- PDF de prueba: 12 paginas de texto, sin object streams, con metadatos ---
async function makeSource(): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  doc.setTitle('Documento de prueba con metadatos')
  doc.setAuthor('Vortex Tester')
  doc.setSubject('QA de Vórtex PDF')
  doc.setProducer('Generador de prueba')
  doc.setCreator('Vórtex QA')
  for (let i = 1; i <= 12; i++) {
    const page = doc.addPage([420, 300])
    page.drawRectangle({ x: 0, y: 0, width: 420, height: 300, color: rgb(1, 1, 1) })
    page.drawText(`Pagina ${i}: contenido de prueba de Vórtex PDF`, {
      x: 30, y: 270, size: 12, font, color: rgb(0.25, 0.1, 0.45),
    })
    for (let l = 0; l < 8; l++) {
      page.drawText(
        `Linea ${l} con texto repetido y compresible para generar contenido de prueba en la pagina ${i}`,
        { x: 30, y: 240 - l * 24, size: 10, font, color: rgb(0.2, 0.2, 0.2) }
      )
    }
  }
  return doc.save({ useObjectStreams: false })
}

const src = await makeSource()
writeFileSync('/tmp/pdftest/source.pdf', src)
console.log('original:', src.length, 'bytes')

// --- 1) compresion sin perdida ---
const comp = await compressPdfLossless(src, 'prueba', { stripMetadata: true })
writeFileSync('/tmp/pdftest/comprimido.pdf', comp.data)
const savedPct = (((src.length - comp.data.length) / src.length) * 100).toFixed(1)
console.log('comprimido:', comp.data.length, `bytes (${savedPct}% menos)`)

// --- 2) proteccion con contraseña (AES-256) ---
const prot = await protectPdf(src, 'prueba', {
  userPassword: 'vortex2026',
  allowPrinting: true,
  allowCopying: false,
  allowModifying: false,
})
writeFileSync('/tmp/pdftest/protegido.pdf', prot.data)
console.log('protegido:', prot.data.length, 'bytes')

// --- 3) los PDF resultantes deben abrirse correctamente con pdf-lib tambien ---
const reopenComp = await PDFDocument.load(comp.data)
console.log('reabrir comprimido: paginas', reopenComp.getPageCount())
const reopenProt = await PDFDocument.load(prot.data, { ignoreEncryption: true })
console.log('reabrir protegido: isEncrypted =', reopenProt.isEncrypted)

console.log('listo')
