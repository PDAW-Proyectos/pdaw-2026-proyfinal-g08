import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import express from "express";
import { crearRouterLigas } from "./Routes/ligas.routes.js";
import {
  MINUTOS_SESION_MAXIMOS,
  MINUTOS_SESION_MINIMOS,
  MINUTOS_SESION_PREDETERMINADOS,
} from "./Configuracion/RepositorioConfiguracion.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sessionCookieName = "ofsai.sid";
const milisegundosPorMinuto = 60 * 1000;

const crearConfiguracionEnMemoria = () => {
  let minutosTiempoSesion = MINUTOS_SESION_PREDETERMINADOS;
  return {
    obtenerMinutosTiempoSesion: () => minutosTiempoSesion,
    async establecerMinutosTiempoSesion(minutos) {
      minutosTiempoSesion = minutos;
      return minutosTiempoSesion;
    },
  };
};

const publicUser = ({ id, name, email, favoriteTeam, role }) => ({
  id,
  name,
  email,
  favoriteTeam,
  role,
});

const publicProfile = ({ id, name, favoriteTeam }) => ({
  id,
  name,
  favoriteTeam,
});

const adminUser = ({
  id,
  name,
  email,
  favoriteTeam,
  role,
  status,
  createdAt,
  statusChangedAt,
  deletedAt,
}) => ({
  id,
  name,
  email,
  favoriteTeam,
  role: role || "user",
  status: status || "active",
  createdAt: createdAt || null,
  statusChangedAt: statusChangedAt || null,
  deletedAt: deletedAt || null,
});

const esPrecioValido = (precio) =>
  Number.isFinite(precio) &&
  precio > 0 &&
  precio <= 1000000 &&
  Math.abs(precio * 100 - Math.round(precio * 100)) < 0.000001;

export function createApp({
  users,
  comunidad,
  configuracion,
  repositorioLigas = null,
  production = false,
}) {
  const app = express();
  const sessions = new Map();
  const configuracionActiva = configuracion || crearConfiguracionEnMemoria();

  if (production) app.set("trust proxy", 1);

  app.use(express.json({ limit: "16kb" }));
  app.use(express.urlencoded({ extended: false }));

  app.use((req, res, next) => {
    const cookieHeader = req.headers.cookie || "";
    const sessionCookie = cookieHeader
      .split(";")
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith(`${sessionCookieName}=`));

    const sessionId = sessionCookie?.slice(sessionCookieName.length + 1);
    const session = sessionId ? sessions.get(sessionId) : null;

    if (session && session.expiresAt > Date.now()) {
      const user = users?.findById(session.userId) || null;
      if (user && !["suspended", "deleted"].includes(user.status)) {
        req.user = user;
        req.sessionId = sessionId;
      } else {
        sessions.delete(sessionId);
      }
    } else if (sessionId) {
      sessions.delete(sessionId);
    }

    next();
  });

  const requireAuth = (req, res, next) =>
    req.user
      ? next()
      : res.status(401).json({ error: "Es necesario iniciar sesión." });

  const requireAdmin = (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Es necesario iniciar sesión." });
    }

    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ error: "No tenés permisos para realizar esta acción." });
    }

    next();
  };

  const startSession = (res, user) => {
    const duracionSesionMs =
      configuracionActiva.obtenerMinutosTiempoSesion() *
      milisegundosPorMinuto;
    const sessionId = randomBytes(32).toString("hex");
    sessions.set(sessionId, {
      userId: user.id,
      expiresAt: Date.now() + duracionSesionMs,
    });
    res.cookie(sessionCookieName, sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: production,
      maxAge: duracionSesionMs,
      path: "/",
    });
  };

  const isPublicUser = (userId) =>
    users?.findById(userId)?.status !== "deleted";
  const isPublicPost = (publicacion) =>
    publicacion && isPublicUser(publicacion.autorId);

  app.get("/api/forum/posts", (req, res) => {
    res.json({
      publicaciones: comunidad
        .listarPublicaciones()
        .filter((publicacion) => isPublicUser(publicacion.autorId)),
    });
  });

  app.post("/api/forum/posts", requireAuth, async (req, res) => {
    const titulo = req.body?.titulo;
    const texto = req.body?.texto;

    if (
      typeof titulo !== "string" ||
      titulo.trim().length < 3 ||
      titulo.trim().length > 120 ||
      typeof texto !== "string" ||
      texto.trim().length < 1 ||
      texto.trim().length > 2000
    ) {
      return res.status(400).json({
        error: "El título debe tener 3-120 caracteres y el texto 1-2000.",
      });
    }

    const publicacion = await comunidad.crearPublicacion(
      req.user,
      titulo.trim(),
      texto.trim(),
    );

    res.status(201).json({ publicacion });
  });

  app.get("/api/forum/posts/:id/comments", (req, res) => {
    const publicacion = comunidad.buscarPublicacion(req.params.id);
    if (!isPublicPost(publicacion)) {
      return res.status(404).json({ error: "Publicación no encontrada." });
    }

    res.json({
      comentarios: comunidad
        .listarComentarios(req.params.id)
        .filter((comentario) => isPublicUser(comentario.autorId)),
    });
  });

  app.post("/api/forum/posts/:id/comments", requireAuth, async (req, res) => {
    const publicacion = comunidad.buscarPublicacion(req.params.id);
    if (!isPublicPost(publicacion)) {
      return res.status(404).json({ error: "Publicación no encontrada." });
    }

    const texto = req.body?.texto;
    if (
      typeof texto !== "string" ||
      texto.trim().length < 1 ||
      texto.trim().length > 1000
    ) {
      return res.status(400).json({
        error: "El comentario debe tener entre 1 y 1000 caracteres.",
      });
    }

    const comentario = await comunidad.crearComentario(
      req.user,
      req.params.id,
      texto.trim(),
    );

    res.status(201).json({ comentario });
  });

  app.delete("/api/forum/posts/:id", requireAdmin, async (req, res) => {
    if (!comunidad.buscarPublicacion(req.params.id)) {
      return res.status(404).json({ error: "Publicación no encontrada." });
    }

    await comunidad.borrarPublicacion(req.params.id);
    res.status(204).end();
  });

  app.delete("/api/forum/comments/:id", requireAdmin, async (req, res) => {
    if (!comunidad.buscarComentario(req.params.id)) {
      return res.status(404).json({ error: "Comentario no encontrado." });
    }

    await comunidad.borrarComentario(req.params.id);
    res.status(204).end();
  });

  app.get("/api/admin/posts", requireAdmin, (req, res) => {
    const publicaciones = comunidad.listarPublicaciones().map((publicacion) => ({
      ...publicacion,
      comentarios: comunidad.listarComentarios(publicacion.id),
    }));
    res.json({ publicaciones });
  });

  app.get("/api/admin/users", requireAdmin, (req, res) => {
    res.json({ usuarios: users.list().map(adminUser) });
  });

  app.get("/api/admin/settings", requireAdmin, (req, res) => {
    res.json({
      sessionTimeoutMinutes: configuracionActiva.obtenerMinutosTiempoSesion(),
    });
  });

  app.patch(
    "/api/admin/settings/session-timeout",
    requireAdmin,
    async (req, res) => {
      const minutos = req.body?.minutes;
      if (
        !Number.isInteger(minutos) ||
        minutos < MINUTOS_SESION_MINIMOS ||
        minutos > MINUTOS_SESION_MAXIMOS
      ) {
        return res.status(400).json({
          error:
            `La duración de sesión debe ser un número entero entre ${MINUTOS_SESION_MINIMOS} y ${MINUTOS_SESION_MAXIMOS} minutos.`,
        });
      }

      const minutosTiempoSesion =
        await configuracionActiva.establecerMinutosTiempoSesion(minutos);
      res.json({ sessionTimeoutMinutes: minutosTiempoSesion });
    },
  );

  app.patch("/api/admin/users/:id/status", requireAdmin, async (req, res) => {
    try {
      const user = await users.setStatus(req.params.id, req.body?.status);
      if (!user) {
        return res.status(404).json({ error: "Usuario no encontrado." });
      }
      res.json({ usuario: adminUser(user) });
    } catch (error) {
      if (error.code === "invalid_status") {
        return res.status(400).json({ error: error.message });
      }
      if (error.code === "protected_admin") {
        return res.status(403).json({ error: error.message });
      }
      if (error.code === "deleted_account") {
        return res.status(409).json({ error: error.message });
      }
      throw error;
    }
  });

  app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const user = await users.deleteAccount(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "Usuario no encontrado." });
      }
      res.json({ usuario: adminUser(user) });
    } catch (error) {
      if (error.code === "protected_admin") {
        return res.status(403).json({ error: error.message });
      }
      throw error;
    }
  });

  app.get("/api/users/:id", (req, res) => {
    const usuario = users.findById(req.params.id);
    if (!usuario || usuario.status === "deleted") {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    res.json({
      perfil: publicProfile(usuario),
      publicaciones: comunidad
        .listarPublicacionesDeUsuario(usuario.id)
        .filter((publicacion) => isPublicUser(publicacion.autorId)),
      comentarios: comunidad
        .listarComentariosDeUsuario(usuario.id)
        .filter((comentario) => {
          const publicacion = comunidad.buscarPublicacion(
            comentario.publicacionId,
          );
          return (
            publicacion &&
            isPublicUser(publicacion.autorId) &&
            isPublicUser(comentario.autorId)
          );
        }),
    });
  });

  app.get("/api/me/profile", requireAuth, (req, res) => {
    res.json({
      perfil: {
        ...publicProfile(req.user),
        email: req.user.email,
        role: req.user.role || "user",
      },
      publicaciones: comunidad.listarPublicacionesDeUsuario(req.user.id),
      comentarios: comunidad.listarComentariosDeUsuario(req.user.id),
      pedidos: comunidad.listarPedidosDeUsuario(req.user.id),
    });
  });

  app.get("/api/products", (req, res) => {
    res.json({ productos: comunidad.listarProductos() });
  });

  app.post("/api/products", requireAdmin, async (req, res) => {
    const {
      nombre,
      descripcion = "",
      categoria,
      precio,
      stock,
    } = req.body || {};

    if (
      typeof nombre !== "string" ||
      nombre.trim().length < 2 ||
      nombre.trim().length > 80 ||
      typeof descripcion !== "string" ||
      descripcion.trim().length > 300 ||
      !["camisetas", "botas", "balones", "accesorios"].includes(categoria) ||
      !esPrecioValido(precio) ||
      !Number.isInteger(stock) ||
      stock < 0 ||
      stock > 100000
    ) {
      return res.status(400).json({
        error:
          "Revisá los datos: el precio debe estar en puntos con hasta dos decimales y el stock debe ser un entero no negativo.",
      });
    }

    const producto = await comunidad.agregarProducto(
      nombre.trim(),
      descripcion.trim(),
      categoria,
      precio,
      stock,
    );

    res.status(201).json({ producto });
  });

  app.delete("/api/products/:id", requireAdmin, async (req, res) => {
    const eliminado = await comunidad.borrarProducto(req.params.id);
    if (!eliminado) {
      return res.status(404).json({ error: "Producto no encontrado." });
    }

    res.status(204).end();
  });

  app.get("/api/cart", requireAuth, (req, res) => {
    const lineas = comunidad
      .obtenerCarrito(req.user.id)
      .map((item) => {
        const producto = comunidad.buscarProducto(item.productoId);
        return producto ? { producto, cantidad: item.cantidad } : null;
      })
      .filter(Boolean);

    res.json({ lineas });
  });

  app.post("/api/cart/items", requireAuth, async (req, res) => {
    const { productoId, cantidad } = req.body || {};

    if (
      typeof productoId !== "string" ||
      !Number.isInteger(cantidad) ||
      cantidad < 1 ||
      cantidad > 1000
    ) {
      return res.status(400).json({ error: "Producto o cantidad inválidos." });
    }

    try {
      const carrito = await comunidad.agregarAlCarrito(
        req.user.id,
        productoId,
        cantidad,
      );
      res.status(201).json({ carrito });
    } catch (error) {
      if (error.code !== "community_rule") throw error;
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/cart/items/:productId", requireAuth, async (req, res) => {
    const { cantidad } = req.body || {};
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 1000) {
      return res.status(400).json({ error: "La cantidad no es válida." });
    }

    try {
      const carrito = await comunidad.actualizarCantidadCarrito(
        req.user.id,
        req.params.productId,
        cantidad,
      );
      res.json({ carrito });
    } catch (error) {
      if (error.code !== "community_rule") throw error;
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/cart/items/:productId", requireAuth, async (req, res) => {
    await comunidad.quitarDelCarrito(req.user.id, req.params.productId);
    res.status(204).end();
  });

  app.delete("/api/cart", requireAuth, async (req, res) => {
    await comunidad.vaciarCarrito(req.user.id);
    res.status(204).end();
  });

  app.post("/api/cart/checkout", requireAuth, async (req, res) => {
    try {
      const pedido = await comunidad.finalizarCompra(req.user.id);
      res.status(201).json({ pedido });
    } catch (error) {
      if (error.code !== "community_rule") throw error;
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/orders", requireAuth, (req, res) => {
    res.json({ pedidos: comunidad.listarPedidosDeUsuario(req.user.id) });
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const user = await users.register(req.body || {});
      startSession(res, user);
      res.status(201).json({ user: publicUser(user) });
    } catch (error) {
      if (error.code === "invalid_registration") {
        return res.status(400).json({ error: error.message });
      }
      if (error.code === "email_exists") {
        return res.status(409).json({ error: error.message });
      }
      next(error);
    }
  });

  app.post("/api/login", async (req, res) => {
    const user = await users?.verify(req.body?.email, req.body?.password);
    if (!user) {
      return res
        .status(401)
        .json({ error: "Correo o contraseña incorrectos." });
    }

    startSession(res, user);
    res.json({ user: publicUser(user) });
  });

  app.get("/api/me", requireAuth, (req, res) =>
    res.json({ user: publicUser(req.user) }),
  );

  app.post("/api/logout", requireAuth, (req, res) => {
    sessions.delete(req.sessionId);
    res.clearCookie(sessionCookieName, {
      httpOnly: true,
      sameSite: "lax",
      secure: production,
      path: "/",
    });
    res.status(204).end();
  });

  if (repositorioLigas) {
    app.use("/api/ligas", crearRouterLigas(repositorioLigas));
  }

  app.get("/auth.js", (req, res) =>
    res.sendFile(path.join(__dirname, "..", "..", "public", "js", "auth.js")),
  );

  app.get("/admin.html", (req, res, next) => {
    if (req.user?.role !== "admin") {
      return res.redirect("/index.html");
    }
    next();
  });

  app.use(express.static(path.join(__dirname, "..", "..", "public")));

  app.use((error, req, res, next) => {
    console.error(error);
    if (res.headersSent) return next(error);
    res
      .status(500)
      .json({ error: "Ocurrió un error interno. Intentá nuevamente." });
  });

  return app;
}

export default createApp;
