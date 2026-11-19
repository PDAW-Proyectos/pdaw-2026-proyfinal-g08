import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { Liga } from "../src/models/Liga.js";
import { Posicion } from "../src/models/Posicion.js";
import { Equipo } from "../src/models/Equipo.js";
import { Partido } from "../src/models/Partido.js";
import { LigasRepository } from "../src/repositories/LigasRepository.js";
import { EquiposRepository } from "../src/repositories/EquiposRepository.js";
import { PartidosRepository } from "../src/repositories/PartidosRepository.js";
import {
  ApiFutbolService,
  LIGAS_UTILIZADAS_IDS,
  LIGAS_PRINCIPALES_DEFAULT,
} from "../src/services/apiFutbol.service.js";
import { LigasService } from "../src/services/ligas.service.js";
import { PartidosService } from "../src/services/partidos.service.js";
import { EquiposService } from "../src/services/equipos.service.js";
import { inicializarDatosFutbol } from "../src/services/sincronizacion.service.js";
import { createApp } from "../src/app.js";

function crearDirTemporal() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ofsai-test-"));
  return {
    dir,
    rutaLigas: path.join(dir, "ligas.json"),
    rutaProximos: path.join(dir, "proximos_partidos.json"),
    rutaJugados: path.join(dir, "partidos_jugados.json"),
    rutaEquipos: path.join(dir, "equipos.json"),
  };
}

function crearMockResponse(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    async json() {
      return data;
    },
  };
}

function crearContextoFutbol(mockFetch, rutas) {
  const apiFutbol = new ApiFutbolService(mockFetch);
  const ligasRepo = new LigasRepository(rutas.rutaLigas);
  const partidosRepo = new PartidosRepository({
    rutaProximos: rutas.rutaProximos,
    rutaJugados: rutas.rutaJugados,
  });
  const equiposRepo = new EquiposRepository(rutas.rutaEquipos);
  const ligasService = new LigasService({ ligasRepo, partidosRepo, apiFutbol });
  const partidosService = new PartidosService({ partidosRepo, apiFutbol });
  const equiposService = new EquiposService({
    equiposRepo,
    ligasRepo,
    partidosRepo,
    partidosService,
    apiFutbol,
  });

  return {
    apiFutbol,
    ligasRepo,
    partidosRepo,
    equiposRepo,
    ligasService,
    partidosService,
    equiposService,
  };
}

test("entidades, repositorios y servicios encapsulan atributos privados (#) con getters y setters", () => {
  const rutas = crearDirTemporal();
  try {
    const pos = new Posicion({ idEquipo: "1", nombreEquipo: "Arsenal", posicion: "1", puntos: "30" });
    const liga = new Liga({
      id: "4328",
      nombre: "Premier League",
      pais: "England",
      escudo: "esc.png",
      temporada: "2026-2027",
      tabla: [pos],
    });
    const partido = new Partido({
      id: "99",
      idLiga: "4328",
      nombreEquipoLocal: "A",
      nombreEquipoVisitante: "B",
      fecha: "2026-12-01",
    });
    const equipo = new Equipo({ id: "1", nombre: "Arsenal", estadio: "Emirates" });
    const ctx = crearContextoFutbol(fetch, rutas);

    assert.deepEqual(Object.keys(pos), []);
    assert.deepEqual(Object.keys(liga), []);
    assert.deepEqual(Object.keys(partido), []);
    assert.deepEqual(Object.keys(equipo), []);
    assert.deepEqual(Object.keys(ctx.ligasRepo), []);
    assert.deepEqual(Object.keys(ctx.equiposRepo), []);
    assert.deepEqual(Object.keys(ctx.partidosRepo), []);
    assert.deepEqual(Object.keys(ctx.ligasService), []);
    assert.deepEqual(Object.keys(ctx.partidosService), []);
    assert.deepEqual(Object.keys(ctx.equiposService), []);

    pos.puntos = "33";
    assert.equal(pos.puntos, "33");
    liga.temporada = "2027-2028";
    assert.equal(liga.temporada, "2027-2028");
    partido.golesLocal = "2";
    partido.golesVisitante = "1";
    partido.estado = "FT";
    assert.equal(partido.esJugado, true);
    equipo.estadio = "Highbury";
    assert.equal(equipo.estadio, "Highbury");
  } finally {
    fs.rmSync(rutas.dir, { recursive: true, force: true });
  }
});

test("inicializarDatosFutbol carga 5 ligas sin llamar API de ligas/tablas y suma 5 próximos partidos equitativos (1 por liga)", async () => {
  const rutas = crearDirTemporal();
  try {
    fs.writeFileSync(rutas.rutaLigas, JSON.stringify(LIGAS_PRINCIPALES_DEFAULT, null, 2));
    fs.writeFileSync(rutas.rutaProximos, JSON.stringify([], null, 2));
    fs.writeFileSync(
      rutas.rutaJugados,
      JSON.stringify([{ id: "hist-1", idLiga: "4328", nombreEquipoLocal: "Liverpool", nombreEquipoVisitante: "Arsenal", golesLocal: "1", golesVisitante: "2", estado: "FT", fecha: "2026-11-01" }], null, 2)
    );
    fs.writeFileSync(
      rutas.rutaEquipos,
      JSON.stringify([{ id: "133604", nombre: "Arsenal", escudo: "https://example.com/arsenal.png" }], null, 2)
    );

    const llamadas = [];
    const mockFetch = async (url) => {
      const urlStr = String(url);
      llamadas.push(urlStr);

      if (urlStr.includes("eventsnextleague.php")) {
        const idLiga = new URL(urlStr).searchParams.get("id");
        const events = [1, 2, 3, 4, 5].map((n) => ({
          idEvent: `${idLiga}0${n}`,
          idLeague: idLiga,
          strLeague: `Liga ${idLiga}`,
          strSeason: "2026-2027",
          intRound: String(n + 10),
          idHomeTeam: `H${idLiga}${n}`,
          strHomeTeam: `Local ${idLiga}-${n}`,
          strHomeTeamBadge: `https://example.com/h${idLiga}${n}.png`,
          idAwayTeam: `A${idLiga}${n}`,
          strAwayTeam: `Visitante ${idLiga}-${n}`,
          strAwayTeamBadge: `https://example.com/a${idLiga}${n}.png`,
          dateEvent: `2026-12-0${n}`,
          strTime: "15:00:00",
          strTimestamp: `2026-12-0${n}T15:00:00`,
          strStatus: "NS",
        }));
        return crearMockResponse({ events });
      }
      return crearMockResponse({});
    };

    const ctx = crearContextoFutbol(mockFetch, rutas);
    const fechaRef = new Date("2026-11-16T12:00:00Z");

    const ligasRepo = await inicializarDatosFutbol({ ...ctx, fechaReferencia: fechaRef });

    assert.equal(llamadas.some((u) => u.includes("all_leagues")), false);
    assert.equal(llamadas.some((u) => u.includes("lookupleague")), false);
    assert.equal(llamadas.some((u) => u.includes("lookuptable")), false);
    assert.equal(llamadas.length, 5);

    const ligas = ligasRepo.listar();
    assert.equal(ligas.length, 5);
    assert.ok(ligas.every((l) => Array.isArray(l.tabla) && l.tabla.length === 0));

    const proximosEnDisco = JSON.parse(fs.readFileSync(rutas.rutaProximos, "utf-8"));
    assert.equal(proximosEnDisco.length, 5);
    for (const idLiga of LIGAS_UTILIZADAS_IDS) {
      assert.equal(proximosEnDisco.filter((p) => String(p.idLiga) === idLiga).length, 1);
    }

    const jugadosEnDisco = JSON.parse(fs.readFileSync(rutas.rutaJugados, "utf-8"));
    assert.equal(jugadosEnDisco.length, 1);
    assert.equal(jugadosEnDisco[0].id, "hist-1");
    const equiposEnDisco = JSON.parse(fs.readFileSync(rutas.rutaEquipos, "utf-8"));
    assert.equal(equiposEnDisco.length, 1);
    assert.equal(equiposEnDisco[0].id, "133604");
  } finally {
    fs.rmSync(rutas.dir, { recursive: true, force: true });
  }
});

test("inicializarDatosFutbol mueve partidos vencidos a partidos_jugados.json, conserva vigentes y suma 1 nuevo por liga", async () => {
  const rutas = crearDirTemporal();
  try {
    fs.writeFileSync(rutas.rutaLigas, JSON.stringify(LIGAS_PRINCIPALES_DEFAULT, null, 2));

    const iniciales = [];
    for (const idLiga of LIGAS_UTILIZADAS_IDS) {
      for (let i = 1; i <= 3; i++) {
        const vencido = idLiga === "4328" && i === 1;
        iniciales.push({
          id: vencido ? "vencido-4328" : `${idLiga}-${i}`,
          idLiga,
          nombreLiga: `Liga ${idLiga}`,
          idEquipoLocal: "133604",
          nombreEquipoLocal: "Arsenal",
          escudoEquipoLocal: "https://example.com/ars.png",
          idEquipoVisitante: "133602",
          nombreEquipoVisitante: "Liverpool",
          escudoEquipoVisitante: "https://example.com/liv.png",
          fecha: vencido ? "2026-11-10" : `2026-12-1${i}`,
          hora: "15:00:00",
          timestamp: vencido ? "2026-11-10T15:00:00" : `2026-12-1${i}T15:00:00`,
          estado: "NS",
        });
      }
    }
    iniciales.push({
      id: "ucl-extra-1",
      idLiga: "4480",
      nombreLiga: "UEFA Champions League",
      idEquipoLocal: "133604",
      nombreEquipoLocal: "Arsenal",
      escudoEquipoLocal: "https://example.com/ars.png",
      idEquipoVisitante: "133739",
      nombreEquipoVisitante: "Barcelona",
      escudoEquipoVisitante: "https://example.com/barca.png",
      fecha: "2026-12-22",
      hora: "20:00:00",
      timestamp: "2026-12-22T20:00:00",
      estado: "NS",
    });

    fs.writeFileSync(rutas.rutaProximos, JSON.stringify(iniciales, null, 2));
    fs.writeFileSync(
      rutas.rutaJugados,
      JSON.stringify([{ id: "hist-previo", idLiga: "4335", nombreEquipoLocal: "Barcelona", nombreEquipoVisitante: "Real Madrid", golesLocal: "2", golesVisitante: "1", estado: "FT", fecha: "2026-10-20" }], null, 2)
    );
    fs.writeFileSync(rutas.rutaEquipos, JSON.stringify([], null, 2));

    const llamadas = [];
    const mockFetch = async (url) => {
      const urlStr = String(url);
      llamadas.push(urlStr);

      if (urlStr.includes("lookupevent.php")) {
        return crearMockResponse({
          events: [
            {
              idEvent: "vencido-4328",
              idLeague: "4328",
              strLeague: "English Premier League",
              idHomeTeam: "133604",
              strHomeTeam: "Arsenal",
              strHomeTeamBadge: "https://example.com/ars.png",
              idAwayTeam: "133602",
              strAwayTeam: "Liverpool",
              strAwayTeamBadge: "https://example.com/liv.png",
              intHomeScore: "3",
              intAwayScore: "1",
              dateEvent: "2026-11-10",
              strTime: "15:00:00",
              strTimestamp: "2026-11-10T15:00:00",
              strStatus: "FT",
            },
          ],
        });
      }

      if (urlStr.includes("eventsnextleague.php")) {
        const idLiga = new URL(urlStr).searchParams.get("id");
        const events = [1, 2, 3, 4].map((n) => ({
          idEvent: `nuevo-${idLiga}-${n}`,
          idLeague: idLiga,
          strLeague: `Liga ${idLiga}`,
          idHomeTeam: "133604",
          strHomeTeam: "Arsenal",
          strHomeTeamBadge: "https://example.com/ars.png",
          idAwayTeam: "133610",
          strAwayTeam: "Chelsea",
          strAwayTeamBadge: "https://example.com/che.png",
          dateEvent: `2026-12-2${n}`,
          strTime: "17:00:00",
          strTimestamp: `2026-12-2${n}T17:00:00`,
          strStatus: "NS",
        }));
        return crearMockResponse({ events });
      }

      return crearMockResponse({});
    };

    const ctx = crearContextoFutbol(mockFetch, rutas);
    const fechaRef = new Date("2026-11-16T12:00:00Z");

    await inicializarDatosFutbol({ ...ctx, fechaReferencia: fechaRef });

    assert.equal(llamadas.length, 6);
    assert.ok(llamadas.some((u) => u.includes("lookupevent.php?id=vencido-4328")));

    const proximos = JSON.parse(fs.readFileSync(rutas.rutaProximos, "utf-8"));
    assert.equal(proximos.length, 20);
    assert.equal(proximos.some((p) => p.id === "vencido-4328"), false);
    assert.equal(proximos.some((p) => p.id === "ucl-extra-1"), true);
    assert.equal(proximos.filter((p) => String(p.idLiga) === "4328").length, 3);
    assert.equal(proximos.filter((p) => String(p.idLiga) === "4335").length, 4);

    const jugados = JSON.parse(fs.readFileSync(rutas.rutaJugados, "utf-8"));
    assert.equal(jugados.length, 2);
    assert.equal(jugados[0].id, "hist-previo");
    assert.equal(jugados[1].id, "vencido-4328");
    assert.equal(jugados[1].golesLocal, "3");
    assert.equal(jugados[1].golesVisitante, "1");
  } finally {
    fs.rmSync(rutas.dir, { recursive: true, force: true });
  }
});

test("inicializarDatosFutbol consecutivos acumulan cada vez más próximos partidos avanzando de jornada si es necesario", async () => {
  const rutas = crearDirTemporal();
  try {
    fs.writeFileSync(rutas.rutaLigas, JSON.stringify(LIGAS_PRINCIPALES_DEFAULT, null, 2));
    fs.writeFileSync(rutas.rutaProximos, JSON.stringify([], null, 2));
    fs.writeFileSync(rutas.rutaJugados, JSON.stringify([], null, 2));
    fs.writeFileSync(rutas.rutaEquipos, JSON.stringify([], null, 2));

    const crearEvento = (idLiga, round, idx) => ({
      idEvent: `${idLiga}-r${round}-${idx}`,
      idLeague: idLiga,
      strLeague: `Liga ${idLiga}`,
      strSeason: "2026-2027",
      intRound: String(round),
      idHomeTeam: `H${idLiga}${idx}`,
      strHomeTeam: `Local ${idLiga} ${idx}`,
      strHomeTeamBadge: `https://example.com/h${idLiga}.png`,
      idAwayTeam: `A${idLiga}${idx}`,
      strAwayTeam: `Visitante ${idLiga} ${idx}`,
      strAwayTeamBadge: `https://example.com/a${idLiga}.png`,
      dateEvent: `2026-12-${String(round + idx).padStart(2, "0")}`,
      strTime: "15:00:00",
      strStatus: "NS",
    });

    const mockFetch = async (url) => {
      const urlObj = new URL(String(url));
      const idLiga = urlObj.searchParams.get("id");
      if (String(url).includes("eventsnextleague.php")) {
        return crearMockResponse({ events: [crearEvento(idLiga, 12, 1)] });
      }
      if (String(url).includes("eventsround.php")) {
        const round = Number(urlObj.searchParams.get("r"));
        return crearMockResponse({
          events: [1, 2, 3].map((idx) => crearEvento(idLiga, round, idx)),
        });
      }
      return crearMockResponse({});
    };

    const fechaRef = new Date("2026-11-16T12:00:00Z");

    await inicializarDatosFutbol({
      ...crearContextoFutbol(mockFetch, rutas),
      fechaReferencia: fechaRef,
    });
    let enDisco = JSON.parse(fs.readFileSync(rutas.rutaProximos, "utf-8"));
    assert.equal(enDisco.length, 5);

    await inicializarDatosFutbol({
      ...crearContextoFutbol(mockFetch, rutas),
      fechaReferencia: fechaRef,
    });
    enDisco = JSON.parse(fs.readFileSync(rutas.rutaProximos, "utf-8"));
    assert.equal(enDisco.length, 10);
  } finally {
    fs.rmSync(rutas.dir, { recursive: true, force: true });
  }
});

test("tablas de liga se cargan bajo demanda al entrar a GET /api/ligas/:id y equipos.json es append-only", async () => {
  const rutas = crearDirTemporal();
  try {
    fs.writeFileSync(rutas.rutaLigas, JSON.stringify(LIGAS_PRINCIPALES_DEFAULT, null, 2));
    fs.writeFileSync(rutas.rutaProximos, JSON.stringify([], null, 2));
    fs.writeFileSync(rutas.rutaJugados, JSON.stringify([], null, 2));
    fs.writeFileSync(
      rutas.rutaEquipos,
      JSON.stringify([{ id: "133604", nombre: "Arsenal", escudo: "https://example.com/ars.png", pais: "England" }], null, 2)
    );

    const llamadas = [];
    const mockFetch = async (url) => {
      const urlStr = String(url);
      llamadas.push(urlStr);

      if (urlStr.includes("lookuptable.php?l=4331")) return crearMockResponse({}, 429);

      if (urlStr.includes("lookuptable.php?l=4328")) {
        return crearMockResponse({
          table: [
            {
              idTeam: "133604",
              strTeam: "Arsenal",
              strBadge: "https://example.com/ars.png",
              idLeague: "4328",
              intRank: "1",
              intPlayed: "10",
              intWin: "9",
              intDraw: "0",
              intLoss: "1",
              intGoalsFor: "20",
              intGoalsAgainst: "5",
              intGoalDifference: "15",
              intPoints: "27",
            },
          ],
        });
      }

      if (urlStr.includes("lookupteam.php?id=133602")) {
        return crearMockResponse({
          teams: [
            {
              idTeam: "133602",
              strTeam: "Liverpool",
              strBadge: "https://example.com/liv.png",
              strStadium: "Anfield",
              strCountry: "England",
            },
          ],
        });
      }

      return crearMockResponse({});
    };

    const ctx = crearContextoFutbol(mockFetch, rutas);
    ctx.ligasRepo.cargarLocal(LIGAS_PRINCIPALES_DEFAULT);
    ctx.equiposRepo.cargarLocal();

    const app = createApp({
      ligasService: ctx.ligasService,
      partidosService: ctx.partidosService,
      equiposService: ctx.equiposService,
    });

    const server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    const baseUrl = `http://127.0.0.1:${server.address().port}`;

    try {
      const resLiga4331 = await fetch(`${baseUrl}/api/ligas/4331`);
      assert.equal(resLiga4331.status, 200);
      const body4331 = await resLiga4331.json();
      assert.deepEqual(body4331.tabla, []);
      assert.ok(body4331.errorTabla);

      const resLiga1 = await fetch(`${baseUrl}/api/ligas/4328`);
      assert.equal(resLiga1.status, 200);
      const bodyLiga1 = await resLiga1.json();
      assert.equal(bodyLiga1.tabla.length, 1);
      assert.equal(llamadas.filter((u) => u.includes("lookuptable.php?l=4328")).length, 1);

      const resLiga2 = await fetch(`${baseUrl}/api/ligas/4328`);
      assert.equal(resLiga2.status, 200);
      assert.equal(llamadas.filter((u) => u.includes("lookuptable.php?l=4328")).length, 1);

      const ligasEnDisco = JSON.parse(fs.readFileSync(rutas.rutaLigas, "utf-8"));
      assert.equal(ligasEnDisco.find((l) => l.id === "4328").tabla.length, 1);

      const resEqGuardado = await fetch(`${baseUrl}/api/equipos/133604`);
      assert.equal(resEqGuardado.status, 200);
      assert.equal(llamadas.some((u) => u.includes("lookupteam")), false);

      const resEqNuevo = await fetch(`${baseUrl}/api/equipos/133602`);
      assert.equal(resEqNuevo.status, 200);
      assert.equal((await resEqNuevo.json()).nombre, "Liverpool");
      assert.equal(llamadas.filter((u) => u.includes("lookupteam.php?id=133602")).length, 1);

      const equiposEnDisco = JSON.parse(fs.readFileSync(rutas.rutaEquipos, "utf-8"));
      assert.equal(equiposEnDisco.length, 2);
      assert.equal(equiposEnDisco[0].id, "133604");
      assert.equal(equiposEnDisco[1].id, "133602");
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  } finally {
    fs.rmSync(rutas.dir, { recursive: true, force: true });
  }
});
