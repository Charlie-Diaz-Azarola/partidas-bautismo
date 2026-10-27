// Configuración pública de la web (no contiene secretos).
window.CONFIG = {
  // Dirección del Worker de Cloudflare (ver README.md).
  WORKER_URL: "https://partidas-bautismo.charlie-fe8.workers.dev",

  // Datos fijos que salen en cada certificación.
  PARROQUIA: "Santo Domingo de Silos",
  ARCHIVO_DE: "la Parroquia de Santo Domingo de Silos", // «Encargado del Archivo Parroquial de…»
  POBLACION: "Pinto",
  DIOCESIS: "Getafe",
  PROVINCIA: "Madrid",
  LUGAR_EXPEDICION: "Pinto", // Lugar que aparece en el pie, antes de la fecha de expedición
  ENCARGADO: "", // Don Carlos Díaz Azarola, Encargado del Archivo Parroquial
};
