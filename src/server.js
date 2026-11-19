import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createApp } from "./app.js";
import { createApp as createCommunityApp } from "./js/app.js";
import { createUserStore } from "./js/Usuarios/users.js";
import { crearRepositorioComunidad } from "./js/Comunidad/RepositorioComunidad.js";
import { crearRepositorioConfiguracion } from "./js/Configuracion/RepositorioConfiguracion.js";
import { LigasRepository } from "./repositories/LigasRepository.js";
import { PartidosRepository } from "./repositories/PartidosRepository.js";
import { EquiposRepository } from "./repositories/EquiposRepository.js";
import { ApiFutbolService } from "./services/apiFutbol.service.js";
import { LigasService } from "./services/ligas.service.js";
import { PartidosService } from "./services/partidos.service.js";
import { EquiposService } from "./services/equipos.service.js";
import {
  cargarDatosLocales,
  sincronizarDatosApi,
} from "./services/sincronizacion.service.js";

const dataDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "data",
);

function resolverPuertoServidor() {
  const puertoEnv = Number(process.env.PORT);
  const puertoNginx = Number(process.env.NGINX_PORT);
  const puertoDefaultApp = Number(process.env.DEFAULT_APP_PORT) || 3000;

  if (puertoEnv && (!puertoNginx || puertoEnv !== puertoNginx)) {
    return puertoEnv;
  }
  return puertoDefaultApp;
}

export async function startServer() {
  const adminSettings = [
    process.env.ADMIN_NAME,
    process.env.ADMIN_EMAIL,
    process.env.ADMIN_PASSWORD,
  ];
  const configuredAdminSettings = adminSettings.filter(
    (value) => value !== undefined,
  );
  if (
    configuredAdminSettings.length !== 0 &&
    configuredAdminSettings.length !== adminSettings.length
  ) {
    throw new Error(
      "La configuración privada del administrador debe incluir nombre, correo y contraseña.",
    );
  }
  const initialAdmin =
    configuredAdminSettings.length === adminSettings.length
      ? {
          name: process.env.ADMIN_NAME,
          email: process.env.ADMIN_EMAIL,
          password: process.env.ADMIN_PASSWORD,
        }
      : undefined;
  const initialUsers =
    process.env.NODE_ENV !== "production" && !process.env.USER_STORE_PATH
      ? JSON.parse(
          await fs.readFile(path.join(dataDirectory, "demo-users.json"), "utf8"),
        )
      : undefined;
  const initialCommunityData =
    process.env.NODE_ENV !== "production" && !process.env.COMMUNITY_STORE_PATH
      ? JSON.parse(
          await fs.readFile(
            path.join(dataDirectory, "demo-comunidad.json"),
            "utf8",
          ),
        )
      : undefined;
  const users = await createUserStore(
    process.env.USER_STORE_PATH || "./data/users.json",
    { initialAdmin, initialUsers },
  );
  const comunidad = await crearRepositorioComunidad(
    process.env.COMMUNITY_STORE_PATH || "./data/comunidad.json",
    initialCommunityData,
  );
  const configuracion = await crearRepositorioConfiguracion(
    process.env.ADMIN_SETTINGS_PATH || "./data/admin-settings.json",
  );

  const apiFutbol = new ApiFutbolService();
  const ligasRepo = new LigasRepository();
  const partidosRepo = new PartidosRepository();
  const equiposRepo = new EquiposRepository();

  const ligasService = new LigasService({ ligasRepo, partidosRepo, apiFutbol });
  const partidosService = new PartidosService({ partidosRepo, apiFutbol });
  const equiposService = new EquiposService({
    equiposRepo,
    ligasRepo,
    partidosRepo,
    partidosService,
    apiFutbol,
  });

  cargarDatosLocales({ ligasRepo, partidosRepo, equiposRepo, equiposService });

  const communityApp = createCommunityApp({
    users,
    comunidad,
    configuracion,
    production: process.env.NODE_ENV === "production",
  });
  const app = createApp({
    ligasService,
    partidosService,
    equiposService,
    communityApp,
    production: process.env.NODE_ENV === "production",
  });

  const port = resolverPuertoServidor();
  const host = "localhost";

  const server = app.listen(port, host, () => {
    console.log(`Servidor Orsai disponible en http://${host}:${port}`);
    sincronizarDatosApi({
      ligasRepo,
      partidosRepo,
      equiposRepo,
      partidosService,
      equiposService,
    }).catch((error) => {
      console.warn(
        "Aviso al sincronizar partidos en segundo plano:",
        error.message,
      );
    });
  });

  server.on("error", (error) => {
    console.error("Error al iniciar el servidor:", error);
    process.exit(1);
  });

  return { app, server };
}

const isMainModule =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMainModule) {
  startServer().catch((error) => {
    console.error("No se pudo iniciar el servidor:", error);
    process.exit(1);
  });
}
