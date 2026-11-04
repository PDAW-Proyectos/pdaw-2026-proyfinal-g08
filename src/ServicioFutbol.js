export const LIGAS_UTILIZADAS_IDS = ["4328", "4331", "4332", "4335", "4334"];
import { formatearLigaAPI, formatearTablaAPI} from "./Formatos.js";

export class ServicioFutbol{
    constructor(fetchFn = fetch){
        this.fetchFn = fetchFn;
        this.rutaBase = new URL("https://www.thesportsdb.com/api/v1/json/123/");
    }

    async listarLigas(){
        const url = new URL("all_leagues.php", this.rutaBase);
        const controller = new AbortController()
        let respuesta;
        try{
            respuesta = await this.fetchFn(url, {signal : controller.signal});
        }catch(error){
            if (error.name === "TimeoutError" || error.name === "AbortError"){
                throw new Error("TimeoutError");
            }
            throw error;
        } 
        // Comprobacion de falla exceso de limite de peticiones (Se repite en otros endpoints)
        if (respuesta.status === 429) {
            const espera = respuesta.headers.get("Retry-After");
            throw new Error(
                espera
                ? `Límite de peticiones de la API alcanzado. Reintenta en ${espera} segundo.`
                : "Límite de peticiones de la API alcanzado. Reintenta más tarde."
            );
        }
        if(!respuesta.ok){
            throw new Error("Falla de la API");
        }
        let datos = (await respuesta.json()).leagues.filter(liga => LIGAS_UTILIZADAS_IDS.includes(liga.idLeague))
        let arregloFormateado = datos.map(liga => formatearLigaAPI(liga))
        return arregloFormateado;
    }

    async buscarLigaPorId(id){
        const url = new URL("lookupleague.php", this.rutaBase);
        url.searchParams.set("id",id);
        const controller = new AbortController()
        let respuesta;
        try{
            respuesta = await this.fetchFn(url, {signal : controller.signal});
        }catch(error){
            if (error.name === "TimeoutError" || error.name === "AbortError"){
                throw new Error("TimeoutError");
            }
            throw error;
        }
        if (respuesta.status === 429) {
            const espera = respuesta.headers.get("Retry-After");
            throw new Error(
                espera
                ? `Límite de peticiones de la API alcanzado. Reintenta en ${espera}.`
                : "Límite de peticiones de la API alcanzado. Reintenta más tarde."
            );
        }
        if(!respuesta.ok){
            throw new Error("Falla de la API");
        }
        let datos = (await respuesta.json()).leagues;
        let equipo = formatearLigaAPI(datos[0])
        return equipo;
    }
    async buscarTablaDeLiga(id){
        const url = new URL("lookuptable.php", this.rutaBase);
        url.searchParams.set("l", id);
        let respuesta;
        try{
            respuesta = await this.fetchFn(url);
        }catch(error){
            if (error.name === "TimeoutError" || error.name === "AbortError"){
                throw new Error("TimeoutError");
            }
            throw error;
        }
        if (respuesta.status === 429) {
            const espera = respuesta.headers.get("Retry-After");
            throw new Error(
                espera
                ? `Límite de peticiones de la API alcanzado. Reintenta en ${espera}.`
                : "Límite de peticiones de la API alcanzado. Reintenta más tarde."
            );
        }
        if(!respuesta.ok)
            throw new Error("Falla de la API");

        let datos = (await respuesta.json()).table;
        let tabla = formatearTablaAPI(datos);
        return tabla;
    }

  
}
