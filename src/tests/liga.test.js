import {Liga} from "../js/Futbol/Liga.js"

import {test,  describe, expect } from "@jest/globals";

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
})