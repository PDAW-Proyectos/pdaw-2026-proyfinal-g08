import { describe, expect, test } from "@jest/globals";
import { Posicion } from "../js/Futbol/Posicion.js";

describe("Construccion de posicion", () => {
  test("Conserva los datos recibidos", () => {
    const datos = {
      idEquipo: "123",
      nombreEquipo: "Equipo",
      escudoEquipo: "https://ejemplo.com/escudo.png",
      idLiga: "456",
      posicion: 1,
      partidosJugados: 10,
      victorias: 7,
      derrotas: 1,
      empates: 2,
      golesFavor: 20,
      golesContra: 8,
      diferenciaGol: 12,
      puntos: 23,
      racha: "WWDWL",
    };

    expect(new Posicion(datos)).toEqual(datos);
  });

  test("Se puede crear sin datos", () => {
    expect(new Posicion()).toEqual({});
  });
});
