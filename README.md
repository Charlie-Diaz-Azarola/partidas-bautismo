# Partidas de Bautismo

Web: se sube una imagen de una partida de un libro de bautismos guardada en el equipo, una IA de visión lee los datos, se revisan en pantalla y se genera un documento Word a partir de una plantilla. El usuario se descarga el Word en su equipo.

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

1. **Repositorio**: `Charlie-Diaz-Azarola/partidas-bautismo`. GitHub Pages gratuito exige repositorio público; no contiene datos personales.
2. **Clave de Claude**: créala en la consola de Anthropic.
3. **Worker** (requiere Node.js y una cuenta gratuita de Cloudflare):
   ```
   cd worker
   npx wrangler login
   # edita wrangler.toml: ALLOWED_ORIGIN (ya puesto: https://charlie-diaz-azarola.github.io)
   npx wrangler secret put ANTHROPIC_API_KEY
   npx wrangler secret put ACCESS_KEY      # una contraseña que elijas
   npx wrangler deploy
   ```
4. **Web**: pon la URL del Worker en `config.js`, sube los cambios y activa GitHub Pages (Settings → Pages → rama `main`).
5. Abre la web, escribe la clave de acceso (`ACCESS_KEY`) y sube la imagen de una partida.

## Firma y sello

El Word no incluye ninguna imagen de firma ni de sello: deja el espacio en blanco. Una vez generado y corregido, el documento se imprime y se firma y sella a mano.

## Privacidad

- La foto viaja del móvil al Worker de Cloudflare, que la reenvía a la API de Claude y no la guarda. Anthropic la procesa según las condiciones de retención de datos de tu cuenta de API: conviene revisarlas, porque son datos personales de bautizados.
- El documento se genera en el navegador y solo existe en el teléfono del usuario. Si cierra la página sin descargarlo, tendrá que repetir el proceso.
- La clave de acceso impide que terceros gasten tu crédito de la API. Si se filtra, cámbiala con `npx wrangler secret put ACCESS_KEY`.

## Limitaciones

- La lectura de manuscritos antiguos no es perfecta: siempre hay una pantalla de revisión antes de generar el Word. Las palabras dudosas se marcan con `[?]`.
- Cada lectura consume crédito de la API de Claude (céntimos por foto).
