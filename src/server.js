import { pathToFileURL } from "node:url";
import path from "node:path";
import { createApp } from "./app.js";
import { RepositorioLigas } from "./RepositorioLigas.js";
import { ServicioFutbol } from "./ServicioFutbol.js";
import { createUserStore } from "./users.js";

export async function startServer() {
  const users = await createUserStore(process.env.USER_STORE_PATH);
  const servicioFutbol = new ServicioFutbol();
  const datos = await servicioFutbol.listar();
  const ligasDetalladas = await Promise.all(
    datos.map((liga) => servicioFutbol.buscarPorId(liga.id)),
  );
  const repositorioLigas = new RepositorioLigas();
  await repositorioLigas.cargarLigas(ligasDetalladas);

  const app = createApp({
    users,
    repositorioLigas,
    production: process.env.NODE_ENV === "production",
  });
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT debe ser un entero entre 1 y 65535.");
  }

  const server = app.listen(port, () => {
    console.log(`Servidor escuchando en: http://localhost:${port}`);
  });
  server.on("error", (error) => {
    console.error("Error al iniciar el servidor:", error);
    process.exitCode = 1;
  });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  startServer().catch((error) => {
    console.error("No se pudo iniciar el servidor:", error);
    process.exitCode = 1;
  });
}
