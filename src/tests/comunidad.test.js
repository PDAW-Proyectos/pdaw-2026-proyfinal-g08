import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import createApp from "../js/app.js";
import { crearRepositorioComunidad } from "../js/Comunidad/RepositorioComunidad.js";

describe("funciones de foro y tienda", () => {
  let carpetaTemporal;
  let servidor;
  let baseUrl;
  let comunidad;

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
    carpetaTemporal = await fs.mkdtemp(
      path.join(os.tmpdir(), "orsai-community-test-"),
    );
    comunidad = await crearRepositorioComunidad(
      path.join(carpetaTemporal, "comunidad.json"),
    );

    const users = {
      findById(id) {
        return usuariosPrueba.find((usuario) => usuario.id === id) || null;
      },
      async verify(email, password) {
        return password === "clave-de-prueba"
          ? usuariosPrueba.find((usuario) => usuario.email === email) || null
          : null;
      },
    };

    const app = createApp({ users, comunidad });
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

  test("guarda los precios en dólares, actualiza el carrito y conserva el historial", async () => {
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
    expect(pedido.moneda).toBe("USD");

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
});
