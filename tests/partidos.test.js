import assert from "node:assert/strict";
import { test } from "node:test";
import { Partido } from "../src/js/Futbol/Partido.js";
import { RepositorioPartidos } from "../src/js/Futbol/RepositorioPartidos.js";
import { formatearPartidoAPI } from "../src/js/Futbol/formatos.js";
import { createApp } from "../src/js/app.js";
import { RepositorioLigas } from "../src/js/Futbol/RepositorioLigas.js";
import { Liga } from "../src/js/Futbol/Liga.js";
import {
  sumarDiasAFecha,
  extraerClaveFechaPartido,
} from "../src/js/cliente/fechas.js";

test("el modelo Partido almacena propiedades y evalúa estados esJugado y esProximo correctamente", () => {
  const partidoFuturo = new Partido({
    id: "101",
    idLiga: "4328",
    nombreLiga: "Premier League",
    nombreEquipoLocal: "Liverpool",
    nombreEquipoVisitante: "Arsenal",
    fecha: "2026-11-20",
    hora: "16:00:00",
    estado: "NS",
  });

  assert.equal(partidoFuturo.id, "101");
  assert.equal(partidoFuturo.esProximo, true);
  assert.equal(partidoFuturo.esJugado, false);

  const partidoJugado = new Partido({
    id: "102",
    idLiga: "4328",
    nombreLiga: "Premier League",
    nombreEquipoLocal: "Liverpool",
    nombreEquipoVisitante: "Arsenal",
    golesLocal: 2,
    golesVisitante: 1,
    fecha: "2026-11-01",
    hora: "16:00:00",
    estado: "FT",
  });

  assert.equal(partidoJugado.esJugado, true);
  assert.equal(partidoJugado.esProximo, false);
});

test("formatearPartidoAPI convierte la estructura de TheSportsDB en una instancia de Partido", () => {
  const eventoApi = {
    idEvent: "2494082",
    idLeague: "4328",
    strLeague: "English Premier League",
    strLeagueBadge:
      "https://r2.thesportsdb.com/images/media/league/badge/premier.png",
    strSeason: "2026-2027",
    intRound: "9",
    idHomeTeam: "133602",
    strHomeTeam: "Liverpool",
    strHomeTeamBadge:
      "https://r2.thesportsdb.com/images/media/team/badge/liverpool.png",
    idAwayTeam: "133604",
    strAwayTeam: "Arsenal",
    strAwayTeamBadge:
      "https://r2.thesportsdb.com/images/media/team/badge/arsenal.png",
    intHomeScore: "0",
    intAwayScore: "1",
    dateEvent: "2026-11-01",
    strTime: "16:30:00",
    strTimestamp: "2026-11-01T16:30:00",
    strStatus: "FT",
    strVenue: "Anfield",
  };

  const partido = formatearPartidoAPI(eventoApi);
  assert.equal(partido.id, "2494082");
  assert.equal(partido.nombreEquipoLocal, "Liverpool");
  assert.equal(partido.nombreEquipoVisitante, "Arsenal");
  assert.equal(partido.golesLocal, "0");
  assert.equal(partido.golesVisitante, "1");
  assert.equal(partido.esJugado, true);
  assert.equal(partido.esProximo, false);
  assert.equal(partido.toJSON().id, "2494082");
});

test("RepositorioPartidos filtra y ordena próximos y jugados correctamente", () => {
  const repo = new RepositorioPartidos();
  repo.agregarPartidos([
    new Partido({
      id: "p1",
      idLiga: "4328",
      fecha: "2026-11-15",
      hora: "15:00:00",
      estado: "NS",
    }),
    new Partido({
      id: "p2",
      idLiga: "4328",
      fecha: "2026-11-10",
      hora: "12:00:00",
      estado: "NS",
    }),
    new Partido({
      id: "p3",
      idLiga: "4335",
      fecha: "2026-11-01",
      golesLocal: 1,
      golesVisitante: 0,
      estado: "FT",
    }),
    new Partido({
      id: "p4",
      idLiga: "4335",
      fecha: "2026-11-05",
      golesLocal: 3,
      golesVisitante: 2,
      estado: "FT",
    }),
  ]);

  const proximos = repo.obtenerProximos();
  assert.equal(proximos.length, 2);
  // El más cercano por fecha debe ser p2 (10 de nov antes que 15 de nov)
  assert.equal(proximos[0].id, "p2");
  assert.equal(proximos[1].id, "p1");

  const jugados = repo.obtenerJugados();
  assert.equal(jugados.length, 2);
  // El más reciente jugado debe ser p4 (5 de nov antes que 1 de nov)
  assert.equal(jugados[0].id, "p4");
  assert.equal(jugados[1].id, "p3");

  const liga4328 = repo.obtenerEventosDeLiga("4328");
  assert.equal(liga4328.proximos.length, 2);
  assert.equal(liga4328.jugados.length, 0);
});

test("los endpoints de la API entregan la lista de partidos en formato JSON", async () => {
  const repoPartidos = new RepositorioPartidos();
  repoPartidos.agregarPartido(
    new Partido({
      id: "test-1",
      idLiga: "4328",
      nombreLiga: "Premier League",
      nombreEquipoLocal: "Arsenal",
      nombreEquipoVisitante: "Chelsea",
      fecha: "2026-11-20",
      estado: "NS",
    }),
  );

  const repoLigas = new RepositorioLigas();
  repoLigas.agregarLiga({
    id: "4328",
    nombre: "Premier League",
    pais: "Inglaterra",
    temporada: "2026-2027",
  });

  const app = createApp({
    repositorioLigas: repoLigas,
    repositorioPartidos: repoPartidos,
  });

  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const resProximos = await fetch(`${baseUrl}/api/partidos/proximos`);
    assert.equal(resProximos.status, 200);
    const proximos = await resProximos.json();
    assert.equal(proximos.length, 1);
    assert.equal(proximos[0].id, "test-1");

    const resLiga = await fetch(`${baseUrl}/api/ligas/4328/partidos`);
    assert.equal(resLiga.status, 200);
    const ligaPartidos = await resLiga.json();
    assert.equal(ligaPartidos.proximos.length, 1);
    assert.equal(ligaPartidos.jugados.length, 0);

    for (let i = 2; i <= 14; i++) {
      repoPartidos.agregarPartido(
        new Partido({
          id: `test-${i}`,
          idLiga: "4328",
          nombreLiga: "Premier League",
          nombreEquipoLocal: "Arsenal",
          nombreEquipoVisitante: "Chelsea",
          fecha: `2026-12-${String(i).padStart(2, "0")}`,
          estado: "NS",
        }),
      );
    }

    const resDefault = await fetch(`${baseUrl}/api/partidos/proximos`);
    assert.equal((await resDefault.json()).length, 10);

    const resTodos = await fetch(`${baseUrl}/api/partidos/proximos?limite=0`);
    assert.equal((await resTodos.json()).length, 14);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("utilidades de fecha y controles del filtro por fecha en el inicio funcionan correctamente", async () => {
  const base = new Date(2026, 10, 18, 10, 0, 0);
  assert.equal(sumarDiasAFecha(base, 0), "2026-11-18");
  assert.equal(sumarDiasAFecha(base, 1), "2026-11-19");

  assert.equal(
    extraerClaveFechaPartido({ fecha: "2026-11-18", hora: "16:30:00" }),
    "2026-11-18",
  );
  assert.equal(extraerClaveFechaPartido({ fecha: "2026-11-19" }), "2026-11-19");
  assert.equal(
    extraerClaveFechaPartido({ timestamp: "2026-11-20T15:00:00" }),
    "2026-11-20",
  );
  assert.equal(extraerClaveFechaPartido(null), "");

  const app = createApp({});
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  try {
    const res = await fetch(`${baseUrl}/`);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('data-filtro-fecha="todos"'));
    assert.ok(html.includes('data-filtro-fecha="hoy"'));
    assert.ok(html.includes('data-filtro-fecha="manana"'));
    assert.ok(html.includes('id="filtroFechaInicio"'));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
