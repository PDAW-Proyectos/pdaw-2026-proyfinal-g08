import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { Liga } from "../src/js/Futbol/Liga.js";
import { Posicion } from "../src/js/Futbol/Posicion.js";
import { Equipo } from "../src/js/Futbol/Equipo.js";
import { Partido } from "../src/js/Futbol/Partido.js";
import { RepositorioLigas } from "../src/js/Futbol/RepositorioLigas.js";
import { RepositorioEquipos } from "../src/js/Futbol/RepositorioEquipos.js";
import { RepositorioPartidos } from "../src/js/Futbol/RepositorioPartidos.js";
import {
  ServicioFutbol,
  LIGAS_UTILIZADAS_IDS,
  LIGAS_PRINCIPALES_DEFAULT,
} from "../src/js/Futbol/ServicioFutbol.js";
import { inicializarLigas } from "../src/js/server.js";
import { createApp } from "../src/js/app.js";

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

test("entidades y repositorios encapsulan atributos privados (#) con getters y setters", () => {
  const pos = new Posicion({ idEquipo: "1", nombreEquipo: "Arsenal", posicion: "1", puntos: "30" });
  const liga = new Liga("4328", "Premier League", "England", "esc.png", "2026-2027", [pos]);
  const partido = new Partido({ id: "99", idLiga: "4328", nombreEquipoLocal: "A", nombreEquipoVisitante: "B", fecha: "2026-12-01" });
  const equipo = new Equipo({ id: "1", nombre: "Arsenal", estadio: "Emirates" });
  const repoLigas = new RepositorioLigas();
  const repoEquipos = new RepositorioEquipos();
  const repoPartidos = new RepositorioPartidos();
  const servicio = new ServicioFutbol(fetch, crearDirTemporal());

  // Ningún atributo interno debe estar expuesto directamente en Object.keys
  assert.deepEqual(Object.keys(pos), []);
  assert.deepEqual(Object.keys(liga), []);
  assert.deepEqual(Object.keys(partido), []);
  assert.deepEqual(Object.keys(equipo), []);
  assert.deepEqual(Object.keys(repoLigas), []);
  assert.deepEqual(Object.keys(repoEquipos), []);
  assert.deepEqual(Object.keys(repoPartidos), []);
  assert.deepEqual(Object.keys(servicio), []);

  // Getters y setters funcionan correctamente
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
});

test("inicializarLigas carga 5 ligas sin llamar API de ligas/tablas y suma 5 próximos partidos equitativos (1 por liga)", async () => {
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
        // Devuelve 5 eventos futuros por liga; debe tomarse exactamente 1 nuevo por liga
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

    const servicio = new ServicioFutbol(mockFetch, rutas);
    const repoPartidos = new RepositorioPartidos();
    const repoEquipos = new RepositorioEquipos();
    const fechaRef = new Date("2026-11-16T12:00:00Z");

    const repoLigas = await inicializarLigas(servicio, repoPartidos, repoEquipos, fechaRef);

    // 0 llamadas a all_leagues, lookupleague, o lookuptable
    assert.equal(llamadas.some((u) => u.includes("all_leagues")), false);
    assert.equal(llamadas.some((u) => u.includes("lookupleague")), false);
    assert.equal(llamadas.some((u) => u.includes("lookuptable")), false);

    // Exactamente 5 llamadas (1 eventsnextleague por cada una de las 5 ligas)
    assert.equal(llamadas.length, 5);

    // Las 5 ligas están cargadas con tabla vacía
    const ligas = repoLigas.listarLigas();
    assert.equal(ligas.length, 5);
    assert.ok(ligas.every((l) => Array.isArray(l.tabla) && l.tabla.length === 0));

    // 5 próximos partidos guardados en proximos_partidos.json (1 por cada liga)
    const proximosEnDisco = JSON.parse(fs.readFileSync(rutas.rutaProximos, "utf-8"));
    assert.equal(proximosEnDisco.length, 5);
    for (const idLiga of LIGAS_UTILIZADAS_IDS) {
      const deEsaLiga = proximosEnDisco.filter((p) => String(p.idLiga) === idLiga);
      assert.equal(deEsaLiga.length, 1, `La liga ${idLiga} debe tener exactamente 1 próximo partido`);
    }

    // Se preservó el partido histórico en partidos_jugados.json y el equipo existente en equipos.json
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

test("inicializarLigas mueve partidos cuya fecha ya pasó a partidos_jugados.json, conserva vigentes (incluidas otras ligas) y suma 1 nuevo por liga", async () => {
  const rutas = crearDirTemporal();
  try {
    fs.writeFileSync(rutas.rutaLigas, JSON.stringify(LIGAS_PRINCIPALES_DEFAULT, null, 2));

    // Pre-cargar 3 partidos por liga (1 vencido en 4328) + 1 partido vigente descubierto de otra competencia (4480)
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
        // Devuelve 4 eventos nuevos por liga; deben sumarse exactamente 3 nuevos por liga
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

    const servicio = new ServicioFutbol(mockFetch, rutas);
    const repoPartidos = new RepositorioPartidos();
    const repoEquipos = new RepositorioEquipos();
    const fechaRef = new Date("2026-11-16T12:00:00Z");

    await inicializarLigas(servicio, repoPartidos, repoEquipos, fechaRef);

    // 1 lookupevent para el partido vencido + 5 eventsnextleague (1 por liga)
    assert.equal(llamadas.length, 6);
    assert.ok(llamadas.some((u) => u.includes("lookupevent.php?id=vencido-4328")));

    // 14 vigentes de ligas + 1 de ucl-extra-1 + 5 nuevos (1 por liga) = 20 próximos partidos acumulados
    const proximos = JSON.parse(fs.readFileSync(rutas.rutaProximos, "utf-8"));
    assert.equal(proximos.length, 20);
    assert.equal(proximos.some((p) => p.id === "vencido-4328"), false);
    assert.equal(proximos.some((p) => p.id === "ucl-extra-1"), true);
    assert.equal(proximos.filter((p) => String(p.idLiga) === "4328").length, 3);
    assert.equal(proximos.filter((p) => String(p.idLiga) === "4335").length, 4);

    // partidos_jugados.json conservó hist-previo y anexó vencido-4328
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

test("inicializarLigas consecutivos acumulan cada vez más próximos partidos avanzando de jornada si es necesario", async () => {
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
        // Siempre devuelve el mismo primer evento de la ronda 12
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

    const servicio = new ServicioFutbol(mockFetch, rutas);
    const fechaRef = new Date("2026-11-16T12:00:00Z");

    // Arranque 1: 1 partido de ronda 12 por cada una de las 5 ligas = 5
    await inicializarLigas(servicio, new RepositorioPartidos(), new RepositorioEquipos(), fechaRef);
    let enDisco = JSON.parse(fs.readFileSync(rutas.rutaProximos, "utf-8"));
    assert.equal(enDisco.length, 5);

    // Arranque 2: el 1er partido de ronda 12 ya estaba guardado -> consulta eventsround y suma 1 más por liga = 10
    await inicializarLigas(servicio, new RepositorioPartidos(), new RepositorioEquipos(), fechaRef);
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

      if (urlStr.includes("lookuptable.php?l=4331")) {
        return crearMockResponse({}, 429);
      }

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

    const servicio = new ServicioFutbol(mockFetch, rutas);
    const repoLigas = new RepositorioLigas();
    repoLigas.cargarLigas(servicio.cargarLigasLocal());
    const repoEquipos = new RepositorioEquipos();
    repoEquipos.agregarEquipos(servicio.cargarEquiposLocal());
    const repoPartidos = new RepositorioPartidos();

    const app = createApp({
      repositorioLigas: repoLigas,
      repositorioPartidos: repoPartidos,
      repositorioEquipos: repoEquipos,
      servicioFutbol: servicio,
    });

    const server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    const baseUrl = `http://127.0.0.1:${server.address().port}`;

    try {
      // 0. Si la API devuelve 429 temporalmente en otra liga (4331), devuelve errorTabla sin romper
      const resLiga4331 = await fetch(`${baseUrl}/api/ligas/4331`);
      assert.equal(resLiga4331.status, 200);
      const body4331 = await resLiga4331.json();
      assert.deepEqual(body4331.tabla, []);
      assert.ok(body4331.errorTabla);

      // 1. Primera visita a /api/ligas/4328 consulta lookuptable.php y guarda en ligas.json
      const resLiga1 = await fetch(`${baseUrl}/api/ligas/4328`);
      assert.equal(resLiga1.status, 200);
      const bodyLiga1 = await resLiga1.json();
      assert.equal(bodyLiga1.tabla.length, 1);
      assert.equal(llamadas.filter((u) => u.includes("lookuptable.php?l=4328")).length, 1);

      // 2. Segunda visita ya usa el JSON guardado sin volver a llamar la API
      const resLiga2 = await fetch(`${baseUrl}/api/ligas/4328`);
      assert.equal(resLiga2.status, 200);
      assert.equal(llamadas.filter((u) => u.includes("lookuptable.php?l=4328")).length, 1);

      const ligasEnDisco = JSON.parse(fs.readFileSync(rutas.rutaLigas, "utf-8"));
      const premierEnDisco = ligasEnDisco.find((l) => l.id === "4328");
      assert.equal(premierEnDisco.tabla.length, 1);

      // 3. Equipo ya guardado en equipos.json (133604 Arsenal): 0 llamadas a la API
      const resEqGuardado = await fetch(`${baseUrl}/api/equipos/133604`);
      assert.equal(resEqGuardado.status, 200);
      assert.equal(llamadas.some((u) => u.includes("lookupteam")), false);

      // 4. Equipo NO guardado (133602 Liverpool): llama lookupteam.php una vez y anexa sin borrar Arsenal
      const resEqNuevo = await fetch(`${baseUrl}/api/equipos/133602`);
      assert.equal(resEqNuevo.status, 200);
      const liv = await resEqNuevo.json();
      assert.equal(liv.nombre, "Liverpool");
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
