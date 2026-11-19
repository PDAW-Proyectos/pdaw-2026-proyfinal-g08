import assert from "node:assert/strict";
import { test } from "node:test";
import { createApp } from "../src/app.js";
import { LigasRepository } from "../src/repositories/LigasRepository.js";
import { PartidosRepository } from "../src/repositories/PartidosRepository.js";
import { EquiposRepository } from "../src/repositories/EquiposRepository.js";
import { ApiFutbolService } from "../src/services/apiFutbol.service.js";
import { LigasService } from "../src/services/ligas.service.js";
import { PartidosService } from "../src/services/partidos.service.js";
import { EquiposService } from "../src/services/equipos.service.js";
import { formatearErrorHttp, fetchJsonSeguro } from "../public/js/utils.js";

async function conServidor(app, fn) {
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  try {
    await fn(baseUrl);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("el backend devuelve errores JSON explícitos con código HTTP para rutas inválidas, JSON malformado y parámetros incorrectos", async () => {
  const ligasRepo = new LigasRepository();
  ligasRepo.agregar({ id: "4328", nombre: "Premier League", pais: "England" });
  const partidosRepo = new PartidosRepository();
  const equiposRepo = new EquiposRepository();

  const app = createApp({
    authService: {
      sessionDurationMs: 60000,
      obtenerUsuarioPorSesion: () => null,
      iniciarSesion: async () => {
        throw new Error("Fallo inesperado en almacén");
      },
    },
    ligasService: new LigasService({ ligasRepo, partidosRepo }),
    partidosService: new PartidosService({ partidosRepo }),
    equiposService: new EquiposService({ equiposRepo, ligasRepo, partidosRepo }),
  });

  await conServidor(app, async (baseUrl) => {
    const resRuta = await fetch(`${baseUrl}/api/no-existe`);
    assert.equal(resRuta.status, 404);
    const bodyRuta = await resRuta.json();
    assert.equal(bodyRuta.status, 404);
    assert.equal(bodyRuta.code, "route_not_found");
    assert.match(bodyRuta.error, /no existe/i);

    const resJsonMalo = await fetch(`${baseUrl}/api/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{json-roto",
    });
    assert.equal(resJsonMalo.status, 400);
    const bodyJsonMalo = await resJsonMalo.json();
    assert.equal(bodyJsonMalo.code, "invalid_json");

    const resLoginIncompleto = await fetch(`${baseUrl}/api/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "ana@ejemplo.com" }),
    });
    assert.equal(resLoginIncompleto.status, 400);
    assert.equal((await resLoginIncompleto.json()).code, "invalid_login");

    const resLoginError500 = await fetch(`${baseUrl}/api/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "ana@ejemplo.com", password: "secreta" }),
    });
    assert.equal(resLoginError500.status, 500);
    const body500 = await resLoginError500.json();
    assert.equal(body500.code, "internal_error");
    assert.match(body500.error, /interno/i);

    const resLimiteInvalido = await fetch(`${baseUrl}/api/partidos/proximos?limite=abc`);
    assert.equal(resLimiteInvalido.status, 400);
    assert.equal((await resLimiteInvalido.json()).code, "invalid_limit");

    const resTipoInvalido = await fetch(`${baseUrl}/api/partidos?tipo=otro`);
    assert.equal(resTipoInvalido.status, 400);
    assert.equal((await resTipoInvalido.json()).code, "invalid_type");

    const resPartido404 = await fetch(`${baseUrl}/api/partidos/no-existe`);
    assert.equal(resPartido404.status, 404);
    assert.equal((await resPartido404.json()).code, "match_not_found");

    const resLiga404 = await fetch(`${baseUrl}/api/ligas/99999`);
    assert.equal(resLiga404.status, 404);
    assert.equal((await resLiga404.json()).code, "league_not_found");

    const resEquiposSinQuery = await fetch(`${baseUrl}/api/equipos/buscar`);
    assert.equal(resEquiposSinQuery.status, 400);
    assert.equal((await resEquiposSinQuery.json()).code, "missing_query");

    const resEquipoPartidos404 = await fetch(`${baseUrl}/api/equipos/999999/partidos`);
    assert.equal(resEquipoPartidos404.status, 404);
    assert.equal((await resEquipoPartidos404.json()).code, "team_not_found");
  });
});

test("los fallos de la API externa devuelven códigos 429 y 502 explícitos", async () => {
  const api429 = new ApiFutbolService(async () => ({
    ok: false,
    status: 429,
    headers: { get: () => "30" },
  }));
  const app429 = createApp({
    equiposService: new EquiposService({
      equiposRepo: new EquiposRepository(),
      apiFutbol: api429,
    }),
  });

  await conServidor(app429, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/equipos/buscar?q=valencia`);
    assert.equal(res.status, 429);
    const body = await res.json();
    assert.equal(body.code, "rate_limited");
    assert.match(body.error, /30 s/);
  });

  const api502 = new ApiFutbolService(async () => ({
    ok: false,
    status: 503,
    headers: { get: () => null },
  }));
  const ligasRepo = new LigasRepository();
  ligasRepo.agregar({ id: "4328", nombre: "Premier League", pais: "England" });
  const app502 = createApp({
    ligasService: new LigasService({ ligasRepo, apiFutbol: api502 }),
    equiposService: new EquiposService({
      equiposRepo: new EquiposRepository(),
      apiFutbol: api502,
    }),
  });

  await conServidor(app502, async (baseUrl) => {
    const resBuscar = await fetch(`${baseUrl}/api/equipos/buscar?q=valencia`);
    assert.equal(resBuscar.status, 502);
    const bodyBuscar = await resBuscar.json();
    assert.equal(bodyBuscar.code, "external_api_error");

    const resLiga = await fetch(`${baseUrl}/api/ligas/4328`);
    assert.equal(resLiga.status, 200);
    const liga = await resLiga.json();
    assert.match(liga.errorTabla, /^Error 502:/);
  });
});

test("fetchJsonSeguro y formatearErrorHttp muestran el código HTTP y causa breve en el cliente", async () => {
  assert.equal(
    formatearErrorHttp({ status: 404, message: "El equipo no existe." }),
    "Error 404: El equipo no existe."
  );
  assert.equal(
    formatearErrorHttp({ status: 404, message: "Error 404: El equipo no existe." }),
    "Error 404: El equipo no existe."
  );

  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      new Response("<html>Error del servidor</html>", {
        status: 502,
        headers: { "content-type": "text/html" },
      });

    await assert.rejects(
      () => fetchJsonSeguro("/api/ligas"),
      (err) => err.status === 502 && err.message.startsWith("Error 502:")
    );

    globalThis.fetch = async () => {
      throw new TypeError("Failed to fetch");
    };

    await assert.rejects(
      () => fetchJsonSeguro("/api/ligas"),
      (err) => err.status === 0 && err.message.startsWith("Error de conexión:")
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
