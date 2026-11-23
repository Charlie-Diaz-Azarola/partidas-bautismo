// Documentos que se pueden generar a partir de la misma lectura de la imagen.
const TIPOS = {
  partida: { plantilla: "plantilla/plantilla_partida.docx", prefijo: "Partida", boton: "Generar partida", listo: "Partida lista" },
  volante: { plantilla: "plantilla/plantilla_volante.docx", prefijo: "Volante", boton: "Generar volante", listo: "Volante listo" },
};

// Campos que se revisan en pantalla. Todos se leen de la imagen salvo los que llevan
// `porDefecto`, que no están en el acta: parten de ese valor y se pueden cambiar.
// `fila` agrupa campos que se muestran en la misma línea; `seccion` abre un bloque nuevo
// (un texto, o un texto por tipo de documento). `solo` limita el campo a un tipo de
// documento; sin `solo`, aparece en todos. `opciones` lo convierte en una lista desplegable.
// `aMano` deja el campo en blanco, sin el dato leído de la imagen, en ese tipo de documento.
const CAMPOS = [
  { id: "encargado", etiqueta: "Encargado del archivo (sin «D./Dª.»)", seccion: "Encargado del archivo", porDefecto: CONFIG.ENCARGADO, solo: "partida" },
  { id: "encargado_tratamiento", etiqueta: "Tratamiento del encargado", porDefecto: CONFIG.ENCARGADO_TRATAMIENTO, solo: "partida", opciones: [
    ["D.", "D. (encargado)"], ["Dª.", "Dª. (encargada)"]] },
  { id: "libro", etiqueta: "Libro", seccion: "Datos del archivo", fila: "archivo", aMano: "volante" },
  { id: "folio", etiqueta: "Folio", fila: "archivo", aMano: "volante" },
  { id: "numero", etiqueta: "Núm.", fila: "archivo" },
  { id: "nombre", etiqueta: "Bautizado/a (sin «D.»)", seccion: "Bautizado/a" },
  { id: "sexo", etiqueta: "Sexo", opciones: [
    ["", "Sin determinar (D./Dª.)"], ["H", "Varón (D.)"], ["M", "Mujer (Dª.)"]] },
  { id: "bautismo_dia", etiqueta: "Bautismo: día", seccion: "Fecha de bautismo", fila: "bautismo" },
  { id: "bautismo_mes", etiqueta: "mes", fila: "bautismo" },
  { id: "bautismo_anio", etiqueta: "año", fila: "bautismo" },
  { id: "nacimiento_dia", etiqueta: "Nacimiento: día", seccion: "Nacimiento", fila: "nacimiento" },
  { id: "nacimiento_mes", etiqueta: "mes", fila: "nacimiento" },
  { id: "nacimiento_anio", etiqueta: "año", fila: "nacimiento" },
  { id: "calle", etiqueta: "En la calle", solo: "partida" },
  { id: "calle_numero", etiqueta: "N.º", solo: "partida" },
  { id: "natural_de", etiqueta: "Natural de", solo: "partida" },
  { id: "natural_diocesis", etiqueta: "Diócesis de", solo: "partida" },
  { id: "natural_provincia", etiqueta: "Provincia de", solo: "partida" },
  { id: "padre", etiqueta: "Padre: D.", seccion: "Padres" },
  { id: "padre_natural", etiqueta: "natural de", solo: "partida" },
  { id: "madre", etiqueta: "Madre: D.ª" },
  { id: "madre_natural", etiqueta: "natural de", solo: "partida" },
  { id: "abuelo_paterno", etiqueta: "Abuelo paterno: D.", seccion: "Abuelos paternos", solo: "partida" },
  { id: "abuelo_paterno_natural", etiqueta: "natural de", solo: "partida" },
  { id: "abuela_paterna", etiqueta: "Abuela paterna: D.ª", solo: "partida" },
  { id: "abuela_paterna_natural", etiqueta: "natural de", solo: "partida" },
  { id: "abuelo_materno", etiqueta: "Abuelo materno: D.", seccion: "Abuelos maternos", solo: "partida" },
  { id: "abuelo_materno_natural", etiqueta: "natural de", solo: "partida" },
  { id: "abuela_materna", etiqueta: "Abuela materna: D.ª", solo: "partida" },
  { id: "abuela_materna_natural", etiqueta: "natural de", solo: "partida" },
  { id: "padrinos", etiqueta: "Padrinos", seccion: { partida: "Padrinos y ministro", volante: "Ministro" }, solo: "partida" },
  { id: "ministro", etiqueta: "Ministro" },
  { id: "notas_marginales", etiqueta: "Notas marginales", largo: true, seccion: "Notas", solo: "partida" },
];

const $ = (id) => document.getElementById(id);
const estado = (texto, error = false) => {
  $("estado").textContent = texto;
  $("estado").classList.toggle("error", error);
};

let urlDescarga = "";
// Datos leídos de la imagen y corregidos en pantalla. Se conservan aunque se cambie
// de tipo de documento, porque entonces el formulario se pinta con otros campos.
const valores = {};

// --- Tipo de documento ----------------------------------------------------
const tipo = () => document.querySelector('input[name="tipo"]:checked').value;
const camposDelTipo = () => CAMPOS.filter((c) => !c.solo || c.solo === tipo());

try {
  const guardado = localStorage.getItem("tipo");
  if (TIPOS[guardado]) document.querySelector(`input[name="tipo"][value="${guardado}"]`).checked = true;
} catch {}
for (const radio of document.querySelectorAll('input[name="tipo"]')) {
  radio.addEventListener("change", () => {
    try { localStorage.setItem("tipo", tipo()); } catch {}
    guardarValores();
    pintarFormulario();
  });
}

// --- Acceso ---------------------------------------------------------------
// La web no guarda la clave: si se quiere, la recuerda el gestor de contraseñas
// del navegador. Se borra la que guardaban versiones anteriores en localStorage.
try { localStorage.removeItem("clave"); } catch {}
function mostrarAcceso(visible) {
  $("acceso").hidden = !visible;
  if (visible) $("clave").focus();
}
// Al ocultarse el formulario tras enviarlo, el navegador ofrece guardar la clave.
// Vuelve a aparecer si falta la clave o el Worker la rechaza.
$("acceso").addEventListener("submit", (ev) => {
  ev.preventDefault();
  mostrarAcceso(false);
});

// --- Formulario -----------------------------------------------------------
function control(c) {
  if (c.opciones) {
    return `<select id="f-${c.id}">${c.opciones
      .map(([valor, texto]) => `<option value="${valor}">${texto}</option>`).join("")}</select>`;
  }
  return c.largo ? `<textarea id="f-${c.id}"></textarea>` : `<input type="text" id="f-${c.id}">`;
}

// Pinta los campos del tipo de documento elegido y los rellena con `valores`.
function pintarFormulario() {
  let html = "";
  let filaAbierta = null;
  let seccionPendiente = null; // se muestra aunque el primer campo de la sección no sea de este tipo
  const cerrarFila = () => { if (filaAbierta) { html += "</div>"; filaAbierta = null; } };
  for (const c of CAMPOS) {
    if (c.seccion) seccionPendiente = typeof c.seccion === "string" ? c.seccion : c.seccion[tipo()];
    if (c.solo && c.solo !== tipo()) continue;
    if (seccionPendiente) { cerrarFila(); html += `<h3>${seccionPendiente}</h3>`; seccionPendiente = null; }
    if (c.fila !== filaAbierta) {
      cerrarFila();
      if (c.fila) { html += '<div class="fila">'; filaAbierta = c.fila; }
    }
    html += `<label>${c.etiqueta}${control(c)}</label>`;
  }
  cerrarFila();
  $("campos").innerHTML = html;
  for (const c of camposDelTipo()) $("f-" + c.id).value = valores[c.id] ?? c.porDefecto ?? "";
  $("generar").textContent = TIPOS[tipo()].boton;
}

// Copia a `valores` lo que hay escrito en el formulario.
function guardarValores() {
  for (const c of camposDelTipo()) {
    const el = $("f-" + c.id);
    if (el) valores[c.id] = el.value;
  }
}
pintarFormulario();

// --- Imagen ---------------------------------------------------------------
// Reduce la imagen para acelerar la subida y el análisis (lado mayor 2000 px).
async function reducir(archivo) {
  const bmp = await createImageBitmap(archivo);
  const k = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
  const lienzo = document.createElement("canvas");
  lienzo.width = Math.round(bmp.width * k);
  lienzo.height = Math.round(bmp.height * k);
  lienzo.getContext("2d").drawImage(bmp, 0, 0, lienzo.width, lienzo.height);
  const dataUrl = lienzo.toDataURL("image/jpeg", 0.85);
  return { dataUrl, base64: dataUrl.split(",")[1] };
}

async function llamar(ruta, cuerpo) {
  const resp = await fetch(CONFIG.WORKER_URL + ruta, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Clave-Acceso": $("clave").value },
    body: JSON.stringify(cuerpo),
  });
  const datos = await resp.json().catch(() => ({}));
  if (resp.status === 401) mostrarAcceso(true);
  if (!resp.ok) throw new Error(datos.error || `Error ${resp.status}`);
  return datos;
}

$("entrada-foto").addEventListener("change", async (ev) => {
  const archivo = ev.target.files[0];
  ev.target.value = ""; // permite volver a elegir el mismo archivo tras un error
  if (!archivo) return;
  if (!$("clave").value) {
    estado("Introduce primero la clave de acceso.", true);
    mostrarAcceso(true);
    return;
  }
  try {
    estado("Preparando la imagen…");
    const { dataUrl, base64 } = await reducir(archivo);
    $("vista").src = dataUrl;
    $("vista").hidden = false;

    estado("Leyendo la partida… (puede tardar unos segundos)");
    const { campos } = await llamar("/extraer", { imagen: base64, mime: "image/jpeg" });
    for (const c of CAMPOS) {
      valores[c.id] = c.aMano === tipo() ? "" : campos[c.id] || c.porDefecto || "";
    }
    pintarFormulario();
    $("formulario").hidden = false;
    $("formulario").scrollIntoView({ behavior: "smooth" });
    estado("Datos leídos. Revísalos abajo.");
  } catch (e) {
    estado(e.message, true);
  }
});

// --- Generar Word ---------------------------------------------------------
// Fecha de expedición (hoy).
function datosFijos() {
  const hoy = new Date();
  return {
    expedicion_dia: String(hoy.getDate()),
    expedicion_mes: hoy.toLocaleDateString("es-ES", { month: "long" }),
    expedicion_anio: String(hoy.getFullYear()),
  };
}

async function generarDocx(plantilla, datos) {
  const resp = await fetch(plantilla);
  if (!resp.ok) throw new Error("No se pudo cargar la plantilla");
  const zip = new PizZip(await resp.arrayBuffer());

  const doc = new docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => "",
  });
  doc.render(datos);
  return doc.getZip().generate({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

$("formulario").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  guardarValores();
  const t = TIPOS[tipo()];
  const datos = datosFijos();
  for (const { id } of camposDelTipo()) datos[id] = valores[id].trim();
  // Según el sexo del bautizado: «D. … hijo … BAUTIZADO» o «Dª. … hija … BAUTIZADA»;
  // sin determinar, «D./Dª. … hijo/a … BAUTIZADO/A».
  datos.tratamiento = { H: "D.", M: "Dª." }[datos.sexo] || "D./Dª.";
  datos.hijo = { H: "hijo", M: "hija" }[datos.sexo] || "hijo/a";
  datos.bautizado = { H: "BAUTIZADO", M: "BAUTIZADA" }[datos.sexo] || "BAUTIZADO/A";
  // Partida: «encargado» o «encargada» del Archivo según el tratamiento elegido.
  datos.encargado_cargo = datos.encargado_tratamiento === "Dª." ? "encargada" : "encargado";

  try {
    estado("Generando el documento…");
    const blob = await generarDocx(t.plantilla, datos);
    const nombreBase = (datos.nombre || tipo()).normalize("NFD")
      .replace(/[̀-ͯ]/g, "").replace(/[^\w]+/g, "_");

    if (urlDescarga) URL.revokeObjectURL(urlDescarga);
    urlDescarga = URL.createObjectURL(blob);
    $("descarga").href = urlDescarga;
    $("descarga").download = `${t.prefijo}_${nombreBase}.docx`;
    $("titulo-resultado").textContent = t.listo;
    $("formulario").hidden = true;
    $("resultado").hidden = false;
  } catch (e) {
    estado(e.message, true);
  }
});

$("nueva").addEventListener("click", () => {
  $("resultado").hidden = true;
  $("formulario").hidden = true;
  $("vista").hidden = true;
  $("entrada-foto").value = "";
  for (const id in valores) delete valores[id];
  pintarFormulario();
  estado("");
  window.scrollTo({ top: 0, behavior: "smooth" });
});
