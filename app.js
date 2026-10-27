// Campos que se leen de la foto y se revisan en pantalla.
// `fila` agrupa campos que se muestran en la misma línea; `seccion` abre un bloque nuevo.
const CAMPOS = [
  { id: "libro", etiqueta: "Libro", seccion: "Datos del archivo", fila: "archivo" },
  { id: "folio", etiqueta: "Folio", fila: "archivo" },
  { id: "numero", etiqueta: "Núm.", fila: "archivo" },
  { id: "nombre", etiqueta: "Bautizado/a (sin «D.»)", seccion: "Bautizado/a" },
  { id: "bautismo_dia", etiqueta: "Bautismo: día", seccion: "Fecha de bautismo", fila: "bautismo" },
  { id: "bautismo_mes", etiqueta: "mes", fila: "bautismo" },
  { id: "bautismo_anio", etiqueta: "año", fila: "bautismo" },
  { id: "nacimiento_dia", etiqueta: "Nacimiento: día", seccion: "Nacimiento", fila: "nacimiento" },
  { id: "nacimiento_mes", etiqueta: "mes", fila: "nacimiento" },
  { id: "nacimiento_anio", etiqueta: "año", fila: "nacimiento" },
  { id: "calle", etiqueta: "En la calle" },
  { id: "calle_numero", etiqueta: "N.º" },
  { id: "natural_de", etiqueta: "Natural de" },
  { id: "natural_diocesis", etiqueta: "Diócesis de" },
  { id: "natural_provincia", etiqueta: "Provincia de" },
  { id: "padre", etiqueta: "Padre: D.", seccion: "Padres" },
  { id: "padre_natural", etiqueta: "natural de" },
  { id: "madre", etiqueta: "Madre: D.ª" },
  { id: "madre_natural", etiqueta: "natural de" },
  { id: "abuelo_paterno", etiqueta: "Abuelo paterno: D.", seccion: "Abuelos paternos" },
  { id: "abuelo_paterno_natural", etiqueta: "natural de" },
  { id: "abuela_paterna", etiqueta: "Abuela paterna: D.ª" },
  { id: "abuela_paterna_natural", etiqueta: "natural de" },
  { id: "abuelo_materno", etiqueta: "Abuelo materno: D.", seccion: "Abuelos maternos" },
  { id: "abuelo_materno_natural", etiqueta: "natural de" },
  { id: "abuela_materna", etiqueta: "Abuela materna: D.ª" },
  { id: "abuela_materna_natural", etiqueta: "natural de" },
  { id: "padrinos", etiqueta: "Padrinos", seccion: "Padrinos y ministro" },
  { id: "ministro", etiqueta: "Ministro" },
  { id: "notas_marginales", etiqueta: "Notas marginales", largo: true, seccion: "Notas" },
];

const $ = (id) => document.getElementById(id);
const estado = (texto, error = false) => {
  $("estado").textContent = texto;
  $("estado").classList.toggle("error", error);
};

let urlDescarga = "";

// --- Acceso ---------------------------------------------------------------
try { $("clave").value = localStorage.getItem("clave") || ""; } catch {}
$("clave").addEventListener("change", () => {
  try { localStorage.setItem("clave", $("clave").value); } catch {}
});

// --- Formulario -----------------------------------------------------------
function pintarFormulario() {
  let html = "";
  let filaAbierta = null;
  const cerrarFila = () => { if (filaAbierta) { html += "</div>"; filaAbierta = null; } };
  for (const c of CAMPOS) {
    if (c.seccion) { cerrarFila(); html += `<h3>${c.seccion}</h3>`; }
    if (c.fila !== filaAbierta) {
      cerrarFila();
      if (c.fila) { html += '<div class="fila">'; filaAbierta = c.fila; }
    }
    html += `<label>${c.etiqueta}${c.largo
      ? `<textarea id="f-${c.id}"></textarea>`
      : `<input type="text" id="f-${c.id}">`}</label>`;
  }
  cerrarFila();
  $("campos").innerHTML = html;
}
pintarFormulario();

// --- Foto -----------------------------------------------------------------
// Reduce la foto para acelerar la subida y el análisis (lado mayor 2000 px).
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
  if (!resp.ok) throw new Error(datos.error || `Error ${resp.status}`);
  return datos;
}

$("entrada-foto").addEventListener("change", async (ev) => {
  const archivo = ev.target.files[0];
  if (!archivo) return;
  if (!$("clave").value) { estado("Introduce primero la clave de acceso.", true); return; }
  try {
    estado("Preparando la foto…");
    const { dataUrl, base64 } = await reducir(archivo);
    $("vista").src = dataUrl;
    $("vista").hidden = false;

    estado("Leyendo la partida… (puede tardar unos segundos)");
    const { campos } = await llamar("/extraer", { imagen: base64, mime: "image/jpeg" });
    for (const { id } of CAMPOS) $("f-" + id).value = campos[id] || "";
    $("formulario").hidden = false;
    $("formulario").scrollIntoView({ behavior: "smooth" });
    estado("Datos leídos. Revísalos abajo.");
  } catch (e) {
    estado(e.message, true);
  }
});

// --- Generar Word ---------------------------------------------------------
// Datos fijos de la parroquia (config.js) y fecha de expedición (hoy).
function datosFijos() {
  const hoy = new Date();
  return {
    parroquia: CONFIG.PARROQUIA,
    archivo_de: CONFIG.ARCHIVO_DE,
    poblacion: CONFIG.POBLACION,
    diocesis: CONFIG.DIOCESIS,
    provincia: CONFIG.PROVINCIA,
    encargado: CONFIG.ENCARGADO,
    obispado: "",
    lugar_expedicion: CONFIG.POBLACION,
    expedicion_dia: String(hoy.getDate()),
    expedicion_mes: hoy.toLocaleDateString("es-ES", { month: "long" }),
    expedicion_anio: String(hoy.getFullYear()),
  };
}

async function generarDocx(datos) {
  const resp = await fetch("plantilla/plantilla_partida.docx");
  if (!resp.ok) throw new Error("No se pudo cargar la plantilla");
  const zip = new PizZip(await resp.arrayBuffer());

  // La plantilla pública lleva una imagen transparente de relleno; la firma y el
  // sello reales los sirve el Worker solo a quien tiene la clave de acceso.
  const { imagen } = await llamar("/firma", {});
  zip.file("word/media/image1.png", imagen, { base64: true });
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
  const datos = datosFijos();
  for (const { id } of CAMPOS) datos[id] = $("f-" + id).value.trim();

  try {
    estado("Generando el documento…");
    const blob = await generarDocx(datos);
    const nombreBase = (datos.nombre || "partida").normalize("NFD")
      .replace(/[̀-ͯ]/g, "").replace(/[^\w]+/g, "_");

    if (urlDescarga) URL.revokeObjectURL(urlDescarga);
    urlDescarga = URL.createObjectURL(blob);
    $("descarga").href = urlDescarga;
    $("descarga").download = `Partida_${nombreBase}.docx`;
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
  estado("");
  window.scrollTo({ top: 0, behavior: "smooth" });
});
