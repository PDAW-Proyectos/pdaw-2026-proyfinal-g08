export const LIGAS_UTILIZADAS_IDS = ["4328", "4331", "4332", "4335", "4334"];
import { formatearLigaAPI } from "./Formatos.js";

export class ServicioFutbol{
    constructor(fetchFn = fetch){
        this.fetchFn = fetchFn
    }

    async listarLigas(){
        const url = new URL(`https://www.thesportsdb.com/api/v1/json/123/all_leagues.php`);
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
        if(!respuesta.ok){
            throw new Error("Falla de la API");
        }
        let datos = (await respuesta.json()).leagues.filter(liga => LIGAS_UTILIZADAS_IDS.includes(liga.idLeague))
        let arregloFormateado = datos.map(liga => formatearLigaAPI(liga))
        return arregloFormateado;
    }

    async buscarLigaPorId(id){
        const url = new URL(`https://www.thesportsdb.com/api/v1/json/123/lookupleague.php`);
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
        if(!respuesta.ok){
            throw new Error("Falla de la API");
        }
        let datos = (await respuesta.json()).leagues;
        let equipo = formatearLigaAPI(datos[0])
        return equipo;
    }

  
}
