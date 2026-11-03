import express from "express";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {RepositorioLigas} from "./RepositorioLigas.js"
import crearRouterLigas from "./routes/routerLigas.js"
import { ServicioFutbol } from "./ServicioFutbol.js";

const app = express();
const direccionProyecto = dirname(fileURLToPath(import.meta.url));

app.use(express.json());
app.use(express.urlencoded({extended : false}));
app.use(express.static(join(direccionProyecto, "..", "public")));

const servicioFutbol = new ServicioFutbol();
//inicializa repositorio con datos de las ligas ya formateadas
const datos = await servicioFutbol.listarLigas();
let ligasDetalladas = await Promise.all(datos.map(liga => servicioFutbol.buscarLigaPorId(liga.id)))
const repositorioLigas = new RepositorioLigas()
repositorioLigas.cargarLigas(ligasDetalladas);

app.use("/api/ligas", crearRouterLigas(repositorioLigas))

const port = Number(process.env.PORT ?? 3000);
if(!Number.isInteger(port) || port <1 || port >65535){
    throw new Error("PORT debe ser un entero entre 1 y 65535.");
}

const server = app.listen(port, () =>{
    console.log(`Servidor escuchando en: http://localhost:${port}`);
})
server.on("error", (error)=>{
    console.log("Error al iniciar el servidor:", error);
    process.exit(1);
})