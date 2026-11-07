import {Liga} from "../js/Futbol/Liga.js"

import {test,  describe, expect, beforeEach } from "@jest/globals";

describe("Construccion de liga", ()=>{
    test("No se puede crear una liga sin ID", ()=>{
        expect(
            () => new Liga(undefined, "Nombre", "Pais", "", "", [])
        ).toThrow(TypeError("El ID de la liga no puede estar vacio."));
    });
    test("No se puede crear una liga sin Nombre", ()=>{
        expect(
            () => new Liga("123", undefined, "Pais", "", "", [])
        ).toThrow(TypeError("El nombre de la Liga no puede estar vacio."));
    });
    test("No se puede crear una Liga sin un arreglo como Tabla", () =>{
        expect (
            () => new Liga("123", "Nombre", "Pais", "", "", 1)
        ).toThrow(TypeError("La tabla de la liga debe ser un arreglo."));
    });
    test("No se puede crear una Liga con un escudo invalido", ()=>{
        expect(
            () => new Liga("123", "Nombre", "Pais", "http://URL.Invalida.com", "", [])
        ).toThrow(TypeError("No se puede crear una liga con un escudo invalido."));
    })
});

describe("Getters de liga", () =>{
    let liga;
    beforeEach(() => liga = new Liga("12345", "NombreDeLiga", "Pais", "https://r2.thesportsdb.com/images/media/league/badge/escudoliga", "2026", [1,2,3]))
    test("Getter de ID", () =>{
        expect(liga.obtenerId).toBe(12345);
    });
    test("Obtener Nombre", () =>{
        expect(liga.obtenerNombre).toBe("NombreDeLiga");
    });
    test("Obtener Pais", () =>{
        expect(liga.obtenerPais).toBe("Pais");
    });
    test("Obtener Escudo", () =>{
        expect(liga.obtenerEscudo).toBe("https://r2.thesportsdb.com/images/media/league/badge/escudoliga");
    });
    test("Obtener temporada", () =>{
        expect(liga.obtenerTemporada).toBe("2026");
    });
    test("Obtener tabla", () =>{
        expect(liga.obtenerTabla).toEqual([1,2,3]);
    })
})
