# Partidas de Bautismo

Web para móvil: se fotografía una partida de un libro de bautismos, una IA de visión lee los datos, se revisan en pantalla y se genera un documento Word a partir de una plantilla. El usuario se descarga el Word en su teléfono.

**No se almacena nada**: ni la foto ni el documento se guardan en ningún servidor ni en el repositorio. El repositorio solo contiene código y la plantilla en blanco, por lo que puede ser público.

```
móvil ──► web (GitHub Pages) ──► Worker de Cloudflare ──► API de Claude (lee la foto)
                 └─ rellena plantilla/plantilla_partida.docx en el propio navegador
```

## Estructura

| Ruta | Contenido |
|---|---|
| `index.html`, `app.js`, `style.css`, `config.js` | La web |
| `plantilla/plantilla_partida.docx` | Plantilla Word en blanco con campos `{nombre}`, `{padre}`… |
| `worker/` | Worker de Cloudflare (guarda la clave de Claude y le reenvía la foto) |
| `tools/crear_plantilla.py` | Regenera la plantilla base |

La plantilla reproduce el impreso «Certificación de partida de bautismo» (columna izquierda con datos del archivo y notas marginales, cuerpo de certificación a la derecha). Se puede abrir y retocar en Word, conservando los campos entre llaves. No incluye el logotipo ni el número de serie del impreso preimpreso. Si cambias campos, mantén sincronizados `tools/crear_plantilla.py`, `CAMPOS` en `app.js` y `CAMPOS` en `worker/worker.js`.

Los datos fijos de la parroquia (población, diócesis, provincia, encargado del archivo) se rellenan una sola vez en `config.js`. La fecha de expedición es la del día.

## Puesta en marcha

1. **Repositorio**: `Charlie-Diaz-Azarola/partidas-bautismo`. GitHub Pages gratuito exige repositorio público; no contiene datos personales ni la firma y el sello (ver «Firma y sello»).
2. **Clave de Claude**: créala en la consola de Anthropic.
3. **Worker** (requiere Node.js y una cuenta gratuita de Cloudflare):
   ```
   python tools/preparar_firma.py "ruta/a/Firma y sello.png"   # crea worker/firma_sello.js (no se sube a GitHub)
   cd worker
   npx wrangler login
   # edita wrangler.toml: ALLOWED_ORIGIN (ya puesto: https://charlie-diaz-azarola.github.io)
   npx wrangler secret put ANTHROPIC_API_KEY
   npx wrangler secret put ACCESS_KEY      # una contraseña que elijas
   npx wrangler deploy
   ```
4. **Web**: pon la URL del Worker en `config.js`, sube los cambios y activa GitHub Pages (Settings → Pages → rama `main`).
5. Abre la web en el móvil, escribe la clave de acceso (`ACCESS_KEY`) y fotografía una partida.

## Firma y sello

La imagen de la firma y el sello de la parroquia **no está en el repositorio**. La plantilla pública lleva una imagen transparente de relleno; la imagen real vive solo en el Worker (`worker/firma_sello.js`, excluido por `.gitignore`) y se entrega por la ruta `/firma` únicamente a quien envíe la clave de acceso. La web la incrusta en el Word al generarlo.

- Tras clonar el repositorio en otro equipo hay que volver a ejecutar `tools/preparar_firma.py` antes de desplegar el Worker.
- Quien tenga la clave de acceso, o reciba un Word generado, puede extraer la imagen. Si la clave se filtra, cámbiala con `npx wrangler secret put ACCESS_KEY`.

## Privacidad

- La foto viaja del móvil al Worker de Cloudflare, que la reenvía a la API de Claude y no la guarda. Anthropic la procesa según las condiciones de retención de datos de tu cuenta de API: conviene revisarlas, porque son datos personales de bautizados.
- El documento se genera en el navegador y solo existe en el teléfono del usuario. Si cierra la página sin descargarlo, tendrá que repetir el proceso.
- La clave de acceso impide que terceros gasten tu crédito de la API.

## Limitaciones

- La lectura de manuscritos antiguos no es perfecta: siempre hay una pantalla de revisión antes de generar el Word. Las palabras dudosas se marcan con `[?]`.
- Cada lectura consume crédito de la API de Claude (céntimos por foto).
