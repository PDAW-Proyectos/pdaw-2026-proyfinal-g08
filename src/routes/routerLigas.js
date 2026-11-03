import { Router } from "express";


export default function crearRouterLigas(servicio){
    const router = Router();
    router.get("/", async (req, res) =>{
        try{
            res.status(200).json(await servicio.listar);
        }catch(error){

        }
    })
    return router;
}