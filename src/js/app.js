import express from "express";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import crearRouterLigas from "./routes/ligas.routes.js";
import { createUserRouter } from "./routes/routerUsuarios.js";

const sourceDirectory = dirname(fileURLToPath(import.meta.url));

export function createApp({
  users,
  repositorioLigas,
  production = false,
}) {
  const app = express();
  if (production) app.set("trust proxy", 1);

  app.use(express.json({ limit: "16kb" }));
  app.use(express.urlencoded({ extended: false }));
  app.use(createUserRouter({ users, production }));
  if (repositorioLigas) {
    app.use("/api/ligas", crearRouterLigas(repositorioLigas));
  }
  app.use(express.static(join(sourceDirectory, "..", "..", "public")));
  app.use((error, req, res, next) => {
    console.error(error);
    if (res.headersSent) return next(error);
    res
      .status(500)
      .json({ error: "Ocurrió un error interno. Intentá nuevamente." });
  });

  return app;
}
