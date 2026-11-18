import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { Equipo } from "../src/js/Futbol/Equipo.js";
import { RepositorioEquipos } from "../src/js/Futbol/RepositorioEquipos.js";
import { RepositorioLigas } from "../src/js/Futbol/RepositorioLigas.js";
import { RepositorioPartidos } from "../src/js/Futbol/RepositorioPartidos.js";
import { Partido } from "../src/js/Futbol/Partido.js";
import { ServicioFutbol } from "../src/js/Futbol/ServicioFutbol.js";
import { createApp } from "../src/js/app.js";

test("el modelo Equipo inicializa atributos correctamente con objeto y con parámetros posicionales", () => {
  const eqObjeto = new Equipo({
    id: "133604",
    nombre: "Arsenal",
    escudo: "https://example.com/arsenal.png",
    estadio: "Emirates Stadium",
    pais: "England",
    fundacion: "1886",
  });

  assert.equal(eqObjeto.obtenerId, "133604");
  assert.equal(eqObjeto.obtenerNombre, "Arsenal");
  assert.equal(eqObjeto.obtenerEscudo, "https://example.com/arsenal.png");
  assert.equal(eqObjeto.obtenerEstadio, "Emirates Stadium");
  assert.equal(eqObjeto.pais, "England");

  const eqPosicional = new Equipo("133602", "Liverpool", "https://example.com/liverpool.png");
  assert.equal(eqPosicional.obtenerId, "133602");
  assert.equal(eqPosicional.obtenerNombre, "Liverpool");
  assert.equal(eqPosicional.obtenerEscudo, "https://example.com/liverpool.png");
});

test("RepositorioEquipos agrega, fusiona y busca equipos por ID o nombre normalizado", () => {
  const repo = new RepositorioEquipos();
  repo.agregarEquipo({
    id: "133670",
    nombre: "Mainz",
    escudo: "https://example.com/mainz.png",
  });

  // Fusión preservando escudo
  repo.agregarEquipo({
    id: "133670",
    estadio: "MEWA ARENA",
  });

  const eqPorId = repo.buscarEquipo("133670");
  assert.equal(eqPorId.nombre, "Mainz");
  assert.equal(eqPorId.escudo, "https://example.com/mainz.png");
  assert.equal(eqPorId.estadio, "MEWA ARENA");

  // Búsqueda por nombre insensible a mayúsculas
  const eqPorNombre = repo.buscarEquipo("mainz");
  assert.equal(eqPorNombre.id, "133670");

  assert.throws(() => repo.buscarEquipo("equipo_inexistente"), /no existe/i);
});

test("RepositorioEquipos.obtenerDetalleCompleto vincula posición, liga y partidos", async () => {
  const repoEquipos = new RepositorioEquipos();
  repoEquipos.agregarEquipo({
    id: "133739",
    nombre: "Barcelona",
    escudo: "https://example.com/barca.png",
  });

  const repoLigas = new RepositorioLigas();
  repoLigas.agregarLiga({
    id: "4335",
    nombre: "LaLiga",
    pais: "Spain",
    temporada: "2026-2027",
    tabla: [
      {
        idEquipo: "133739",
        nombreEquipo: "Barcelona",
        posicion: "1",
        partidosJugados: "10",
        victorias: "9",
        empates: "0",
        derrotas: "1",
        puntos: "27",
        golesFavor: "33",
        golesContra: "10",
        diferenciaGol: "23",
      },
    ],
  });

  const repoPartidos = new RepositorioPartidos();
  repoPartidos.agregarPartido(
    new Partido({
      id: "partido-1",
      idLiga: "4335",
      nombreLiga: "LaLiga",
      idEquipoLocal: "133739",
      nombreEquipoLocal: "Barcelona",
      idEquipoVisitante: "133738",
      nombreEquipoVisitante: "Real Madrid",
      fecha: "2026-11-25",
      estado: "NS",
    })
  );
  repoPartidos.agregarPartido(
    new Partido({
      id: "partido-2",
      idLiga: "4335",
      nombreLiga: "LaLiga",
      idEquipoLocal: "133739",
      nombreEquipoLocal: "Barcelona",
      idEquipoVisitante: "133737",
      nombreEquipoVisitante: "Espanyol",
      golesLocal: "3",
      golesVisitante: "1",
      fecha: "2026-11-03",
      estado: "FT",
    })
  );

  const detalle = await repoEquipos.obtenerDetalleCompleto("133739", {
    repositorioLigas: repoLigas,
    repositorioPartidos: repoPartidos,
  });

  assert.equal(detalle.id, "133739");
  assert.equal(detalle.nombre, "Barcelona");
  assert.equal(detalle.posicion.posicion, "1");
  assert.equal(detalle.posicion.puntos, "27");
  assert.equal(detalle.liga.nombre, "LaLiga");
  assert.equal(detalle.proximoPartido.id, "partido-1");
  assert.equal(detalle.ultimoPartido.id, "partido-2");
});

test("los endpoints de /api/equipos entregan datos correctamente", async () => {
  const repoEquipos = new RepositorioEquipos();
  repoEquipos.agregarEquipo({
    id: "133604",
    nombre: "Arsenal",
    escudo: "https://example.com/arsenal.png",
  });

  const app = createApp({
    repositorioEquipos: repoEquipos,
  });

  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const resList = await fetch(`${baseUrl}/api/equipos`);
    assert.equal(resList.status, 200);
    const lista = await resList.json();
    assert.equal(lista.length, 1);
    assert.equal(lista[0].nombre, "Arsenal");

    const resDetalle = await fetch(`${baseUrl}/api/equipos/133604`);
    assert.equal(resDetalle.status, 200);
    const detalle = await resDetalle.json();
    assert.equal(detalle.id, "133604");
    assert.equal(detalle.nombre, "Arsenal");

    const resInexistente = await fetch(`${baseUrl}/api/equipos/999999`);
    assert.equal(resInexistente.status, 404);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("Partido encapsula descripcion con getter/setter y toJSON", () => {
  const partido = new Partido({
    id: "evt-10",
    nombreEquipoLocal: "Liverpool",
    nombreEquipoVisitante: "Arsenal",
    descripcion: "Clásico de Premier League",
  });

  assert.equal(Object.keys(partido).length, 0);
  assert.equal(partido.descripcion, "Clásico de Premier League");

  partido.descripcion = "Duelo en Anfield";
  assert.equal(partido.descripcion, "Duelo en Anfield");
  assert.equal(partido.toJSON().descripcion, "Duelo en Anfield");
});

test("GET /api/equipos/buscar busca local, en tablas cargadas y cae a searchteams.php solo para futbol anexando a equipos.json", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ofsai-buscador-"));
  const rutas = {
    rutaLigas: path.join(dir, "ligas.json"),
    rutaProximos: path.join(dir, "proximos_partidos.json"),
    rutaJugados: path.join(dir, "partidos_jugados.json"),
    rutaEquipos: path.join(dir, "equipos.json"),
  };

  try {
    fs.writeFileSync(
      rutas.rutaEquipos,
      JSON.stringify(
        [{ id: "133604", nombre: "Arsenal", escudo: "https://example.com/ars.png", pais: "England" }],
        null,
        2
      )
    );

    const llamadas = [];
    const mockFetch = async (url) => {
      const urlStr = String(url);
      llamadas.push(urlStr);
      if (urlStr.includes("searchteams.php")) {
        return {
          ok: true,
          status: 200,
          headers: { get: () => null },
          async json() {
            return {
              teams: [
                {
                  idTeam: "134860",
                  strTeam: "Valencia",
                  strSport: "Soccer",
                  strBadge: "https://example.com/valencia.png",
                  strCountry: "Spain",
                  idLeague: "4335",
                  strLeague: "Spanish La Liga",
                },
                {
                  idTeam: "999001",
                  strTeam: "Valencia Basket",
                  strSport: "Basketball",
                  strBadge: "https://example.com/basket.png",
                  strCountry: "Spain",
                },
              ],
            };
          },
        };
      }
      return { ok: true, status: 200, headers: { get: () => null }, async json() { return {}; } };
    };

    const servicio = new ServicioFutbol(mockFetch, rutas);
    const repoEquipos = new RepositorioEquipos();
    repoEquipos.agregarEquipos(servicio.cargarEquiposLocal());

    const repoLigas = new RepositorioLigas();
    repoLigas.agregarLiga({
      id: "4328",
      nombre: "English Premier League",
      pais: "England",
      tabla: [
        {
          idEquipo: "133610",
          nombreEquipo: "Chelsea",
          escudoEquipo: "https://example.com/chelsea.png",
        },
      ],
    });

    const app = createApp({
      repositorioEquipos: repoEquipos,
      repositorioLigas: repoLigas,
      servicioFutbol: servicio,
    });

    const server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    const baseUrl = `http://127.0.0.1:${server.address().port}`;

    try {
      // 1. Coincidencia local (Arsenal) -> 0 llamadas a la API
      const resLocal = await fetch(`${baseUrl}/api/equipos/buscar?q=ars`);
      assert.equal(resLocal.status, 200);
      const bodyLocal = await resLocal.json();
      assert.equal(bodyLocal.length, 1);
      assert.equal(bodyLocal[0].nombre, "Arsenal");
      assert.equal(llamadas.length, 0);

      // 2. Coincidencia desde tabla de liga cargada (Chelsea) -> 0 llamadas a la API
      const resTabla = await fetch(`${baseUrl}/api/equipos/buscar?q=chel`);
      assert.equal(resTabla.status, 200);
      const bodyTabla = await resTabla.json();
      assert.equal(bodyTabla.length, 1);
      assert.equal(bodyTabla[0].nombre, "Chelsea");
      assert.equal(llamadas.length, 0);

      // 3. Sin coincidencia local y >= 3 caracteres (Valencia) -> consulta searchteams.php y filtra solo Soccer
      const resRemoto = await fetch(`${baseUrl}/api/equipos/buscar?q=valencia`);
      assert.equal(resRemoto.status, 200);
      const bodyRemoto = await resRemoto.json();
      assert.equal(bodyRemoto.length, 1);
      assert.equal(bodyRemoto[0].nombre, "Valencia");
      assert.equal(llamadas.length, 1);

      // Valencia quedó anexado en equipos.json sin borrar Arsenal
      const enDisco = JSON.parse(fs.readFileSync(rutas.rutaEquipos, "utf-8"));
      assert.equal(enDisco.length, 2);
      assert.ok(enDisco.some((e) => e.id === "133604"));
      assert.ok(enDisco.some((e) => e.id === "134860"));

      // 4. Segunda búsqueda por Valencia ya responde desde caché local sin volver a llamar a la API
      const resRepetido = await fetch(`${baseUrl}/api/equipos/buscar?q=valencia`);
      assert.equal(resRepetido.status, 200);
      const bodyRepetido = await resRepetido.json();
      assert.equal(bodyRepetido[0].nombre, "Valencia");
      assert.equal(llamadas.length, 1);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("GET /api/equipos/:id consulta próximo y último partido bajo demanda y anexa jugados a partidos_jugados.json", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ofsai-eq-partidos-"));
  const rutas = {
    rutaLigas: path.join(dir, "ligas.json"),
    rutaProximos: path.join(dir, "proximos_partidos.json"),
    rutaJugados: path.join(dir, "partidos_jugados.json"),
    rutaEquipos: path.join(dir, "equipos.json"),
  };

  try {
    fs.writeFileSync(
      rutas.rutaEquipos,
      JSON.stringify(
        [{ id: "133619", nombre: "Real Betis", escudo: "https://example.com/betis.png", pais: "Spain" }],
        null,
        2
      )
    );
    fs.writeFileSync(
      rutas.rutaJugados,
      JSON.stringify(
        [{ id: "hist-prev", idLiga: "4328", nombreEquipoLocal: "Arsenal", nombreEquipoVisitante: "Chelsea", golesLocal: "2", golesVisitante: "0", estado: "FT", fecha: "2026-10-01" }],
        null,
        2
      )
    );

    const llamadas = [];
    const mockFetch = async (url) => {
      const urlStr = String(url);
      llamadas.push(urlStr);

      if (urlStr.includes("eventsnext.php?id=133619")) {
        return {
          ok: true,
          status: 200,
          headers: { get: () => null },
          async json() {
            return {
              events: [
                {
                  idEvent: "betis-next-1",
                  idLeague: "4335",
                  strLeague: "Spanish La Liga",
                  idHomeTeam: "133619",
                  strHomeTeam: "Real Betis",
                  idAwayTeam: "133739",
                  strAwayTeam: "Barcelona",
                  dateEvent: "2026-12-05",
                  strTime: "20:00:00",
                  strStatus: "NS",
                },
                {
                  idEvent: "betis-next-conf",
                  idLeague: "4481",
                  strLeague: "UEFA Europa Conference League",
                  idHomeTeam: "133619",
                  strHomeTeam: "Real Betis",
                  idAwayTeam: "133999",
                  strAwayTeam: "Fiorentina",
                  dateEvent: "2026-12-10",
                  strTime: "21:00:00",
                  strStatus: "NS",
                },
              ],
            };
          },
        };
      }

      if (urlStr.includes("eventslast.php?id=133619")) {
        return {
          ok: true,
          status: 200,
          headers: { get: () => null },
          async json() {
            return {
              results: [
                {
                  idEvent: "betis-last-1",
                  idLeague: "4335",
                  strLeague: "Spanish La Liga",
                  idHomeTeam: "133738",
                  strHomeTeam: "Real Madrid",
                  idAwayTeam: "133619",
                  strAwayTeam: "Real Betis",
                  intHomeScore: "1",
                  intAwayScore: "1",
                  dateEvent: "2026-11-08",
                  strTime: "18:30:00",
                  strStatus: "FT",
                },
              ],
            };
          },
        };
      }

      return { ok: true, status: 200, headers: { get: () => null }, async json() { return {}; } };
    };

    fs.writeFileSync(
      rutas.rutaProximos,
      JSON.stringify(
        [{ id: "prox-prev", idLiga: "4328", nombreEquipoLocal: "Arsenal", nombreEquipoVisitante: "Chelsea", estado: "NS", fecha: "2026-12-01" }],
        null,
        2
      )
    );

    const servicio = new ServicioFutbol(mockFetch, rutas);
    const repoEquipos = new RepositorioEquipos();
    repoEquipos.agregarEquipos(servicio.cargarEquiposLocal());
    const repoPartidos = new RepositorioPartidos();
    repoPartidos.agregarPartidos(servicio.cargarProximosPartidosLocal());
    repoPartidos.agregarPartidos(servicio.cargarPartidosJugadosLocal());

    const app = createApp({
      repositorioEquipos: repoEquipos,
      repositorioPartidos: repoPartidos,
      servicioFutbol: servicio,
    });

    const server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    const baseUrl = `http://127.0.0.1:${server.address().port}`;

    try {
      const res1 = await fetch(`${baseUrl}/api/equipos/133619`);
      assert.equal(res1.status, 200);
      const detalle1 = await res1.json();
      assert.equal(detalle1.proximoPartido.id, "betis-next-1");
      assert.equal(detalle1.proximoPartido.escudoEquipoLocal, "https://example.com/betis.png");
      assert.equal(detalle1.ultimoPartido.id, "betis-last-1");
      assert.equal(detalle1.ultimoPartido.escudoEquipoVisitante, "https://example.com/betis.png");
      assert.equal(llamadas.length, 2);

      // proximos_partidos.json conservó prox-prev y anexó los próximos partidos descubiertos (incluso otras competiciones)
      const proximosDisco = JSON.parse(fs.readFileSync(rutas.rutaProximos, "utf-8"));
      assert.equal(proximosDisco.length, 3);
      assert.ok(proximosDisco.some((p) => p.id === "prox-prev"));
      assert.ok(proximosDisco.some((p) => p.id === "betis-next-1"));
      assert.ok(proximosDisco.some((p) => p.id === "betis-next-conf"));

      // partidos_jugados.json conservó hist-prev y anexó betis-last-1
      const jugadosDisco = JSON.parse(fs.readFileSync(rutas.rutaJugados, "utf-8"));
      assert.equal(jugadosDisco.length, 2);
      assert.equal(jugadosDisco[0].id, "hist-prev");
      assert.equal(jugadosDisco[1].id, "betis-last-1");

      // Segunda consulta ya no vuelve a llamar a eventsnext ni eventslast
      const res2 = await fetch(`${baseUrl}/api/equipos/133619`);
      assert.equal(res2.status, 200);
      assert.equal(llamadas.length, 2);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

