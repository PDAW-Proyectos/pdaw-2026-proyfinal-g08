import { Router } from "express";


export default function crearRouterLigas(repositorio){
    const router = Router();
    router.get("/", async (req, res) =>{
        let ligas;
        try{
            ligas = repositorio.listarLigas();
        }catch(e){}
        res.status(200).json(ligas)
    })
    router.get("/:id", (req,res)=>{
        let id = req.params.id;
        let liga = repositorio.buscarLiga(id)
        res.status(200).json(liga)
    })
    return router;
}