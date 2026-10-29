const { createApp } = require("./app");
const { createUserStore } = require("./users");

async function startServer() {
  const users = await createUserStore(
    process.env.USER_STORE_PATH,
  );
  const app = createApp({
    users,
    production: process.env.NODE_ENV === "production",
  });
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => {
    console.log(`Servidor disponible en http://localhost:${port}`);
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error("No se pudo iniciar el servidor:", error);
    process.exitCode = 1;
  });
}

module.exports = { startServer };
