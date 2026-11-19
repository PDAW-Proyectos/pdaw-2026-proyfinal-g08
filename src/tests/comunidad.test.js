import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import createApp from "../js/app.js";
import { crearRepositorioComunidad } from "../js/Comunidad/RepositorioComunidad.js";
import { crearRepositorioConfiguracion } from "../js/Configuracion/RepositorioConfiguracion.js";

describe("funciones de foro y tienda", () => {
  let carpetaTemporal;
  let servidor;
  let baseUrl;
  let comunidad;
  let configuracion;

  const usuariosPrueba = [
    {
      id: "usuario-normal",
      name: "Aficionado",
      email: "usuario@example.com",
      favoriteTeam: "River Plate",
      role: "user",
    },
    {
      id: "usuario-admin",
      name: "Moderadora",
      email: "admin@example.com",
      favoriteTeam: null,
      role: "admin",
    },
  ];

  async function iniciarSesion(email) {
    const respuesta = await fetch(`${baseUrl}/api/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password: "clave-de-prueba" }),
    });

    expect(respuesta.status).toBe(200);
    return respuesta.headers.get("set-cookie").split(";")[0];
  }

  async function pedir(ruta, cookie, opciones = {}) {
    return fetch(`${baseUrl}${ruta}`, {
      ...opciones,
      headers: {
        ...(opciones.body ? { "content-type": "application/json" } : {}),
        ...(cookie ? { cookie } : {}),
        ...opciones.headers,
      },
    });
  }

  beforeEach(async () => {
    usuariosPrueba[0].name = "Aficionado";
    usuariosPrueba[1].name = "Moderadora";
    usuariosPrueba.forEach((usuario) => delete usuario.status);
    carpetaTemporal = await fs.mkdtemp(
      path.join(os.tmpdir(), "orsai-community-test-"),
    );
    comunidad = await crearRepositorioComunidad(
      path.join(carpetaTemporal, "comunidad.json"),
    );
    configuracion = await crearRepositorioConfiguracion(
      path.join(carpetaTemporal, "configuracion.json"),
    );

    const users = {
      findById(id) {
        return usuariosPrueba.find((usuario) => usuario.id === id) || null;
      },
      list() {
        return usuariosPrueba.map((usuario) => ({
          ...usuario,
          status: usuario.status || "active",
        }));
      },
      async verify(email, password) {
        const usuario = usuariosPrueba.find(
          (candidato) => candidato.email === email,
        );
        return password === "clave-de-prueba" &&
          usuario &&
          !["suspended", "deleted"].includes(usuario.status)
          ? usuario
          : null;
      },
      async setStatus(id, status) {
        const usuario = usuariosPrueba.find(
          (candidato) => candidato.id === id,
        );
        if (!usuario) return null;
        if (usuario.role === "admin") {
          const error = new Error("Cuenta protegida.");
          error.code = "protected_admin";
          throw error;
        }
        usuario.status = status;
        return usuario;
      },
      async deleteAccount(id) {
        const usuario = usuariosPrueba.find(
          (candidato) => candidato.id === id,
        );
        if (!usuario) return null;
        if (usuario.role === "admin") {
          const error = new Error("Cuenta protegida.");
          error.code = "protected_admin";
          throw error;
        }
        usuario.name = "Cuenta borrada";
        usuario.status = "deleted";
        return usuario;
      },
    };

    const app = createApp({ users, comunidad, configuracion });
    await new Promise((resolve) => {
      servidor = app.listen(0, "127.0.0.1", resolve);
    });
    baseUrl = `http://127.0.0.1:${servidor.address().port}`;
  });

  afterEach(async () => {
    await new Promise((resolve, reject) => {
      servidor.close((error) => (error ? reject(error) : resolve()));
    });
    await fs.rm(carpetaTemporal, { recursive: true, force: true });
  });

  test("solo un administrador puede borrar publicaciones, comentarios y productos", async () => {
    const usuarioCookie = await iniciarSesion("usuario@example.com");
    const adminCookie = await iniciarSesion("admin@example.com");

    const respuestaPublicacion = await pedir("/api/forum/posts", usuarioCookie, {
      method: "POST",
      body: JSON.stringify({ titulo: "Debate", texto: "Una publicación." }),
    });

    const { publicacion } = await respuestaPublicacion.json();

    const respuestaComentario = await pedir(
      `/api/forum/posts/${publicacion.id}/comments`,
      usuarioCookie,
      {
        method: "POST",
        body: JSON.stringify({ texto: "Un comentario." }),
      },
    );
    const { comentario } = await respuestaComentario.json();

    expect(
      (
        await pedir(`/api/forum/posts/${publicacion.id}`, usuarioCookie, {
          method: "DELETE",
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await pedir(`/api/forum/comments/${comentario.id}`, usuarioCookie, {
          method: "DELETE",
        })
      ).status,
    ).toBe(403);

    const respuestaProductos = await pedir("/api/products");
    const { productos } = await respuestaProductos.json();
    expect(
      (
        await pedir(`/api/products/${productos[0].id}`, usuarioCookie, {
          method: "DELETE",
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await pedir("/api/products", usuarioCookie, {
          method: "POST",
          body: JSON.stringify({
            nombre: "Producto",
            categoria: "balones",
            precio: 10,
            stock: 1,
          }),
        })
      ).status,
    ).toBe(403);

    expect(
      (
        await pedir(`/api/forum/comments/${comentario.id}`, adminCookie, {
          method: "DELETE",
        })
      ).status,
    ).toBe(204);
    expect(
      (
        await pedir(`/api/forum/posts/${publicacion.id}`, adminCookie, {
          method: "DELETE",
        })
      ).status,
    ).toBe(204);
    expect(
      (
        await pedir(`/api/products/${productos[0].id}`, adminCookie, {
          method: "DELETE",
        })
      ).status,
    ).toBe(204);
  });

  test("solo el administrador puede configurar y persistir el timeout de sesión", async () => {
    const cookieUsuario = await iniciarSesion("usuario@example.com");
    const cookieAdmin = await iniciarSesion("admin@example.com");

    const sinSesion = await pedir("/api/admin/settings", null);
    expect(sinSesion.status).toBe(401);
    const sinPermisos = await pedir("/api/admin/settings", cookieUsuario);
    expect(sinPermisos.status).toBe(403);

    const lecturaInicial = await pedir("/api/admin/settings", cookieAdmin);
    expect(await lecturaInicial.json()).toEqual({ sessionTimeoutMinutes: 10 });

    const actualizacionSinPermisos = await pedir(
      "/api/admin/settings/session-timeout",
      cookieUsuario,
      {
        method: "PATCH",
        body: JSON.stringify({ minutes: 30 }),
      },
    );
    expect(actualizacionSinPermisos.status).toBe(403);

    const invalido = await pedir(
      "/api/admin/settings/session-timeout",
      cookieAdmin,
      {
        method: "PATCH",
        body: JSON.stringify({ minutes: 0 }),
      },
    );
    expect(invalido.status).toBe(400);

    const actualizado = await pedir(
      "/api/admin/settings/session-timeout",
      cookieAdmin,
      {
        method: "PATCH",
        body: JSON.stringify({ minutes: 20 }),
      },
    );
    expect(await actualizado.json()).toEqual({ sessionTimeoutMinutes: 20 });

    const configuracionRecargada = await crearRepositorioConfiguracion(
      path.join(carpetaTemporal, "configuracion.json"),
    );
    expect(configuracionRecargada.obtenerMinutosTiempoSesion()).toBe(20);

    const login = await fetch(`${baseUrl}/api/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "usuario@example.com",
        password: "clave-de-prueba",
      }),
    });
    expect(login.headers.get("set-cookie")).toMatch(/Max-Age=1200/);
  });

  test("guarda los precios en puntos, actualiza el carrito y conserva el historial", async () => {
    const usuarioCookie = await iniciarSesion("usuario@example.com");
    const adminCookie = await iniciarSesion("admin@example.com");

    const respuestaProducto = await pedir("/api/products", adminCookie, {
      method: "POST",
      body: JSON.stringify({
        nombre: "Botines",
        descripcion: "Botines de práctica",
        categoria: "botas",
        precio: 12.5,
        stock: 5,
      }),
    });
    expect(respuestaProducto.status).toBe(201);
    const { producto } = await respuestaProducto.json();
    expect(producto.precio).toBe(12.5);

    await pedir("/api/cart/items", usuarioCookie, {
      method: "POST",
      body: JSON.stringify({ productoId: producto.id, cantidad: 1 }),
    });
    const respuestaCantidad = await pedir(
      `/api/cart/items/${producto.id}`,
      usuarioCookie,
      {
        method: "PATCH",
        body: JSON.stringify({ cantidad: 2 }),
      },
    );
    expect(respuestaCantidad.status).toBe(200);

    const respuestaCompra = await pedir("/api/cart/checkout", usuarioCookie, {
      method: "POST",
    });
    const { pedido } = await respuestaCompra.json();
    expect(pedido.total).toBe(25);
    expect(pedido.unidad).toBe("puntos");

    const historial = await pedir("/api/orders", usuarioCookie);
    const { pedidos } = await historial.json();
    expect(pedidos).toHaveLength(1);
    expect(pedidos[0].total).toBe(25);
    expect((await pedir("/api/cart", usuarioCookie)).status).toBe(200);
    const otroCarrito = await pedir("/api/cart", adminCookie);
    expect((await otroCarrito.json()).lineas).toHaveLength(0);
  });

  test("el perfil público no revela correo ni credenciales", async () => {
    const usuarioCookie = await iniciarSesion("usuario@example.com");
    const publicacionResponse = await pedir("/api/forum/posts", usuarioCookie, {
      method: "POST",
      body: JSON.stringify({
        titulo: "Mi tema",
        texto: "Una opinión sobre el partido.",
      }),
    });
    const { publicacion } = await publicacionResponse.json();
    await pedir(
      `/api/forum/posts/${publicacion.id}/comments`,
      usuarioCookie,
      {
        method: "POST",
        body: JSON.stringify({ texto: "Mi comentario." }),
      },
    );

    const respuestaPublica = await pedir("/api/users/usuario-normal");
    const datos = await respuestaPublica.json();

    expect(respuestaPublica.status).toBe(200);
    expect(datos.perfil).toEqual({
      id: "usuario-normal",
      name: "Aficionado",
      favoriteTeam: "River Plate",
    });
    expect(datos.publicaciones).toHaveLength(1);
    expect(datos.comentarios).toHaveLength(1);
    expect(JSON.stringify(datos)).not.toContain("email");
    expect(JSON.stringify(datos)).not.toContain("passwordHash");
  });

  test("solo el administrador gestiona usuarios y las cuentas eliminadas quedan ocultas al público", async () => {
    const usuarioCookie = await iniciarSesion("usuario@example.com");
    const adminCookie = await iniciarSesion("admin@example.com");
    const respuestaPublicacion = await pedir("/api/forum/posts", usuarioCookie, {
      method: "POST",
      body: JSON.stringify({ titulo: "Tema de evidencia", texto: "Texto privado." }),
    });
    const { publicacion } = await respuestaPublicacion.json();
    const respuestaComentario = await pedir(
      `/api/forum/posts/${publicacion.id}/comments`,
      usuarioCookie,
      {
        method: "POST",
        body: JSON.stringify({ texto: "Comentario de evidencia." }),
      },
    );
    const { comentario } = await respuestaComentario.json();

    expect((await pedir("/api/admin/users", usuarioCookie)).status).toBe(403);
    expect(
      (
        await pedir("/admin.html", null, { redirect: "manual" })
      ).status,
    ).toBe(302);

    const listaUsuarios = await pedir("/api/admin/users", adminCookie);
    expect(listaUsuarios.status).toBe(200);
    const datosUsuarios = await listaUsuarios.json();
    expect(JSON.stringify(datosUsuarios)).not.toContain("passwordHash");

    const suspender = await pedir(
      "/api/admin/users/usuario-normal/status",
      adminCookie,
      {
        method: "PATCH",
        body: JSON.stringify({ status: "suspended" }),
      },
    );
    expect(suspender.status).toBe(200);
    expect((await pedir("/api/me", usuarioCookie)).status).toBe(401);

    const reactivar = await pedir(
      "/api/admin/users/usuario-normal/status",
      adminCookie,
      {
        method: "PATCH",
        body: JSON.stringify({ status: "active" }),
      },
    );
    expect(reactivar.status).toBe(200);
    const sesionReactivada = await iniciarSesion("usuario@example.com");

    const eliminar = await pedir(
      "/api/admin/users/usuario-normal",
      adminCookie,
      { method: "DELETE" },
    );
    const cuentaBorrada = (await eliminar.json()).usuario;
    expect(eliminar.status).toBe(200);
    expect(cuentaBorrada.name).toBe("Cuenta borrada");
    expect(cuentaBorrada.email).toBe("usuario@example.com");
    expect(cuentaBorrada.status).toBe("deleted");
    expect((await pedir("/api/me", sesionReactivada)).status).toBe(401);
    expect((await pedir("/api/users/usuario-normal")).status).toBe(404);
    expect(
      (await (await pedir("/api/forum/posts")).json()).publicaciones,
    ).toHaveLength(0);
    expect(
      (
        await pedir(`/api/forum/posts/${publicacion.id}/comments`)
      ).status,
    ).toBe(404);
    expect(
      (
        await pedir(
          `/api/forum/posts/${publicacion.id}/comments`,
          adminCookie,
          {
            method: "POST",
            body: JSON.stringify({ texto: "No debe poder comentarse." }),
          },
        )
      ).status,
    ).toBe(404);

    const publicacionesAdmin = await pedir("/api/admin/posts", adminCookie);
    const datosAdmin = await publicacionesAdmin.json();
    expect(datosAdmin.publicaciones[0].texto).toBe("Texto privado.");
    expect(datosAdmin.publicaciones[0].comentarios[0].id).toBe(comentario.id);
    expect(
      (
        await (
          await pedir("/api/admin/users", adminCookie)
        ).json()
      ).usuarios.find((usuario) => usuario.id === "usuario-normal").email,
    ).toBe("usuario@example.com");
    expect(
      (
        await pedir("/api/admin/users/usuario-admin", adminCookie, {
          method: "DELETE",
        })
      ).status,
    ).toBe(403);
  });
});
