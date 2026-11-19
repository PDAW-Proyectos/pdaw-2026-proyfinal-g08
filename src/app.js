import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { cargarSesion } from "./middlewares/auth.middleware.js";
import {
  manejarErrores,
  rutaApiNoEncontrada,
} from "./middlewares/errores.middleware.js";
import { crearRouterAuth } from "./routes/auth.routes.js";
import { crearRouterLigas } from "./routes/ligas.routes.js";
import { crearRouterPartidos } from "./routes/partidos.routes.js";
import { crearRouterEquipos } from "./routes/equipos.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp({
  authService = null,
  ligasService = null,
  partidosService = null,
  equiposService = null,
  communityApp = null,
  production = false,
} = {}) {
  const app = express();

  if (production) app.set("trust proxy", 1);

  app.use(express.json({ limit: "16kb" }));
  app.use(express.urlencoded({ extended: false }));

  if (authService) {
    app.use(cargarSesion(authService));
    app.use("/api", crearRouterAuth(authService, { production }));
  }

  if (ligasService) app.use("/api/ligas", crearRouterLigas(ligasService));
  if (partidosService)
    app.use("/api/partidos", crearRouterPartidos(partidosService));
  if (equiposService)
    app.use("/api/equipos", crearRouterEquipos(equiposService));

  if (communityApp) app.use(communityApp);

  app.use("/api", rutaApiNoEncontrada);
  app.use(express.static(path.join(__dirname, "..", "public")));
  app.use(manejarErrores);

  return app;
}

export default createApp;
