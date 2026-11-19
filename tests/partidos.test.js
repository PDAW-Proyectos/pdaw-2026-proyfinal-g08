import assert from "node:assert/strict";
import { test } from "node:test";
import { Partido } from "../src/models/Partido.js";
import { PartidosRepository } from "../src/repositories/PartidosRepository.js";
import { LigasRepository } from "../src/repositories/LigasRepository.js";
import { mapearPartidoAPI } from "../src/utils/apiMappers.js";
import { LigasService } from "../src/services/ligas.service.js";
import { PartidosService } from "../src/services/partidos.service.js";
import { createApp } from "../src/app.js";
import {
  sumarDiasAFecha,
  extraerClaveFechaPartido,
  paginarElementos,
  calcularPaginasVisibles,
} from "../public/js/utils.js";

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

test("mapearPartidoAPI convierte la estructura de TheSportsDB en una instancia de Partido", () => {
  const eventoApi = {
    idEvent: "2494082",
    idLeague: "4328",
    strLeague: "English Premier League",
    strLeagueBadge: "https://r2.thesportsdb.com/images/media/league/badge/premier.png",
    strSeason: "2026-2027",
    intRound: "9",
    idHomeTeam: "133602",
    strHomeTeam: "Liverpool",
    strHomeTeamBadge: "https://r2.thesportsdb.com/images/media/team/badge/liverpool.png",
    idAwayTeam: "133604",
    strAwayTeam: "Arsenal",
    strAwayTeamBadge: "https://r2.thesportsdb.com/images/media/team/badge/arsenal.png",
    intHomeScore: "0",
    intAwayScore: "1",
    dateEvent: "2026-11-01",
    strTime: "16:30:00",
    strTimestamp: "2026-11-01T16:30:00",
    strStatus: "FT",
    strVenue: "Anfield",
  };

  const partido = mapearPartidoAPI(eventoApi);
  assert.equal(partido.id, "2494082");
  assert.equal(partido.nombreEquipoLocal, "Liverpool");
  assert.equal(partido.nombreEquipoVisitante, "Arsenal");
  assert.equal(partido.golesLocal, "0");
  assert.equal(partido.golesVisitante, "1");
  assert.equal(partido.esJugado, true);
  assert.equal(partido.esProximo, false);
  assert.equal(partido.toJSON().id, "2494082");
});

test("PartidosRepository filtra y ordena próximos y jugados correctamente", () => {
  const repo = new PartidosRepository();
  repo.agregarVarios([
    new Partido({ id: "p1", idLiga: "4328", fecha: "2026-11-15", hora: "15:00:00", estado: "NS" }),
    new Partido({ id: "p2", idLiga: "4328", fecha: "2026-11-10", hora: "12:00:00", estado: "NS" }),
    new Partido({ id: "p3", idLiga: "4335", fecha: "2026-11-01", golesLocal: 1, golesVisitante: 0, estado: "FT" }),
    new Partido({ id: "p4", idLiga: "4335", fecha: "2026-11-05", golesLocal: 3, golesVisitante: 2, estado: "FT" }),
  ]);

  const proximos = repo.obtenerProximos();
  assert.equal(proximos.length, 2);
  assert.equal(proximos[0].id, "p2");
  assert.equal(proximos[1].id, "p1");

  const jugados = repo.obtenerJugados();
  assert.equal(jugados.length, 2);
  assert.equal(jugados[0].id, "p4");
  assert.equal(jugados[1].id, "p3");

  const liga4328 = repo.obtenerEventosDeLiga("4328");
  assert.equal(liga4328.proximos.length, 2);
  assert.equal(liga4328.jugados.length, 0);
});

test("los endpoints de la API entregan la lista de partidos en formato JSON", async () => {
  const partidosRepo = new PartidosRepository();
  partidosRepo.agregar(
    new Partido({
      id: "test-1",
      idLiga: "4328",
      nombreLiga: "Premier League",
      nombreEquipoLocal: "Arsenal",
      nombreEquipoVisitante: "Chelsea",
      fecha: "2026-11-20",
      estado: "NS",
    })
  );

  const ligasRepo = new LigasRepository();
  ligasRepo.agregar({
    id: "4328",
    nombre: "Premier League",
    pais: "Inglaterra",
    temporada: "2026-2027",
  });

  const app = createApp({
    ligasService: new LigasService({ ligasRepo, partidosRepo }),
    partidosService: new PartidosService({ partidosRepo }),
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
      partidosRepo.agregar(
        new Partido({
          id: `test-${i}`,
          idLiga: "4328",
          nombreLiga: "Premier League",
          nombreEquipoLocal: "Arsenal",
          nombreEquipoVisitante: "Chelsea",
          fecha: `2026-12-${String(i).padStart(2, "0")}`,
          estado: "NS",
        })
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

  assert.equal(extraerClaveFechaPartido({ fecha: "2026-11-18", hora: "16:30:00" }), "2026-11-18");
  assert.equal(extraerClaveFechaPartido({ fecha: "2026-11-19" }), "2026-11-19");
  assert.equal(extraerClaveFechaPartido({ timestamp: "2026-11-20T15:00:00" }), "2026-11-20");
  assert.equal(extraerClaveFechaPartido(null), "");

  const app = createApp();
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

test("utilidades de paginación dividen los partidos y calculan páginas visibles correctamente", () => {
  const lista = Array.from({ length: 14 }, (_, i) => ({ id: `m-${i + 1}` }));

  const pag1 = paginarElementos(lista, 1, 6);
  assert.equal(pag1.items.length, 6);
  assert.equal(pag1.items[0].id, "m-1");
  assert.equal(pag1.paginaActual, 1);
  assert.equal(pag1.totalPaginas, 3);
  assert.equal(pag1.desde, 1);
  assert.equal(pag1.hasta, 6);

  const pag3 = paginarElementos(lista, 99, 6);
  assert.equal(pag3.paginaActual, 3);
  assert.equal(pag3.items.length, 2);
  assert.equal(pag3.desde, 13);
  assert.equal(pag3.hasta, 14);

  const vacia = paginarElementos([], 1, 6);
  assert.equal(vacia.items.length, 0);
  assert.equal(vacia.totalPaginas, 1);
  assert.equal(vacia.desde, 0);
  assert.equal(vacia.hasta, 0);

  assert.deepEqual(calcularPaginasVisibles(1, 3), [1, 2, 3]);
  assert.deepEqual(calcularPaginasVisibles(4, 7), [1, "...", 3, 4, 5, "...", 7]);
  assert.deepEqual(calcularPaginasVisibles(1, 7), [1, 2, "...", 7]);
});

test("el endpoint de partidos jugados permite obtener el total sin límite para paginar", async () => {
  const partidosRepo = new PartidosRepository();
  for (let i = 1; i <= 12; i++) {
    partidosRepo.agregar(
      new Partido({
        id: `jug-${i}`,
        idLiga: "4328",
        nombreEquipoLocal: "Liverpool",
        nombreEquipoVisitante: "Chelsea",
        golesLocal: 2,
        golesVisitante: 1,
        fecha: `2026-10-${String(i).padStart(2, "0")}`,
        estado: "FT",
      })
    );
  }

  const app = createApp({
    ligasService: new LigasService({ ligasRepo: new LigasRepository(), partidosRepo }),
    partidosService: new PartidosService({ partidosRepo }),
  });

  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  try {
    const resDefecto = await fetch(`${baseUrl}/api/partidos/jugados`);
    assert.equal((await resDefecto.json()).length, 10);

    const resSinLimite = await fetch(`${baseUrl}/api/partidos/jugados?limite=0`);
    assert.equal((await resSinLimite.json()).length, 12);

    const resTodos = await fetch(`${baseUrl}/api/partidos/jugados?todos=true`);
    assert.equal((await resTodos.json()).length, 12);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
