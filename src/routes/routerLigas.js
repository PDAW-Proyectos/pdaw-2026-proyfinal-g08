import { Router } from "express";


export default function crearRouterLigas(servicio){
    const router = Router();
    router.get("/", async (req, res) =>{
        try{
            res.status(200).json(await servicio.listarLigas);
        }catch(error){

        }
    })
    router.get("/:id", (req,res)=>{
        try {
            const liga = servicio.buscarLigaPorId(req.params.id);
            res.status(200).json({liga});
        }catch(error){
            if (error.message === "La liga no existe"){
                return res.status(404).json({error: error.message})
            }
        }
    })
    return router;
}