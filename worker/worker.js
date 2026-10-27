// Cloudflare Worker: intermediario seguro entre la web y la API de Claude.
// La clave vive como secreto del Worker y nunca llega al navegador.
// No almacena nada: la foto se reenvía a Claude y se descarta.
//
// Secretos / variables (ver README.md):
//   ANTHROPIC_API_KEY  clave de la API de Claude
//   ACCESS_KEY         clave compartida que la web envía en cada petición
//   ALLOWED_ORIGIN     origen de la web, p. ej. https://usuario.github.io
//   MODEL              (opcional) modelo de Claude, por defecto claude-sonnet-5-5

// Imagen de firma y sello (no está en el repositorio; ver tools/preparar_firma.py).
import FIRMA_SELLO from "./firma_sello.js";

const CAMPOS = [
  "libro", "folio", "numero", "nombre",
  "bautismo_dia", "bautismo_mes", "bautismo_anio",
  "nacimiento_dia", "nacimiento_mes", "nacimiento_anio",
  "calle", "calle_numero", "natural_de", "natural_diocesis", "natural_provincia",
  "padre", "padre_natural", "madre", "madre_natural",
  "abuelo_paterno", "abuelo_paterno_natural", "abuela_paterna", "abuela_paterna_natural",
  "abuelo_materno", "abuelo_materno_natural", "abuela_materna", "abuela_materna_natural",
  "padrinos", "ministro", "notas_marginales",
];

const PROMPT = `Eres un paleógrafo experto en libros sacramentales españoles.
La imagen es una página (o una partida) de un libro de bautismos. Localiza la partida principal y transcribe sus datos para rellenar una certificación de bautismo.
Responde SOLO con un objeto JSON, sin texto adicional ni bloques de código, con exactamente estas claves (cadena vacía si el dato no aparece o no se lee):
${CAMPOS.map((c) => `- ${c}`).join("\n")}
Significado:
- libro, folio, numero: datos de localización de la partida en el archivo.
- nombre: nombre completo del bautizado, sin «D.», «Don» ni «Doña».
- bautismo_* y nacimiento_*: día en cifras (p. ej. "3"), mes en letra minúscula (p. ej. "mayo") y año en cifras (p. ej. "1921").
- calle y calle_numero: domicilio de los padres o del nacido.
- natural_de, natural_diocesis, natural_provincia: lugar de procedencia/naturaleza del bautizado.
- padre, madre, abuelo_*, abuela_*: nombre completo sin «D.», «Don», «D.ª» ni «Doña»; el sufijo _natural es el lugar de naturaleza de esa persona.
- padrinos: nombres de los padrinos, separados por " y ".
- ministro: sacerdote que bautizó.
- notas_marginales: anotaciones al margen (confirmación, matrimonio, etc.), una por línea.
Normas: desarrolla las abreviaturas habituales; no inventes datos; si una palabra es dudosa, escríbela seguida de "[?]".`;

export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
      "Access-Control-Allow-Headers": "Content-Type, X-Clave-Acceso",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    };
    const json = (obj, status = 200) =>
      new Response(JSON.stringify(obj), {
        status,
        headers: { "Content-Type": "application/json", ...cors },
      });

    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "POST") return json({ error: "Método no permitido" }, 405);
    if (request.headers.get("X-Clave-Acceso") !== env.ACCESS_KEY) {
      return json({ error: "Clave de acceso incorrecta" }, 401);
    }

    const ruta = new URL(request.url).pathname;
    try {
      const cuerpo = await request.json();
      if (ruta === "/extraer") return json(await extraer(cuerpo, env));
      if (ruta === "/firma") return json({ imagen: FIRMA_SELLO });
      return json({ error: "Ruta desconocida" }, 404);
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  },
};

async function extraer({ imagen, mime }, env) {
  if (!imagen) throw new Error("Falta la imagen");
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: env.MODEL || "claude-sonnet-5-5",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mime || "image/jpeg", data: imagen } },
          { type: "text", text: PROMPT },
        ],
      }],
    }),
  });
  const datos = await resp.json();
  if (!resp.ok) throw new Error(datos.error?.message || "Error de la API de Claude");

  const texto = datos.content.map((b) => b.text || "").join("");
  const m = texto.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("La respuesta no contiene datos legibles");
  const bruto = JSON.parse(m[0]);
  const campos = {};
  for (const c of CAMPOS) campos[c] = typeof bruto[c] === "string" ? bruto[c] : "";
  return { campos };
}
