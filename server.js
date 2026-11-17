import { pathToFileURL } from "node:url";
import { startServer } from "./src/js/server.js";

export { startServer };

const isMainModule =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  startServer().catch((error) => {
    console.error("No se pudo iniciar el servidor:", error);
    process.exit(1);
  });
}
