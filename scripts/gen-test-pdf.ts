// Genera archivos de prueba para verificar Vórtex PDF en el navegador.
// Uso: bun scripts/gen-test-pdf.ts
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { writeFileSync } from 'node:fs'

async function makeDoc(name: string, pages: number, color: [number, number, number]) {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.HelveticaBold)
  for (let i = 1; i <= pages; i++) {
    const page = doc.addPage([420, 300])
    page.drawRectangle({ x: 0, y: 0, width: 420, height: 300, color: rgb(1, 1, 1) })
    page.drawText(`Vortex Test: ${name}`, { x: 40, y: 200, size: 20, font, color: rgb(color[0], color[1], color[2]) })
    page.drawText(`Pagina ${i} de ${pages}`, { x: 40, y: 160, size: 14, font, color: rgb(0.2, 0.2, 0.2) })
  }
  const bytes = await doc.save()
  writeFileSync(`/tmp/pdftest/${name}.pdf`, bytes)
  console.log(name, 'pages:', pages, 'bytes:', bytes.length)
}

await makeDoc('test1', 3, [0.45, 0.2, 0.9])
await makeDoc('test2', 2, [0.9, 0.55, 0.1])
console.log('listo')
