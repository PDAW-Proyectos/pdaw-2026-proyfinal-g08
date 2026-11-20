async function solicitar(url, opciones = {}) {
  const respuesta = await fetch(url, {
    headers: { "content-type": "application/json" },
    ...opciones,
  });

  if (respuesta.status === 204) return null;

  let resultado;
  try {
    resultado = await respuesta.json();
  } catch {
    throw new Error("El servidor devolvió una respuesta inválida.");
  }

  if (!respuesta.ok) {
    throw new Error(resultado.error || "No se pudo completar la solicitud.");
  }

  return resultado;
}

export async function listarPublicacionesAdmin() {
  const resultado = await solicitar("/api/admin/posts");
  return resultado.publicaciones;
}

export async function editarPublicacionAdmin(id, datos) {
  return solicitar(`/api/forum/posts/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(datos),
  });
}

export async function eliminarPublicacionAdmin(id) {
  return solicitar(`/api/forum/posts/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function listarUsuariosAdmin() {
  const resultado = await solicitar("/api/admin/users");
  return resultado.usuarios;
}

export async function cambiarEstadoUsuarioAdmin(id, status) {
  return solicitar(
    `/api/admin/users/${encodeURIComponent(id)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );
}

export async function darDeBajaUsuarioAdmin(id) {
  return solicitar(`/api/admin/users/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
