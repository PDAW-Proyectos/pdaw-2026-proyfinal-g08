import { beforeEach, describe, expect, test } from "@jest/globals";
import { Equipo } from "../js/Futbol/Equipo.js";

describe("Construccion de equipo", () => {
  test("Conserva los datos recibidos", () => {
    const proximoPartido = { rival: "Rival", fecha: "2026-11-08" };
    const equipo = new Equipo(
      "123",
      "Equipo",
      "https://ejemplo.com/escudo.png",
      proximoPartido,
    );

    expect(equipo.id).toBe("123");
    expect(equipo.nombre).toBe("Equipo");
    expect(equipo.escudo).toBe("https://ejemplo.com/escudo.png");
    expect(equipo.proximoPartido).toEqual(proximoPartido);
  });
});

describe("Getters de equipo", () => {
  let equipo;

  beforeEach(() => {
    equipo = new Equipo("123", "Equipo", "https://ejemplo.com/escudo.png", null);
  });

  test("Getter de ID", () => {
    expect(equipo.obtenerId).toBe("123");
  });

  test("Getter de nombre", () => {
    expect(equipo.obtenerNombre).toBe("Equipo");
  });

  test("Getter de escudo", () => {
    expect(equipo.obtenerEscudo).toBe("https://ejemplo.com/escudo.png");
  });
});
