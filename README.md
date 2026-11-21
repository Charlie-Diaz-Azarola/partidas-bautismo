# Partidas de Bautismo

Web: se sube una imagen de una partida de un libro de bautismos guardada en el equipo, una IA de visión lee los datos, se revisan en pantalla y se genera un documento Word a partir de una plantilla. Antes de subir la imagen se elige el documento: **partida** (certificación) o **volante** de bautismo. El usuario se descarga el Word en su equipo.

**No se almacena nada**: ni la foto ni el documento se guardan en ningún servidor ni en el repositorio. El repositorio solo contiene código y la plantilla en blanco, por lo que puede ser público.

```
móvil ──► web (GitHub Pages) ──► Worker de Cloudflare ──► API de Claude (lee la foto)
                 └─ rellena plantilla/plantilla_partida.docx o plantilla_volante.docx en el propio navegador
```

## Estructura

| Ruta | Contenido |
|---|---|
| `index.html`, `app.js`, `style.css`, `config.js` | La web |
| `plantilla/plantilla_partida.docx` | Plantilla Word en blanco de la partida, con campos `{nombre}`, `{padre}`… |
| `plantilla/plantilla_volante.docx` | Plantilla Word en blanco del volante (modelo de la parroquia, con su escudo) |
| `worker/` | Worker de Cloudflare (guarda la clave de Claude y le reenvía la foto) |

La plantilla reproduce el impreso «Certificación de partida de bautismo» (columna izquierda con datos del archivo y notas marginales, cuerpo de certificación a la derecha). Se puede abrir y retocar en Word, conservando los campos entre llaves. No incluye el logotipo ni el número de serie del impreso preimpreso. Si cambias campos, mantén sincronizados las plantillas, `CAMPOS` en `app.js` y `CAMPOS` en `worker/worker.js`.

El volante usa la misma lectura de la foto que la partida, pero el formulario solo muestra sus campos (en `app.js`, `solo: "partida"` o `solo: "volante"` marca los campos exclusivos de cada documento). Su plantilla reproduce el modelo «Volante de Bautismo» de la parroquia. El campo `sexo` (H/M, leído de la foto y corregible) decide «D. … hijo» o «Dª. … hija» (`{tratamiento}` y `{hijo}`); si queda sin determinar, se escribe «D./Dª. … hijo/a». El volante no lleva el nombre del encargado ni notas marginales. En el volante, el texto va en un solo párrafo («Fue ministro» aparte), con las fechas de bautismo y nacimiento, «D./Dª.» y el nombre de bautizado y padres, «libro…, folio…, número….» y el ministro en negrita (no «hijo/hija» ni la fecha de expedición). El libro y el folio salen en blanco en su formulario para escribirlos a mano (`aMano` en `app.js`); el número sí se propone desde la foto.

La parroquia, la población, la diócesis, la provincia y el lugar de expedición van como texto fijo en la plantilla. El encargado del archivo y su tratamiento («D.» o «Dª.», que decide «encargado» o «encargada») aparecen en el formulario de la partida con los valores iniciales de `config.js` y se pueden cambiar antes de generar el documento. En la partida, el campo `sexo` del bautizado decide «D.»/«Dª.» y «BAUTIZADO»/«BAUTIZADA» (sin determinar: «D./Dª.» y «BAUTIZADO/A»); van en negrita el nombre y las fechas de bautismo y nacimiento. La fecha de expedición es la del día.

## Caché del navegador

`index.html` carga `style.css`, `config.js` y `app.js` con un número de versión (`app.js?v=2`). Cuando cambie alguno de esos archivos, sube el número en `index.html` (`v=3`, `v=4`…): si no, el navegador puede seguir usando la versión guardada en caché y mezclarla con un `index.html` nuevo.

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
