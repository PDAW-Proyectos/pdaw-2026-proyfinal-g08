import assert from "node:assert/strict";
import test from "node:test";
import { ForoService } from "../src/services/foro.service.js";

function crearServicioForo() {
  let publicacion = {
    id: "post-1",
    autorId: "user-1",
    autorNombre: "Ana",
    titulo: "Título original",
    texto: "Texto original",
    creadaEn: "2026-01-01T12:00:00.000Z",
  };
  const comunidadRepo = {
    actualizarPublicacion: async (id, cambios) => {
      if (id !== publicacion.id) return null;
      publicacion = { ...publicacion, ...cambios };
      return publicacion;
    },
  };
  return {
    foroService: new ForoService({ comunidadRepo, usuariosRepo: {} }),
    obtenerPublicacion: () => publicacion,
  };
}

test("editar publicación conserva autor e identidad y limpia título y texto", async () => {
  const { foroService, obtenerPublicacion } = crearServicioForo();

  const resultado = await foroService.editarPublicacion("post-1", {
    titulo: "  Nuevo título  ",
    texto: "  Nuevo texto  ",
  });

  assert.equal(resultado.publicacion.titulo, "Nuevo título");
  assert.equal(resultado.publicacion.texto, "Nuevo texto");
  assert.equal(resultado.publicacion.id, "post-1");
  assert.equal(resultado.publicacion.autorId, "user-1");
  assert.equal(obtenerPublicacion().creadaEn, "2026-01-01T12:00:00.000Z");
});

test("editar publicación rechaza contenido fuera de los límites", async () => {
  const { foroService } = crearServicioForo();

  await assert.rejects(
    foroService.editarPublicacion("post-1", {
      titulo: "ab",
      texto: "Texto",
    }),
    (error) => error.status === 400 && error.code === "invalid_post",
  );
  await assert.rejects(
    foroService.editarPublicacion("post-1", {
      titulo: "Título válido",
      texto: "x".repeat(2001),
    }),
    (error) => error.status === 400 && error.code === "invalid_post",
  );
});

test("editar publicación inexistente devuelve 404", async () => {
  const { foroService } = crearServicioForo();

  await assert.rejects(
    foroService.editarPublicacion("missing", {
      titulo: "Título válido",
      texto: "Texto válido",
    }),
    (error) => error.status === 404 && error.code === "post_not_found",
  );
});
