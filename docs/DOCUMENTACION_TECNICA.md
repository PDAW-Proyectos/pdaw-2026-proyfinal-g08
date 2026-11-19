# Documentación Técnica de Arquitectura y Flujos — **Ofsai**

Este documento describe la arquitectura actual de **Ofsai** tras su refactorización en capas estrictas, el ciclo de vida completo de **«Próximo partido»** (desde cómo se inspecciona el JSON en disco para detectar partidos vencidos y sumar nuevos encuentros, hasta que la tarjeta filtrada y paginada se dibuja en el navegador), el rol exacto de cada archivo en `src/` y `public/`, el manejo centralizado de errores con códigos HTTP explícitos y las reglas de persistencia sobre `data/*.json`.

---

## 1. Visión general de la arquitectura por capas

La aplicación corre sobre **Node.js + Express (ES Modules)** con un único punto de entrada en `src/server.js` y separación estricta de responsabilidades entre backend y frontend:

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        NAVEGADOR (public/ + public/js/)                    │
│  HTML estático + CSS + Módulos ES puros de presentación y captura          │
│  main.js ─▶ inicio.js / ligas.js / equipo.js / buscador.js / auth.js       │
│  partidos.js (tarjetas, paginado y modal) + utils.js (fetchJsonSeguro)     │
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      │ HTTP / JSON (/api/*)
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                            BACKEND (src/)                                  │
│                                                                            │
│  1. Arranque y App:      src/server.js ──▶ src/app.js                      │
│  2. Middlewares:         src/middlewares/{auth,errores}.middleware.js      │
│  3. Rutas (HTTP map):    src/routes/*.routes.js                            │
│  4. Controladores:       src/controllers/*.controller.js                   │
│  5. Servicios (negocio): src/services/*.service.js (sin req/res/Express)   │
│  6. Repositorios:        src/repositories/*Repository.js (memoria + JSON)  │
│  7. Modelos (dominio):   src/models/*.js (campos privados # + toJSON)      │
│  8. Utilidades puras:    src/utils/*.js (fechas, texto, mappers, errores)  │
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      │ HTTPS / JSON + Disco
                                      ▼
         TheSportsDB API (v1/json/123)      Almacenamiento local (data/*.json)
```

### Reglas entre capas
- **Rutas (`src/routes/`)**: únicamente mapean método HTTP + URL a un controlador y aplican middlewares de permisos (`requerirAutenticacion`). No contienen lógica de negocio ni `try/catch`.
- **Controladores (`src/controllers/`)**: extraen datos de `req.params`, `req.query` o `req.body`, validan entradas HTTP básicas (lanzando errores `400` con `crearError`), invocan al servicio correspondiente, deciden el código de estado (`200`, `201`, `204`) y delegan cualquier error a `next(error)`.
- **Servicios (`src/services/`)**: aplican reglas de negocio, orquestación entre repositorios y llamadas externas. No conocen `req`, `res` ni Express.
- **Modelos (`src/models/`)**: entidades encapsuladas con atributos privados `#`, getters/setters, comportamiento propio de dominio (como `Partido.esJugado` o `Partido.yaPasoFecha()`) y serialización uniforme mediante `toJSON()`.
- **Repositorios (`src/repositories/`)**: gestionan colecciones en memoria (deduplicación, ordenamiento, búsqueda) y lectura/escritura sobre archivos `data/*.json`.
- **Utilidades (`src/utils/`)**: funciones puras reutilizables sin dependencia de Express ni estado de dominio (`texto.js`, `fechas.js`, `jsonFile.js`, `apiMappers.js`, `errores.js`).
- **Frontend (`public/`)**: contiene exclusivamente HTML, CSS y módulos ES del navegador en `public/js/`. Solo captura interacciones, consulta `/api/*` mediante `fetchJsonSeguro` y construye el DOM con `document.createElement`, `textContent` y `replaceChildren` (sin `innerHTML`).

---

## 2. Recorrido completo de «Próximo partido» (Punta a punta)

El ciclo de vida de **«Próximo partido»** se compone de tres fases conectadas: **arranque inmediato desde disco**, **sincronización en segundo plano con detección de vencidos y altas**, y **petición HTTP desde el navegador hasta la interfaz paginada**.

### Fase A: Arranque del servidor y carga instantánea (`src/server.js`)

Al ejecutar `npm start` o `npm run dev` (`node src/server.js`):

1. **`startServer()` en `src/server.js`**:
   - Crea `UsuariosRepository` leyendo `data/users.json` e instancia `AuthService`.
   - Instancia `ApiFutbolService`, los repositorios (`LigasRepository`, `PartidosRepository`, `EquiposRepository`) y los servicios (`LigasService`, `PartidosService`, `EquiposService`).
2. **`cargarDatosLocales()` en `src/services/sincronizacion.service.js`** (síncrono, antes de abrir el puerto, 0 peticiones externas):
   - `ligasRepo.cargarLocal(LIGAS_PRINCIPALES_DEFAULT)`: lee `data/ligas.json` (si no existe, siembra las 5 ligas principales con `tabla: []`).
   - `equiposRepo.cargarLocal()`: carga los clubes cacheados en `data/equipos.json`.
   - `partidosRepo.agregarVarios(partidosRepo.cargarJugadosLocal())`: carga el historial desde `data/partidos_jugados.json`.
   - Lee `data/proximos_partidos.json` con `partidosRepo.cargarProximosLocal()` y **filtra en memoria** antes de cargarlos en `PartidosRepository`:
     ```js
     const proximosVigentes = partidosRepo
       .cargarProximosLocal()
       .filter((p) => !p.esJugado && !p.yaPasoFecha(fechaReferencia));
     ```
     De esta manera, si el servidor estuvo apagado varios días, **ningún partido vencido aparece jamás como próximo** en el primer segundo de vida.
   - `equiposService.completarEscudosPartidos(...)` rellena cualquier escudo faltante usando caché local o tablas de ligas.
3. **`createApp(...)` en `src/app.js`**:
   - Configura middlewares, rutas `/api/*`, manejador `404` JSON para `/api`, estáticos de `public/` y manejador global de errores.
   - Abre el puerto (`resolverPuertoServidor()`, por defecto `3000`) inmediatamente y **recién después** lanza `sincronizarDatosApi(...)` en segundo plano para no bloquear el inicio.

---

### Fase B: Cómo se revisa el JSON, se detectan partidos «vencidos» y se agregan nuevos (`sincronizarDatosApi`)

Toda esta lógica vive en **`src/services/sincronizacion.service.js`** junto con **`src/models/Partido.js`**, **`src/utils/fechas.js`** y **`src/repositories/PartidosRepository.js`**:

#### 1. Cómo se determina si un partido en el JSON está «vencido»
Cada elemento leído de `data/proximos_partidos.json` se convierte mediante `mapearPartidoAPI(p)` (`src/utils/apiMappers.js`) en una instancia `Partido` (`src/models/Partido.js`):
- **Fecha exacta en UTC (`Partido.fechaDate` → `parsearFechaUTC`)**:
  1. Si existe `timestamp` (ej. `"2026-11-18T20:00:00"`), `parsearFechaUTC` (`src/utils/fechas.js`) garantiza sufijo `Z` o zona horaria explícita para evitar desfases con la hora local del servidor y crea `new Date(...)`.
  2. Si no hay `timestamp`, combina `${fecha}T${hora || "00:00:00"}Z`.
- **Regla de vencimiento (`partido.yaPasoFecha(fechaReferencia)`)**:
  - Compara `fechaPartido.getTime() < referencia.getTime()`. Si el horario de inicio del partido ya quedó en el pasado respecto a la hora actual (`new Date()`), se considera **vencido**.
- **Regla de partido ya finalizado (`partido.esJugado`)**:
  - Es `true` si `estado === "FT"` o si ambos marcadores (`golesLocal` y `golesVisitante`) no son nulos/indefinidos.

#### 2. Qué ocurre con los partidos vencidos y los vigentes
Dentro de `sincronizarDatosApi(...)`:
1. Lee nuevamente `partidosRepo.cargarProximosLocal()`.
2. Recorre cada partido del archivo:
   - **Si `partido.yaPasoFecha(fechaReferencia) || partido.esJugado` (vencido o jugado)**:
     - Marca `huboCambiosProximos = true`.
     - Lo quita del repositorio en memoria (`partidosRepo.eliminar(partido.id)`).
     - Consulta a TheSportsDB el evento oficial mediante `partidosService.buscarEventoPorId(partido.id)` (`lookupevent.php?id=<id>`).
     - Si la API devuelve el evento actualizado, completa los escudos faltantes con `asegurarEscudosPartido(...)` y lo agrega a `nuevosJugados`. (Si la API falla o no responde, pero el registro local ya tenía `esJugado === true`, conserva esa versión).
     - Espera `100 ms` entre eventos vencidos para cuidar el cupo de peticiones.
   - **Si sigue vigente**:
     - Se conserva en `proximosVigentes` (incluyendo partidos de otras copas o ligas que se hayan agregado previamente al visitar fichas de clubes).
3. **Persistencia del historial de jugados**:
   - Si `nuevosJugados.length > 0`, llama a `partidosRepo.anexarJugadosLocal(nuevosJugados)` (política *append-only* sobre `data/partidos_jugados.json`: lee el JSON, usa un `Set` de IDs existentes para evitar duplicados y solo anexa los nuevos) y los suma en memoria con `partidosRepo.agregarVarios(nuevosJugados)`.

#### 3. Cómo se buscan, deduplican y agregan nuevos próximos partidos
1. **Deduplicación previa**: construye `idsYaIncluidos = new Set()` con todos los IDs de `proximosVigentes`.
2. **Búsqueda equitativa por liga (`NUEVOS_POR_LIGA_AL_INICIAR = 1`)**:
   - Itera por las 5 ligas configuradas en `LIGAS_UTILIZADAS_IDS` (`4328`, `4331`, `4332`, `4335`, `4334` en `src/services/apiFutbol.service.js`).
   - Llama a `partidosService.buscarProximosEventosLiga(idLiga, { idsExistentes: idsYaIncluidos, cantidadNuevaObjetivo: 1, fechaReferencia })`:
     1. Consulta `eventsnextleague.php?id=<idLiga>`.
     2. Verifica cuántos partidos devueltos son válidos y **no están** en `idsExistentes`.
     3. Como la clave demo `123` de TheSportsDB suele devolver solo 1 partido en `eventsnextleague.php`, si ese único evento ya estaba guardado (`nuevosEncontrados() < 1`), toma su `jornada` y `temporada` y prueba **hasta 4 rondas consecutivas** (`ronda + 0..3`) en `eventsround.php?id=<idLiga>&r=<ronda>&s=<temporada>`, deteniéndose apenas encuentra 1 partido nuevo o si aparecen 2 rondas vacías seguidas.
3. **Filtrado, selección y escudos**:
   - Filtra candidatos que tengan `id`, `!ev.esJugado`, `!ev.yaPasoFecha(fechaReferencia)` y que no estén en `idsYaIncluidos`.
   - Ordena cronológicamente (`compararFechaAsc`) y toma hasta `1` nuevo por liga (`slice(0, NUEVOS_POR_LIGA_AL_INICIAR)`).
   - Ejecuta `asegurarEscudosPartido(...)`: primero intenta resolver el escudo en local (`equiposService.completarEscudosPartidos`); si sigue faltando, consulta `lookupteam.php` o `searchteams.php`, guarda el club en `EquiposRepository` + `data/equipos.json` y copia su escudo al partido.
   - Agrega el partido a `proximosAcumulados` y registra su ID en `idsYaIncluidos`.
4. **Ordenamiento y escritura final**:
   - Ordena todo `proximosAcumulados` de forma ascendente (`compararFechaAsc`, el más cercano primero).
   - Actualiza `partidosRepo.agregarVarios(proximosFinales)`.
   - Solo si hubo bajas de vencidos, deduplicación o altas nuevas, llama a `partidosRepo.sobrescribirProximosLocal(proximosFinales)`, persistiendo la lista vigente ordenada en `data/proximos_partidos.json`.

> **Alta adicional bajo demanda desde fichas de equipo**: además del arranque, cuando un usuario visita un club (`GET /api/equipos/:id` o `/api/equipos/:id/partidos`) que no tiene próximos partidos cargados en memoria, `EquiposService.#cargarPartidosFaltantes` consulta `eventsnext.php?id=<idEquipo>`, completa escudos locales, suma los partidos a `PartidosRepository` y los anexa a `data/proximos_partidos.json` con `partidosRepo.anexarProximosLocal(prox)` (filtrando vencidos, evitando duplicados con `Set` y reordenando por fecha).

---

### Fase C: Recorrido de una petición desde el navegador hasta la tarjeta en pantalla

Cuando el usuario abre `public/index.html` para ver la sección **Próximos partidos**:

1. **Carga inicial del HTML y script (`public/index.html` → `public/js/main.js`)**:
   - El navegador solicita `/` → `express.static("public")` entrega `index.html`.
   - `index.html` carga únicamente `<script type="module" src="js/main.js"></script>`.
   - `main.js` detecta `document.body.dataset.pagina === "index"`, inicializa buscadores, controles globales y autenticación, y ejecuta `inicializarInicio()` (`public/js/inicio.js`).

2. **Disparo de la petición segura (`public/js/inicio.js` → `public/js/utils.js`)**:
   - `inicializarInicio()` ejecuta en paralelo `cargarLigas()`, `cargarProximos()` y `cargarJugados()`.
   - `cargarProximos()` invoca `fetchJsonSeguro("/api/partidos/proximos?limite=0")` (`public/js/utils.js`).
   - En paralelo, `obtenerLigasCompartidas()` consulta `/api/ligas` y guarda el mapa de escudos de ligas en caché de página.

3. **Enrutamiento, validación y respuesta en el backend (`src/`)**:
   - `GET /api/partidos/proximos?limite=0` entra a `src/app.js`:
     - Pasa por `cargarSesion` (`src/middlewares/auth.middleware.js`), que verifica la cookie `ofsai.sid` si existe.
     - Entra al router `/api/partidos` (`src/routes/partidos.routes.js`), que mapea `GET /proximos` a `controller.obtenerProximos`.
   - **Controlador (`src/controllers/partidos.controller.js`)**:
     - `validarQueryPartidos(req.query)` valida que si viene `limite`, sea un entero no negativo (`/^\d+$/`); si no, lanza `400` (`invalid_limit`).
     - Llama a `partidosService.obtenerProximos(req.query)`.
   - **Servicio (`src/services/partidos.service.js`)**:
     - `#resolverLimite("0", undefined, 10)` interpreta `limite=0` o `todos=true` como `0` (sin tope; por defecto es `10`).
     - Delega en `partidosRepo.obtenerProximos(0, liga)`.
   - **Repositorio (`src/repositories/PartidosRepository.js`)**:
     - Filtra `#partidos.filter((p) => p.esProximo)`.
     - Ordena ascendentemente con `compararFechaAsc`.
     - Como `limite` es `0`, no recorta con `.slice()` y serializa cada instancia llamando a `.toJSON()`, devolviendo un arreglo JSON puro con código `200 OK`.
   - *(Si ocurriera cualquier fallo o ruta inválida, `next(error)` o `rutaApiNoEncontrada` lo envía a `manejarErrores` en `src/middlewares/errores.middleware.js`, que devuelve `{ error, status, code }`)*.

4. **Procesamiento, filtro por fecha, agrupación y paginado en el cliente (`public/js/`)**:
   - `fetchJsonSeguro` verifica `res.ok`, parsea el JSON de forma segura y devuelve el arreglo a `cargarProximos()` (si falla, dibuja `crearAvisoError` con código HTTP, causa breve y botón **Reintentar**).
   - `todosLosProximos` se guarda en memoria y se llama a `renderizarProximos()` (definida en `configurarFiltroFecha` dentro de `public/js/inicio.js`):
     1. **Filtro por fecha**: si hay `fechaFiltro` activa (botones **Todos**, **Hoy**, **Mañana** o `<input type="date" id="filtroFechaInicio">`), filtra los partidos donde `extraerClaveFechaPartido(p) === fechaFiltro` (`public/js/utils.js` convierte la fecha/hora al día calendario local `YYYY-MM-DD`). Si no hay coincidencias para esa fecha, muestra un estado vacío con el botón **Ver todos los partidos**.
     2. **Paginado (`renderizarListaPartidosPaginada` en `public/js/partidos.js`)**:
        - Usa `paginarElementos(filtrados, paginaActual, 6)` (`public/js/utils.js`) para tomar exactamente **6 partidos por página** (`PARTIDOS_POR_PAGINA_INICIO = 6`). Cada vez que cambia el filtro de fecha, el paginado vuelve automáticamente a la página 1.
        - Construye la barra `.paginacion-partidos` usando `calcularPaginasVisibles(paginaActual, totalPaginas)` (`‹`, números de página con elipsis `…` si hay muchas páginas, `›` y conteo `desde–hasta de total`) solo cuando `totalPaginas > 1`.
     3. **Agrupación por competición (`agruparPartidosPorCompetencia` en `public/js/inicio.js`)**:
        - Agrupa los 6 partidos de la página activa por `idLiga`, ordenándolos según el orden de ligas cargadas.
        - `crearBloqueCompetenciaProximos` genera la cabecera de cada competición (escudo, nombre, enlace a `liga.html?id=...` y conteo).
     4. **Construcción segura de cada tarjeta (`crearElementoPartidoInicio` en `public/js/partidos.js`)**:
        - Crea un `<article class="partido-resumen">` usando `crearElemento` (`document.createElement` + `textContent`): muestra liga, jornada, fecha corta (`formatearFechaPartido`), escudos y nombres con enlaces a `equipo.html?id=...`, y la hora (`formatearHora`) o resultado.
        - `vincularAperturaModalPartido` agrega accesibilidad (`role="button"`, `tabindex="0"`, Enter/Espacio) y listener de clic (ignorando clics sobre enlaces `<a>` de equipos) para abrir `<dialog id="modalDetallePartido">`.
        - Al abrir el modal, si faltan `estadio` o `descripcion`, `enriquecerDesdeServidor` consulta `GET /api/partidos/:id` en segundo plano y actualiza el contenido del diálogo sin cerrar la vista.

---

## 3. Integración con la API externa (TheSportsDB)

Toda comunicación con `https://www.thesportsdb.com/api/v1/json/123/` ocurre exclusivamente desde el backend a través de **`src/services/apiFutbol.service.js`** (`ApiFutbolService`).

### 3.1 Control de tráfico y resiliencia (`ApiFutbolService.fetchJson`)
1. **Cola secuencial (`#colaPeticiones`)**: encadena todas las peticiones salientes en una promesa compartida para impedir ráfagas concurrentes hacia TheSportsDB.
2. **Espaciado mínimo (`#esperarTurno`)**: garantiza un intervalo mínimo de `1100 ms` entre llamadas reales (`0 ms` cuando se inyecta un `fetch` simulado en pruebas).
3. **Reintentos de red**: si `fetch` falla a nivel de red, reintenta hasta `maxReintentos` (2 por defecto) esperando `400 * (intento + 1)` ms; si persiste al agotar reintentos, lanza `crearError(502, "external_api_unreachable", ...)`.
4. **Control de cuota (`HTTP 429`)**: inspecciona `Retry-After`. Si la espera es `<= 5` segundos y quedan intentos, aguarda `(segundos + 1) * 1000` ms y reintenta; en caso contrario lanza `crearError(429, "rate_limited", ...)` con el tiempo indicado.
5. **Validación HTTP y JSON**: si `!respuesta.ok`, lanza `crearError(502, "external_api_error", ...)`; si el cuerpo no es JSON válido, lanza `crearError(502, "external_api_invalid_json", ...)`.

### 3.2 Mapa de endpoints de TheSportsDB y cuándo se invocan

| Endpoint TheSportsDB | Método y servicio responsable | Disparo | Política de caché y persistencia |
| :--- | :--- | :--- | :--- |
| `eventsnextleague.php?id=<liga>` | `PartidosService.buscarProximosEventosLiga` | `sincronizarDatosApi` al iniciar | Trae próximos partidos de cada liga principal para sumar hasta `1` nuevo por arranque en `data/proximos_partidos.json`. |
| `eventsround.php?id=<liga>&r=<ronda>&s=<temp>` | `PartidosService.buscarProximosEventosLiga` | Respaldo automático si `eventsnextleague.php` no trajo nuevos | Explora hasta 4 rondas consecutivas para evitar quedar estancado cuando la API demo repite el mismo partido. |
| `lookupevent.php?id=<evento>` | `PartidosService.buscarEventoPorId` | `sincronizarDatosApi` al vencer un partido | Busca el marcador oficial de partidos vencidos para anexarlos a `data/partidos_jugados.json`. |
| `lookuptable.php?l=<liga>(&s=<temp>)` | `LigasService.buscarTablaDeLiga` | `GET /api/ligas/:id` (bajo demanda) | Solo si `liga.tabla` está vacía; persiste el resultado en `data/ligas.json` para futuras visitas. |
| `lookupteam.php?id=<equipo>` | `EquiposService.buscarEquipoPorId` | `asegurarEscudosPartido` o `GET /api/equipos/:id` | Solo si el club no existe en `data/equipos.json`; luego se anexa de forma permanente. |
| `searchteams.php?t=<nombre>` | `EquiposService.buscarEquiposPorNombre` | `GET /api/equipos/buscar?q=` | Solo si `q.length >= 3` y no hay coincidencias locales ni en tablas; filtra solo fútbol (`Soccer`) y anexa a `data/equipos.json`. |
| `eventsnext.php?id=<equipo>` | `PartidosService.buscarProximosEventosEquipo` | `GET /api/equipos/:id` y `/partidos` | Si el equipo no tiene próximos en memoria, los consulta y anexa a `data/proximos_partidos.json`. |
| `eventslast.php?id=<equipo>` | `PartidosService.buscarUltimosEventosEquipo` | `GET /api/equipos/:id` y `/partidos` | Si el equipo no tiene jugados en memoria, los consulta y anexa a `data/partidos_jugados.json`. |

---

## 4. Manejo integral de errores y códigos HTTP

### 4.1 Flujo en el backend
- **`src/utils/errores.js`**: define `AppError` (extiende `Error` con `status` y `code`) y el helper `crearError(status, code, message)`.
- **`src/middlewares/errores.middleware.js`**:
  - `rutaApiNoEncontrada`: montado al final de las rutas `/api` antes de `express.static("public")` para asegurar que cualquier ruta `/api/*` desconocida responda JSON `404` (`route_not_found`) y no HTML.
  - `manejarErrores`: middleware final de 4 parámetros `(error, req, res, next)` que normaliza:
    - `400`: JSON malformado en el cuerpo (`invalid_json`), parámetros inválidos (`invalid_limit`, `invalid_type`, `missing_query`, `invalid_login`, `invalid_registration`, etc.).
    - `401`: sesión requerida (`unauthorized`) o credenciales inválidas (`invalid_credentials`).
    - `404`: partido, liga, equipo o ruta de API inexistente (`match_not_found`, `league_not_found`, `team_not_found`, `route_not_found`).
    - `409`: correo electrónico ya registrado (`email_exists`).
    - `413`: cuerpo de solicitud superior a `16kb` (`payload_too_large`).
    - `429` / `502`: límite de cuota o falla en TheSportsDB (`rate_limited`, `external_api_*`).
    - `500`: errores internos inesperados (`internal_error`) sin filtrar *stack traces* al cliente.

### 4.2 Flujo y recuperación en el frontend (`public/js/utils.js`)
- **`fetchJsonSeguro(url, opciones)`**:
  - Envuelve `fetch`: respeta `AbortError` (para cancelaciones del buscador) y traduce fallos de red en `Error de conexión: No se pudo comunicar con el servidor.` (`status: 0`).
  - Lee el cuerpo como texto antes de hacer `JSON.parse` (evitando errores crudos como `Unexpected token '<'` si llega una página HTML en un `502` o proxy).
  - Si `!respuesta.ok`, construye un error con formato unificado **`Error <código HTTP>: <causa breve>`**.
- **`crearAvisoError(error, { onReintentar, textoReintentar, centrado })`**:
  - Dibuja un bloque accesible (`role="alert"`) dentro de la sección afectada (inicio, ligas, detalle de liga, detalle de equipo) mostrando el código HTTP, la causa breve y un botón **Reintentar** que vuelve a ejecutar únicamente la carga fallida.

---

## 5. Detalle completo por archivo y rol en el sistema

### 5.1 Arranque, servidor y middlewares (`src/`)
| Archivo | Capa | Qué hace y rol en la aplicación |
| :--- | :--- | :--- |
| **`src/server.js`** | Arranque | Único punto de entrada del servidor. Compone repositorios y servicios, ejecuta `cargarDatosLocales`, abre el puerto seguro (`resolverPuertoServidor`) y lanza `sincronizarDatosApi` en segundo plano. |
| **`src/app.js`** | Aplicación HTTP | Fábrica `createApp` con inyección de dependencias (permite testear con mocks sin levantar puertos reales). Configura `express.json({ limit: "16kb" })`, sesión, routers `/api/*`, `rutaApiNoEncontrada`, estáticos en `public/` y `manejarErrores`. |
| **`src/middlewares/auth.middleware.js`** | Middleware | `cargarSesion` lee la cookie `ofsai.sid` e hidrata `req.user`; `requerirAutenticacion` bloquea rutas privadas devolviendo `401` JSON estructurado. |
| **`src/middlewares/errores.middleware.js`** | Middleware | `rutaApiNoEncontrada` captura rutas `/api/*` inválidas (`404` JSON) y `manejarErrores` centraliza todos los códigos HTTP y respuestas `{ error, status, code }`. |

### 5.2 Rutas y controladores (`src/routes/` y `src/controllers/`)
| Archivo | Capa | Qué hace y endpoints que atiende |
| :--- | :--- | :--- |
| **`src/routes/auth.routes.js`** | Ruta | Mapea `/api/register`, `/api/login`, `/api/me` (protegida) y `/api/logout` (protegida). |
| **`src/controllers/auth.controller.js`** | Controlador | Valida presencia de credenciales en login, delega registro/sesión a `AuthService`, emite/limpia cookie `ofsai.sid` (`HttpOnly`, `SameSite=Lax`) y envía errores a `next(error)`. |
| **`src/routes/ligas.routes.js`** | Ruta | Mapea `/api/ligas`, `/api/ligas/:id` y `/api/ligas/:id/partidos`. |
| **`src/controllers/ligas.controller.js`** | Controlador | Valida que `:id` no esté vacío, invoca `LigasService` y delega errores `400`/`404` al middleware central. |
| **`src/routes/partidos.routes.js`** | Ruta | Mapea `/api/partidos`, `/api/partidos/proximos`, `/api/partidos/jugados` y `/api/partidos/:id`. |
| **`src/controllers/partidos.controller.js`** | Controlador | Valida `query.limite` (entero >= 0), `query.tipo` (`proximos`/`jugados`) y `params.id`; delega consultas a `PartidosService`. |
| **`src/routes/equipos.routes.js`** | Ruta | Mapea `/api/equipos`, `/api/equipos/buscar`, `/api/equipos/:id` y `/api/equipos/:id/partidos`. |
| **`src/controllers/equipos.controller.js`** | Controlador | Exige `q` no vacío en `/buscar` (`400`), valida `:id` y delega en `EquiposService`. |

### 5.3 Servicios de negocio (`src/services/`)
| Archivo | Qué hace y reglas que aplica |
| :--- | :--- |
| **`src/services/apiFutbol.service.js`** | Cliente HTTP hacia TheSportsDB (`ApiFutbolService`) con cola secuencial, espaciado mínimo (`1100 ms`), reintentos y manejo de `429`/`502`. Define `LIGAS_UTILIZADAS_IDS` y `LIGAS_PRINCIPALES_DEFAULT`. |
| **`src/services/sincronizacion.service.js`** | Orquesta `cargarDatosLocales` (inicio inmediato), `sincronizarDatosApi` (limpieza de partidos vencidos, migración a jugados, alta incremental de próximos + escudos) e `inicializarDatosFutbol` (usada en pruebas). |
| **`src/services/partidos.service.js`** | Resuelve límites (`limite=0` / `todos=true` vía `#resolverLimite`), consulta próximos, jugados o detalle por ID en `PartidosRepository` y consulta eventos de liga/equipo en `ApiFutbolService` (incluyendo fallback de rondas en `eventsround.php`). |
| **`src/services/ligas.service.js`** | Lista ligas, obtiene partidos de una liga y carga la tabla de posiciones bajo demanda en `obtenerDetalle(id)` guardándola en `data/ligas.json` (registrando `errorTabla` con código HTTP si falla la API externa). |
| **`src/services/equipos.service.js`** | Búsqueda en cascada (caché local → tablas de ligas → `searchteams.php` para `q.length >= 3`), resolución local de escudos, armado del detalle completo (equipo + liga + posición + próximo + último partido) y carga bajo demanda de partidos del club. |
| **`src/services/auth.service.js`** | Valida registro (nombre, correo, contraseña 8–128 chars, equipo opcional), deriva claves con `crypto.scrypt` + *salt* aleatorio de 16 bytes, verifica con `timingSafeEqual` y gestiona sesiones en memoria (`Map`) por 7 días. |

### 5.4 Modelos, repositorios y utilidades (`src/models/`, `src/repositories/`, `src/utils/`)
| Archivo | Capa | Rol específico |
| :--- | :--- | :--- |
| **`src/models/Posicion.js`** | Modelo | Fila de tabla de posiciones (`#idEquipo`, `#posicion`, `#puntos`, `#victorias`, `#golesFavor`, etc.) con `toJSON()`. |
| **`src/models/Liga.js`** | Modelo | Competición (`#id`, `#nombre`, `#pais`, `#escudo`, `#temporada`) cuyo setter `tabla` normaliza cada elemento como `Posicion`. |
| **`src/models/Partido.js`** | Modelo | Encuentro con getters calculados (`esJugado`, `esProximo`, `fechaDate`), método `yaPasoFecha(referencia)` y `toJSON()`. |
| **`src/models/Equipo.js`** | Modelo | Club con `#proximoPartido` y `#ultimoPartido` normalizados como `Partido`, `#posicion` y `#liga`. |
| **`src/models/Usuario.js`** | Modelo | Usuario con `toPublicJSON()` (omite `passwordHash` y `salt`) y `toJSON()` (para persistencia). |
| **`src/repositories/LigasRepository.js`** | Repositorio | Carga/guarda `data/ligas.json` y busca ligas por ID, nombre normalizado o alias (`premier`, `laliga`, `bundesliga`, `seriea`, `ligue`), lanzando `404` si no existe. |
| **`src/repositories/PartidosRepository.js`** | Repositorio | Gestiona próximos y jugados en memoria y disco (`cargar*Local`, `sobrescribirProximosLocal`, `anexarProximosLocal`, `anexarJugadosLocal`), ordena ascendente/descendente y lanza `404` si falta un ID. |
| **`src/repositories/EquiposRepository.js`** | Repositorio | Carga/anexa `data/equipos.json` (*append-only* deduplicado), fusiona datos parciales del mismo club sin pisar campos previos y rankea coincidencias en `buscarCoincidencias()`. |
| **`src/repositories/UsuariosRepository.js`** | Repositorio | Lee/crea usuarios en `data/users.json` con cola de escritura secuencial (`#writeQueue`), archivo temporal `0o600` + `fs.rename` atómico y error `409` ante correos duplicados. |
| **`src/utils/texto.js`** | Utilidad | `normalizarTexto()` quita tildes, mayúsculas y símbolos no alfabéticos para búsquedas tolerantes. |
| **`src/utils/fechas.js`** | Utilidad | `esperar()`, `parsearFechaUTC()`, `tiempoPartidoMs()`, `compararFechaAsc` y `compararFechaDesc`. |
| **`src/utils/jsonFile.js`** | Utilidad | `existeArchivo()`, `leerJson()` y `escribirJson()` sobre `node:fs` con respaldo seguro y creación automática de carpetas. |
| **`src/utils/apiMappers.js`** | Utilidad | Traduce estructuras crudas de TheSportsDB (`idEvent`, `strHomeTeam`, `intRank`, etc.) y JSON locales a entidades `Posicion`, `Partido`, `Equipo` u objeto de liga. |
| **`src/utils/errores.js`** | Utilidad | Define `AppError` y `crearError(status, code, message)`. |

### 5.5 Frontend modular (`public/` y `public/js/`)
| Archivo | Rol en la interfaz |
| :--- | :--- |
| **`public/*.html`** | Páginas estáticas (`index.html`, `ligas.html`, `liga.html`, `equipo.html`, `tienda.html`, `foro.html`) que cargan Bootstrap 5, `css/styles.css` y un único módulo `<script type="module" src="js/main.js"></script>`. |
| **`public/css/styles.css`** | Diseño visual completo (paleta verde/grada, barra de filtro por fecha, grupos por competición, paginación `.paginacion-partidos`, modal de partido, buscador y estados de error `.estado-error-bloque`). |
| **`public/js/main.js`** | Punto de entrada único en el navegador: inicia buscadores, controles transversales (año actual, selector de fecha, favoritos protegidos en `localStorage`), autenticación y el inicializador de la página activa (`data-pagina`). |
| **`public/js/utils.js`** | Caché compartida de ligas (`obtenerLigasCompartidas`, `obtenerEscudoLiga`), helpers de fecha/hora en español, `crearElemento`/`crearEscudoImg`, paginación pura (`paginarElementos`, `calcularPaginasVisibles`), `fetchJsonSeguro`, `formatearErrorHttp` y `crearAvisoError`. |
| **`public/js/partidos.js`** | Renderizado de tarjetas (`crearElementoPartidoInicio`, `crearElementoPartidoLiga`), barra reutilizable de paginado (`renderizarListaPartidosPaginada`) y `<dialog id="modalDetallePartido">` con enriquecimiento desde `/api/partidos/:id`. |
| **`public/js/inicio.js`** | Controlador de `index.html`: carga en paralelo ligas, próximos partidos (`limite=0`) y jugados (`limite=0`), aplica el filtro por fecha (**Todos / Hoy / Mañana / Calendario**), agrupa por liga y pagina de a **6 partidos** con recuperación ante errores. |
| **`public/js/ligas.js`** | Controlador de `ligas.html` (tablas resumidas bajo demanda en `<details>`) y `liga.html` (tabla completa de posiciones con reintento y listas paginadas de a **5 partidos**). |
| **`public/js/equipo.js`** | Controlador de `equipo.html`: cabecera del club, posición en tabla, próximo y último partido destacados, ficha institucional y listas laterales paginadas de a **5 partidos**, con errores HTTP explícitos y reintento. |
| **`public/js/buscador.js`** | Autocompletado accesible (`role="listbox"`) en el navbar con *debounce* de `260 ms`, cancelación con `AbortController`, navegación por teclado (`ArrowUp`, `ArrowDown`, `Enter`, `Escape`) y mensajes de error HTTP explícitos. |
| **`public/js/auth.js`** | Modal `<dialog>` de registro e inicio de sesión conectado a `/api/register`, `/api/login`, `/api/me` y `/api/logout`, validación accesible por campo y manejo seguro de errores. |

---

## 6. Política de persistencia sobre `data/*.json`

| Archivo JSON | Política | Métodos responsables | Comportamiento exacto |
| :--- | :--- | :--- | :--- |
| **`data/proximos_partidos.json`** | **Limpieza de vencidos + acumulación ordenada** | `sobrescribirProximosLocal()` y `anexarProximosLocal()` (`PartidosRepository`) | Al iniciar, elimina vencidos/jugados, conserva vigentes y suma 1 nuevo por cada liga principal. Al abrir un club sin agenda previa, anexa todos los nuevos vigentes descubiertos evitando duplicados con `Set` y reordena cronológicamente. |
| **`data/partidos_jugados.json`** | **Solo anexar (*Append-only*)** | `anexarJugadosLocal()` (`PartidosRepository`) | Nunca borra historial previo. Añade nuevos IDs cuando un partido próximo vence al iniciar o al consultar `eventslast.php` desde un equipo. |
| **`data/equipos.json`** | **Solo anexar (*Append-only*)** | `anexarLocal()` (`EquiposRepository`) | Nunca borra clubes. Deduplica por `id` y nombre normalizado, guardando solo los datos base del club. |
| **`data/ligas.json`** | **Siembra inicial + tabla bajo demanda** | `cargarLocal()` y `guardarLocal()` (`LigasRepository`) | Si no existe, crea las 5 ligas con `tabla: []`. Al abrir por primera vez una liga sin tabla, persiste la clasificación obtenida de `lookuptable.php`. |
| **`data/users.json`** | **Escritura atómica en cola** | `create()` y `#persist()` (`UsuariosRepository`) | Encola escrituras en `#writeQueue`, escribe archivo temporal con permisos `0o600` y ejecuta `fs.rename()` atómico. |

---

## 7. Conceptos técnicos y decisiones de diseño relevantes

1. **Encapsulamiento con `#` y polimorfismo por contrato (`toJSON`)**:
   - Todas las entidades (`Posicion`, `Liga`, `Partido`, `Equipo`, `Usuario`) protegen su estado interno en atributos privados `#` y exponen un método `toJSON()` uniforme.
   - Los repositorios y modelos normalizan entradas en sus constructores (`new Partido(...)`, `new Posicion(...)`, `new Equipo(...)`), evitando comprobaciones frágiles con `instanceof` o `typeof` para decidir cómo serializar.

2. **Construcción segura del DOM sin `innerHTML`**:
   - Todo el HTML dinámico del navegador se crea con `crearElemento`, `textContent` y `replaceChildren`, neutralizando riesgos de inyección XSS incluso con textos externos de la API.
   - Para el ícono de búsqueda en `buscador.js` se utiliza `document.createElementNS("http://www.w3.org/2000/svg", ...)` porque los vectores SVG requieren el espacio de nombres XML oficial del W3C (no realiza ninguna petición externa).

3. **Protección de sesión y almacenamiento**:
   - Las contraseñas jamás se almacenan en texto plano: se usa `scrypt` con *salt* aleatorio de 16 bytes y comparación en tiempo constante (`timingSafeEqual`).
   - Las cookies de sesión (`ofsai.sid`) usan `httpOnly: true` y `sameSite: "lax"` (más `secure: true` en producción).
   - El frontend protege la lectura/escritura de favoritos en `localStorage` con `try/catch` para resistir datos corruptos o almacenamiento bloqueado.

4. **Por qué se usa `parsearFechaUTC` y comparación por milisegundos**:
   - TheSportsDB entrega fechas (`dateEvent`) y horas (`strTime`) en UTC. Interpretarlas explícitamente como UTC (`...Z`) garantiza que la detección de partidos vencidos en el servidor sea independiente de la zona horaria de la máquina donde corra Node.js, mientras que en el navegador `extraerClaveFechaPartido` y `formatearFechaPartido` convierten al huso horario local del usuario.
