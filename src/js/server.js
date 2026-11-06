import { fileURLToPath } from "node:url";
import {createApp} from "./app.js";
import { createUserStore } from "./Usuarios/users.js"; // Ajusta la ruta si está en otra carpeta
import { RepositorioLigas } from "./Futbol/RepositorioLigas.js";
import ServicioFutbol, {
  LIGAS_UTILIZADAS_IDS,
} from "./Futbol/ServicioFutbol.js";

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function inicializarLigas(servicioFutbol = new ServicioFutbol()) {
  const ligasDetalladas = [];

  for (const id of LIGAS_UTILIZADAS_IDS) {
    let cargada = false;
    for (let intento = 0; intento < 2 && !cargada; intento++) {
      try {
        const liga = await servicioFutbol.buscarLigaPorId(id);
        if (liga) {
          await esperar(350); // Pausa para no saturar la API
          try {
            const tabla = await servicioFutbol.buscarTablaDeLiga(liga.id);
            liga.tabla = Array.isArray(tabla) ? tabla : [];
          } catch (errorTabla) {
            console.warn(
              `Aviso al cargar tabla de liga ${id}:`,
              errorTabla.message,
            );
            liga.tabla = [];
          }
          ligasDetalladas.push(liga);
          cargada = true;
        }
      } catch (err) {
        if (intento === 0) {
          console.warn(`Reintentando liga ${id} tras error:`, err.message);
          await esperar(1200);
        } else {
          console.warn(`Aviso definitivo al cargar liga ${id}:`, err.message);
        }
      }
    }
    await esperar(350);
  }

  const repositorioLigas = new RepositorioLigas();

  // Compatibilidad: usa cargarLigas (como en tu server.js original) o agregarLiga
  if (typeof repositorioLigas.cargarLigas === "function") {
    repositorioLigas.cargarLigas(ligasDetalladas);
  } else if (typeof repositorioLigas.agregarLiga === "function") {
    ligasDetalladas.forEach((liga) => repositorioLigas.agregarLiga(liga));
  }

  console.log(`Repositorio listo con ${ligasDetalladas.length} ligas.`);
  return repositorioLigas;
}

export async function startServer() {
  // 1. Inicializa la base de datos de usuarios
  const users = await createUserStore(
    process.env.USER_STORE_PATH || "./usuarios.json",
  );

  // 2. Inicializa los datos de la API de fútbol
  const repositorioLigas = await inicializarLigas();

  // 3. Crea la aplicación Express inyectando las dependencias
  const app = createApp({
    users,
    repositorioLigas,
    production: process.env.NODE_ENV === "production",
  });

  const port = Number(process.env.PORT) || 3000;
  const host = "localhost";

  // 4. Levanta el servidor
  const server = app.listen(port, host, () => {
    console.log(`Servidor Ofsai disponible en http://${host}:${port}`);
  });

  server.on("error", (error) => {
    console.error("Error al iniciar el servidor:", error);
    process.exit(1);
  });

  return { app, server };
}

// Detecta si este archivo se está ejecutando directamente (ej. node server.js)
const isMainModule =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMainModule) {
  startServer().catch((error) => {
    console.error("No se pudo iniciar el servidor:", error);
    process.exit(1);
  });
}
