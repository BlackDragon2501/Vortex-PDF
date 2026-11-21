# Verificacion independiente con pypdf de los archivos generados por test-new-tools.ts
from pypdf import PdfReader

# --- comprimido: intacto y con metadatos vacios ---
r = PdfReader('/tmp/pdftest/comprimido.pdf')
assert len(r.pages) == 12, f"paginas: {len(r.pages)}"
meta = dict(r.metadata or {})
print('comprimido OK: 12 paginas, metadata:', meta)
txt = r.pages[0].extract_text()
assert 'Pagina 1' in txt, 'texto perdido tras comprimir'
print('texto pagina 1 OK:', txt.splitlines()[0])

# --- protegido: pide contraseña y acepta la correcta ---
p = PdfReader('/tmp/pdftest/protegido.pdf')
print('protegido is_encrypted:', p.is_encrypted)
assert p.is_encrypted
res = p.decrypt('vortex2026')
print('decrypt correcta:', res)
assert len(p.pages) == 12
t = p.pages[3].extract_text()
assert 'Pagina 4' in t, 'contenido no legible tras descifrar'
print('contenido descifrado OK:', t.splitlines()[0])
enc = p.trailer['/Encrypt'].get_object()
print('filtro:', enc.get('/Filter'), '| V:', enc.get('/V'), '| R:', enc.get('/R'), '| P:', enc.get('/P'))

# --- contraseña incorrecta debe fallar ---
p2 = PdfReader('/tmp/pdftest/protegido.pdf')
res2 = p2.decrypt('contrasena-mala')
print('decrypt incorrecta:', res2, '(0 = rechazada)')
assert int(res2) == 0, 'la contraseña incorrecta fue aceptada!'

print('VERIFICACION COMPLETA: TODO OK')
