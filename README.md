# Partidas de Bautismo

Web: se sube la imagen escaneada de una partida de un libro de bautismos, guardada previamente en el equipo, una IA de visión lee los datos, se revisan en pantalla y se genera un documento Word a partir de una plantilla. Antes de subir la imagen se elige el documento: **partida** (certificación) o **volante** de bautismo. El usuario se descarga el Word en su equipo.

**No se almacena nada**: ni la imagen ni el documento se guardan en ningún servidor ni en el repositorio. El repositorio solo contiene código y la plantilla en blanco, por lo que puede ser público.

```
equipo ──► web (GitHub Pages) ──► Worker de Cloudflare ──► API de Claude (lee la imagen)
                  └─ rellena plantilla/plantilla_partida.docx o plantilla_volante.docx en el propio navegador
```

## Estructura

| Ruta | Contenido |
|---|---|
| `index.html`, `app.js`, `style.css`, `config.js` | La web |
| `plantilla/plantilla_partida.docx` | Plantilla Word en blanco de la partida, con campos `{nombre}`, `{padre}`… |
| `plantilla/plantilla_volante.docx` | Plantilla Word en blanco del volante (modelo de la parroquia, con su escudo) |
| `worker/` | Worker de Cloudflare (guarda la clave de Claude y le reenvía la imagen) |

La plantilla reproduce el impreso «Certificación de partida de bautismo» (columna izquierda con datos del archivo y notas marginales, cuerpo de certificación a la derecha). Se puede abrir y retocar en Word, conservando los campos entre llaves. No incluye el logotipo ni el número de serie del impreso preimpreso. Si cambias campos, mantén sincronizados las plantillas, `CAMPOS` en `app.js` y `CAMPOS` en `worker/worker.js`.

El volante usa la misma lectura de la imagen que la partida, pero el formulario solo muestra sus campos (en `app.js`, `solo: "partida"` o `solo: "volante"` marca los campos exclusivos de cada documento). Su plantilla reproduce el modelo «Volante de Bautismo» de la parroquia. El campo `sexo` (H/M, leído de la imagen y corregible) decide «D. … hijo» o «Dª. … hija» (`{tratamiento}` y `{hijo}`); si queda sin determinar, se escribe «D./Dª. … hijo/a». El volante no lleva el nombre del encargado ni notas marginales. En el volante, el texto va en un solo párrafo («Fue ministro» aparte), con las fechas de bautismo y nacimiento, «D./Dª.» y el nombre de bautizado y padres, «libro…, folio…, número….» y el ministro en negrita (no «hijo/hija» ni la fecha de expedición). El libro y el folio salen en blanco en su formulario para escribirlos a mano (`aMano` en `app.js`); el número sí se propone desde la imagen.

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

Las partidas contienen datos personales y el bautismo revela una creencia religiosa, que es una categoría especial de datos (art. 9 del RGPD). Se aplican el RGPD, la LOPDGDD y el Decreto General de la Conferencia Episcopal Española sobre protección de datos (2018). La parroquia es la responsable del tratamiento; Anthropic y Cloudflare actúan como encargados.

### Recorrido de los datos

- La imagen viaja del equipo del usuario al Worker de Cloudflare, que la reenvía a la API de Claude y no la guarda. El Worker no escribe registros (no hay `console.log`) y `wrangler.toml` no activa Workers Logs.
- GitHub Pages solo sirve el código de la web: no recibe imágenes ni datos.
- El documento se genera en el navegador y solo existe en el equipo del usuario. Si cierra la página sin descargarlo, tendrá que repetir el proceso.

### Anthropic (API de Claude)

- El contrato de encargo (DPA), con cláusulas contractuales tipo de la UE, queda incluido al aceptar las Commercial Terms. Anthropic actúa como encargado y, para clientes del Espacio Económico Europeo, la empresa contratante es Anthropic Ireland.
- No entrena modelos con los datos enviados.
- Borra entradas y salidas en 30 días. Excepciones: hasta 2 años si sus filtros automáticos marcan la consulta, y 5 años si se envía una valoración (pulgar arriba o abajo, aviso de error).
- El tratamiento se hace en EE. UU. (no hay residencia de datos en la UE); la transferencia está cubierta por las cláusulas contractuales tipo.
- Se puede pedir retención cero (ZDR) al equipo comercial de Anthropic; el modelo usado (`claude-sonnet-5-5`) la admite.

### Cloudflare (Worker)

- Su DPA se incorpora al contrato del plan gratuito. Cloudflare actúa como encargado, está certificado en el Marco de Privacidad de Datos UE‑EE. UU. y tiene como respaldo las cláusulas contractuales tipo.

### Pendiente (consultar con el Delegado de Protección de Datos de la diócesis de Getafe)

- Inscribir el tratamiento en el registro de actividades de la parroquia, con Anthropic y Cloudflare como encargados y la transferencia a EE. UU.
- Titular de la cuenta de la API: lo ideal es que sea la parroquia; si no, hace falta un contrato de encargo entre la parroquia y el titular.
- El anexo del DPA de Anthropic declara «categorías especiales: ninguna», aunque se envían datos religiosos: valorar esta discrepancia.
- Mencionar estos encargados y la transferencia en el aviso de privacidad de la parroquia.
- Valorar si se pide la retención cero (ZDR).

### Buenas prácticas

- Recortar la imagen a la partida que se necesita antes de subirla: una página entera envía también los datos de las demás partidas.
- No enviar valoraciones ni usar la consola de Anthropic (Console, Workbench) con partidas reales.
- No activar Workers Logs ni añadir registros que incluyan el cuerpo de la petición.
- La clave de acceso impide que terceros gasten tu crédito de la API. Si se filtra, cámbiala con `npx wrangler secret put ACCESS_KEY`.

Condiciones revisadas el 22-11-2026: Commercial Terms de Anthropic (17-06-2025), DPA de Anthropic (24-02-2025) y DPA de Cloudflare (versión 6.4, 03-04-2026). Conviene volver a revisarlas si cambian.

## Limitaciones

- La lectura de manuscritos antiguos no es perfecta: siempre hay una pantalla de revisión antes de generar el Word. Las palabras dudosas se marcan con `[?]`.
- Cada lectura consume crédito de la API de Claude (céntimos por imagen).
