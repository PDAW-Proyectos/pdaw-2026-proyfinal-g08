import { beforeEach, describe, expect, test } from "@jest/globals";
import { Equipo } from "../js/Futbol/Equipo.js";

describe("Construccion de equipo", () => {
  test("No se puede crear un equipo sin ID", () => {
    expect(
      () => new Equipo(undefined, "Equipo", null, null),
    ).toThrow(TypeError("El ID del Equipo no puede estar vacio."));
  });

  test("No se puede crear un equipo sin nombre", () => {
    expect(
      () => new Equipo("123", undefined, null, null),
    ).toThrow(TypeError("El nombre del Equipo no puede estar vacio."));
  });

  test("No se puede crear un equipo con un escudo invalido", () => {
    expect(
      () => new Equipo("123", "Equipo", "http://url-invalida.com", null),
    ).toThrow(TypeError("No se puede crear un Equipo con un escudo invalido."));
  });

  test("Conserva los datos recibidos", () => {
    const proximoPartido = { rival: "Rival", fecha: "2026-11-08" };
    const equipo = new Equipo(
      "123",
      "Equipo",
      "https://r2.thesportsdb.com/images/media/team/badge/escudo.png",
      proximoPartido,
    );

    expect(equipo.id).toBe(123);
    expect(equipo.nombre).toBe("Equipo");
    expect(equipo.escudo).toBe(
      "https://r2.thesportsdb.com/images/media/team/badge/escudo.png",
    );
    expect(equipo.proximoPartido).toEqual(proximoPartido);
  });
});

describe("Getters de equipo", () => {
  let equipo;

  beforeEach(() => {
    equipo = new Equipo(
      "123",
      "Equipo",
      "https://r2.thesportsdb.com/images/media/team/badge/escudo.png",
      null,
    );
  });

  test("Getter de ID", () => {
    expect(equipo.obtenerId).toBe(123);
  });

  test("Getter de nombre", () => {
    expect(equipo.obtenerNombre).toBe("Equipo");
  });

  test("Getter de escudo", () => {
    expect(equipo.obtenerEscudo).toBe(
      "https://r2.thesportsdb.com/images/media/team/badge/escudo.png",
    );
  });
});
