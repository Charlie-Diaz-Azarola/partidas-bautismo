"""Prepara la imagen de firma y sello para el Worker.

La imagen NO se publica en el repositorio: se reduce y se guarda como módulo
JavaScript en worker/firma_sello.js (excluido por .gitignore). El Worker la sirve
solo a quien envíe la clave de acceso.

Uso:  python tools/preparar_firma.py "ruta/a/Firma y sello.png"
"""
import base64
import io
import sys
from pathlib import Path

from PIL import Image

ANCHO = 600  # de sobra para ~3,6 cm impresos

origen = Path(sys.argv[1])
destino = Path(__file__).resolve().parent.parent / "worker" / "firma_sello.js"

img = Image.open(origen).convert("RGBA")
img = img.resize((ANCHO, round(img.height * ANCHO / img.width)), Image.LANCZOS)
buf = io.BytesIO()
img.save(buf, "PNG", optimize=True)

destino.write_text(
    "// Generado por tools/preparar_firma.py. No subir al repositorio.\n"
    f'export default "{base64.b64encode(buf.getvalue()).decode()}";\n',
    encoding="utf-8",
)
print(f"{destino} ({len(buf.getvalue()) // 1024} KB, {img.width}x{img.height})")
