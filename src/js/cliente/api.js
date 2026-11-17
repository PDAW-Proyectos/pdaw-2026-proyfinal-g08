let mapaLigasPorId = new Map();
let promesaLigas = null;

export async function obtenerLigasCompartidas() {
  if (promesaLigas) return promesaLigas;

  promesaLigas = (async () => {
    const respuesta = await fetch("/api/ligas");
    if (!respuesta.ok) {
      throw new Error(`Error en la respuesta: ${respuesta.status}`);
    }
    const datos = await respuesta.json();
    const lista = Array.isArray(datos) ? datos : [];
    mapaLigasPorId = new Map(lista.map((liga) => [String(liga.id), liga]));
    return lista;
  })();

  try {
    return await promesaLigas;
  } catch (error) {
    promesaLigas = null;
    throw error;
  }
}

export function obtenerEscudoLiga(idLiga) {
  if (!idLiga) return "";
  return mapaLigasPorId.get(String(idLiga))?.escudo || "";
}
