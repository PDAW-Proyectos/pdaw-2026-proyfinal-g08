import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { cargarSesion } from "./middlewares/auth.middleware.js";
import {
  manejarErrores,
  rutaApiNoEncontrada,
} from "./middlewares/errores.middleware.js";
import { crearRouterAuth } from "./routes/auth.routes.js";
import { crearRouterUsuarios } from "./routes/usuarios.routes.js";
import { crearRouterForo } from "./routes/foro.routes.js";
import { crearRouterTienda } from "./routes/tienda.routes.js";
import { crearRouterAdmin } from "./routes/admin.routes.js";
import { crearRouterLigas } from "./routes/ligas.routes.js";
import { crearRouterPartidos } from "./routes/partidos.routes.js";
import { crearRouterEquipos } from "./routes/equipos.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDirectory = path.join(__dirname, "..", "public");

export function createApp({
  authService = null,
  usuariosService = null,
  foroService = null,
  tiendaService = null,
  adminService = null,
  ligasService = null,
  partidosService = null,
  equiposService = null,
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

  if (usuariosService) {
    app.use("/api", crearRouterUsuarios(usuariosService));
  }
  if (foroService) {
    app.use("/api/forum", crearRouterForo(foroService));
  }
  if (tiendaService) {
    app.use("/api", crearRouterTienda(tiendaService));
  }
  if (adminService) {
    app.use("/api/admin", crearRouterAdmin(adminService));
  }

  if (ligasService) app.use("/api/ligas", crearRouterLigas(ligasService));
  if (partidosService)
    app.use("/api/partidos", crearRouterPartidos(partidosService));
  if (equiposService)
    app.use("/api/equipos", crearRouterEquipos(equiposService));

  app.use("/api", rutaApiNoEncontrada);

  app.get("/auth.js", (req, res) =>
    res.sendFile(path.join(publicDirectory, "js", "auth.js")),
  );

  app.get("/admin.html", (req, res, next) => {
    if (!req.usuario || !req.usuario.puedeAdministrar()) {
      return res.redirect("/index.html");
    }
    return next();
  });

  app.use(express.static(publicDirectory));
  app.use(manejarErrores);

  return app;
}

export default createApp;
