const ruta = require("node:path");
const express = require("express");
const rutaPublic = ruta.join(__dirname, "..", "public");

const app = express();
app.use(express.static(rutaPublic));
const puerto = (Number(process.env.PORT) ||3000);
app.listen(puerto, () => {
    console.log(`Servidor disponible en http://localhost:${puerto}`);
});