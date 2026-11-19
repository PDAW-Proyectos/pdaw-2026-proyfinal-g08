import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { Equipo } from "../src/models/Equipo.js";
import { Partido } from "../src/models/Partido.js";
import { EquiposRepository } from "../src/repositories/EquiposRepository.js";
import { LigasRepository } from "../src/repositories/LigasRepository.js";
import { PartidosRepository } from "../src/repositories/PartidosRepository.js";
import { ApiFutbolService } from "../src/services/apiFutbol.service.js";
import { PartidosService } from "../src/services/partidos.service.js";
import { EquiposService } from "../src/services/equipos.service.js";
import { createApp } from "../src/app.js";

test("el modelo Equipo inicializa atributos correctamente y serializa con toJSON", () => {
  const eq = new Equipo({
    id: "133604",
    nombre: "Arsenal",
    escudo: "https://example.com/arsenal.png",
    estadio: "Emirates Stadium",
    pais: "England",
    fundacion: "1886",
  });

  assert.equal(eq.id, "133604");
  assert.equal(eq.nombre, "Arsenal");
  assert.equal(eq.escudo, "https://example.com/arsenal.png");
  assert.equal(eq.estadio, "Emirates Stadium");
  assert.equal(eq.pais, "England");
  assert.equal(eq.toJSON().fundacion, "1886");
});

test("EquiposRepository agrega, fusiona y busca equipos por ID o nombre normalizado", () => {
  const repo = new EquiposRepository();
  repo.agregar({
    id: "133670",
    nombre: "Mainz",
    escudo: "https://example.com/mainz.png",
  });

  repo.agregar({
    id: "133670",
    estadio: "MEWA ARENA",
  });

  const eqPorId = repo.buscar("133670");
  assert.equal(eqPorId.nombre, "Mainz");
  assert.equal(eqPorId.escudo, "https://example.com/mainz.png");
  assert.equal(eqPorId.estadio, "MEWA ARENA");

  const eqPorNombre = repo.buscar("mainz");
  assert.equal(eqPorNombre.id, "133670");

  assert.throws(() => repo.buscar("equipo_inexistente"), /no existe/i);
});

test("EquiposService.obtenerDetalleCompleto vincula posición, liga y partidos", async () => {
  const equiposRepo = new EquiposRepository();
  equiposRepo.agregar({
    id: "133739",
    nombre: "Barcelona",
    escudo: "https://example.com/barca.png",
  });

  const ligasRepo = new LigasRepository();
  ligasRepo.agregar({
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

  const partidosRepo = new PartidosRepository();
  partidosRepo.agregar(
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
  partidosRepo.agregar(
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

  const equiposService = new EquiposService({ equiposRepo, ligasRepo, partidosRepo });
  const detalle = await equiposService.obtenerDetalleCompleto("133739");

  assert.equal(detalle.id, "133739");
  assert.equal(detalle.nombre, "Barcelona");
  assert.equal(detalle.posicion.posicion, "1");
  assert.equal(detalle.posicion.puntos, "27");
  assert.equal(detalle.liga.nombre, "LaLiga");
  assert.equal(detalle.proximoPartido.id, "partido-1");
  assert.equal(detalle.ultimoPartido.id, "partido-2");
});

test("los endpoints de /api/equipos entregan datos correctamente", async () => {
  const equiposRepo = new EquiposRepository();
  equiposRepo.agregar({
    id: "133604",
    nombre: "Arsenal",
    escudo: "https://example.com/arsenal.png",
  });

  const app = createApp({
    equiposService: new EquiposService({ equiposRepo }),
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
  const rutaEquipos = path.join(dir, "equipos.json");

  try {
    fs.writeFileSync(
      rutaEquipos,
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

    const apiFutbol = new ApiFutbolService(mockFetch);
    const equiposRepo = new EquiposRepository(rutaEquipos);
    equiposRepo.cargarLocal();

    const ligasRepo = new LigasRepository();
    ligasRepo.agregar({
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
      equiposService: new EquiposService({ equiposRepo, ligasRepo, apiFutbol }),
    });

    const server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    const baseUrl = `http://127.0.0.1:${server.address().port}`;

    try {
      const resLocal = await fetch(`${baseUrl}/api/equipos/buscar?q=ars`);
      assert.equal(resLocal.status, 200);
      const bodyLocal = await resLocal.json();
      assert.equal(bodyLocal.length, 1);
      assert.equal(bodyLocal[0].nombre, "Arsenal");
      assert.equal(llamadas.length, 0);

      const resTabla = await fetch(`${baseUrl}/api/equipos/buscar?q=chel`);
      assert.equal(resTabla.status, 200);
      const bodyTabla = await resTabla.json();
      assert.equal(bodyTabla.length, 1);
      assert.equal(bodyTabla[0].nombre, "Chelsea");
      assert.equal(llamadas.length, 0);

      const resRemoto = await fetch(`${baseUrl}/api/equipos/buscar?q=valencia`);
      assert.equal(resRemoto.status, 200);
      const bodyRemoto = await resRemoto.json();
      assert.equal(bodyRemoto.length, 1);
      assert.equal(bodyRemoto[0].nombre, "Valencia");
      assert.equal(llamadas.length, 1);

      const enDisco = JSON.parse(fs.readFileSync(rutaEquipos, "utf-8"));
      assert.equal(enDisco.length, 2);
      assert.ok(enDisco.some((e) => e.id === "133604"));
      assert.ok(enDisco.some((e) => e.id === "134860"));

      const resRepetido = await fetch(`${baseUrl}/api/equipos/buscar?q=valencia`);
      assert.equal(resRepetido.status, 200);
      assert.equal((await resRepetido.json())[0].nombre, "Valencia");
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
  const rutaEquipos = path.join(dir, "equipos.json");
  const rutaProximos = path.join(dir, "proximos_partidos.json");
  const rutaJugados = path.join(dir, "partidos_jugados.json");

  try {
    fs.writeFileSync(
      rutaEquipos,
      JSON.stringify(
        [{ id: "133619", nombre: "Real Betis", escudo: "https://example.com/betis.png", pais: "Spain" }],
        null,
        2
      )
    );
    fs.writeFileSync(
      rutaJugados,
      JSON.stringify(
        [{ id: "hist-prev", idLiga: "4328", nombreEquipoLocal: "Arsenal", nombreEquipoVisitante: "Chelsea", golesLocal: "2", golesVisitante: "0", estado: "FT", fecha: "2026-10-01" }],
        null,
        2
      )
    );
    fs.writeFileSync(
      rutaProximos,
      JSON.stringify(
        [{ id: "prox-prev", idLiga: "4328", nombreEquipoLocal: "Arsenal", nombreEquipoVisitante: "Chelsea", estado: "NS", fecha: "2026-12-01" }],
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

    const apiFutbol = new ApiFutbolService(mockFetch);
    const equiposRepo = new EquiposRepository(rutaEquipos);
    equiposRepo.cargarLocal();
    const partidosRepo = new PartidosRepository({ rutaProximos, rutaJugados });
    partidosRepo.agregarVarios(partidosRepo.cargarProximosLocal());
    partidosRepo.agregarVarios(partidosRepo.cargarJugadosLocal());

    const partidosService = new PartidosService({ partidosRepo, apiFutbol });
    const equiposService = new EquiposService({
      equiposRepo,
      partidosRepo,
      partidosService,
      apiFutbol,
    });

    const app = createApp({ equiposService });

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

      const proximosDisco = JSON.parse(fs.readFileSync(rutaProximos, "utf-8"));
      assert.equal(proximosDisco.length, 3);
      assert.ok(proximosDisco.some((p) => p.id === "prox-prev"));
      assert.ok(proximosDisco.some((p) => p.id === "betis-next-1"));
      assert.ok(proximosDisco.some((p) => p.id === "betis-next-conf"));

      const jugadosDisco = JSON.parse(fs.readFileSync(rutaJugados, "utf-8"));
      assert.equal(jugadosDisco.length, 2);
      assert.equal(jugadosDisco[0].id, "hist-prev");
      assert.equal(jugadosDisco[1].id, "betis-last-1");

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
