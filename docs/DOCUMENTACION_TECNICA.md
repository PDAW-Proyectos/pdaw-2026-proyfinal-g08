# Documentación Técnica de Arquitectura y Flujos — **Ofsai**

Este documento explica en profundidad la arquitectura completa de **Ofsai**, el rol de cada archivo JavaScript dentro de `src/` y `public/`, la evaluación técnica y de seguridad de `public/js/main.js`, las trazas completas desde la API externa (TheSportsDB) hasta la interfaz web, y la estrategia de persistencia sobre los archivos `.json` en `data/`.

---

## 1. Visión general de la arquitectura

La aplicación sigue una arquitectura **Node.js + Express (ES Modules)** dividida en capas con separación estricta de responsabilidades:

1. **Punto de entrada del servidor (`server.js` y `src/js/server.js`)**: inicializa repositorios, sincroniza datos locales/API respetando límites de tasa y levanta Express en el puerto `3000`.
2. **Capa de aplicación HTTP (`src/js/app.js` y `src/js/Routes/*`)**: expone endpoints REST `/api/*`, gestiona sesiones con cookies `HttpOnly`, sirve el cliente modular bajo `/cliente` y los archivos estáticos de `public/`.
3. **Capa de dominio y persistencia (`src/js/Futbol/*` y `src/js/usuarios/*`)**: modela entidades encapsuladas con atributos privados (`#`), transforma los datos externos en objetos del dominio, gestiona caché en memoria y escribe/lee archivos `.json` en `data/`.
4. **Capa de presentación cliente (`public/js/main.js` + `src/js/cliente/*`)**: `public/js/main.js` actúa como único script dentro de `public/` y delega cada funcionalidad de interfaz a módulos pequeños y especializados dentro de `src/js/cliente/`.

---

## 2. Evaluación técnica de `public/js/main.js` (Seguridad, Integridad y Buenas Prácticas)

### ¿Qué hace `public/js/main.js`?
`public/js/main.js` (35 líneas) es exclusivamente el **punto de entrada (*entry point* / *composition root*)** del navegador. Su única tarea es:
1. Esperar a que el DOM esté parseado (`DOMContentLoaded` o ejecución directa si ya cargó).
2. Inicializar los componentes transversales presentes en todas las páginas (`inicializarBuscadores()` e `inicializarControlesGenerales()`).
3. Detectar la vista actual mediante `document.body.dataset.pagina` (y respaldos por IDs clave) y ejecutar únicamente el controlador de esa página (`inicializarInicio`, `inicializarLiga`, `inicializarEquipo`, `inicializarLigas`).

### ¿Es correcto desde el punto de vista de seguridad, integridad y buena programación?

**Sí, el enfoque de diseño es sólido y sigue estándares modernos**, con algunos matices importantes que conviene conocer:

#### Fortalezas de ingeniería y seguridad
1. **Principio de Responsabilidad Única (SRP)**: `main.js` ya no mezcla acceso a red, formateo de fechas, creación de DOM y lógica de 4 páginas distintas en un bloque de ~1.000 líneas. Cada módulo en `src/js/cliente/` atiende un único problema.
2. **Aislamiento de ámbito mediante ES Modules (`<script type="module">`)**: al cargarse como módulo ES, `main.js` no contamina el objeto global `window` con funciones ni variables internas, reduciendo riesgos de colisiones o manipulación accidental desde consola/scripts externos.
3. **Principio de Menor Privilegio en el cliente**:
   - El navegador **nunca** posee claves ni URLs directas a endpoints sensibles ni escribe archivos.
   - Todas las consultas a TheSportsDB pasan por el backend Express (`/api/*`), donde el servidor controla el ritmo de peticiones (`1100 ms`), filtra respuestas (ej. solo `Soccer`) y persiste en JSON.
4. **Exposición acotada de `src/`**: `src/js/app.js` monta únicamente la subcarpeta `/cliente` (`app.use("/cliente", express.static(...))`) y `/auth.js`, manteniendo ocultos al navegador los archivos de servidor (`server.js`, `users.js`, `ServicioFutbol.js`, `Futbol/*`, `Routes/*`) y los datos (`data/*.json`).
5. **Autenticación e integridad de sesión desacopladas**: `main.js` ni siquiera manipula sesiones ni contraseñas; la autenticación corre por `src/js/usuarios/auth.js` contra `/api/login` y `/api/register` usando cookies `HttpOnly` + `SameSite=Lax`.

#### Puntos a vigilar para mantener la integridad a futuro
1. **Nunca importar archivos de servidor desde `public/js/main.js`**: todo archivo dentro de `src/js/cliente/` es público para el navegador (como todo JS frontend). No debe contener secretos ni validaciones exclusivas que no estén replicadas en el servidor.
2. **Uso exclusivo de `createElement` + `textContent` (sin `innerHTML`)**: todos los módulos en `src/js/cliente/` y `src/js/usuarios/auth.js` construyen el DOM de forma programática mediante `document.createElement`, `textContent` y `replaceChildren`, eliminando la interpolación de cadenas HTML y previniendo riesgos de **XSS (Cross-Site Scripting)**.

---

## 3. Catálogo completo de archivos JavaScript en `src/` (y arranque)

### 3.1 Arranque y configuración Express

| Archivo | Responsabilidad principal | Qué contiene y por qué existe |
| :--- | :--- | :--- |
| **`server.js`** *(raíz)* | Lanzador raíz del proyecto | Importa `startServer` desde `./src/js/server.js`. Permite ejecutar `node server.js` desde la raíz comprobando si fue invocado como módulo principal (`isMainModule`). |
| **`src/js/server.js`** | Inicialización de estado y servidor HTTP | Define `inicializarLigas()` (orquesta la carga inicial de JSONs, caducidad de próximos partidos y cupo equitativo de 15 partidos = 3 por liga) y `startServer()` (crea almacén de usuarios, repositorios, aplicación Express y escucha en puerto `3000`). |
| **`src/js/app.js`** | Fábrica de la aplicación Express (`createApp`) | Configura middlewares JSON/URL-encoded, gestión en memoria de sesiones (`ofsai.sid`), endpoints `/api/register`, `/api/login`, `/api/me`, `/api/logout`, monta los routers `/api/ligas`, `/api/partidos`, `/api/equipos`, expone `/auth.js`, `/cliente` (módulos frontend) y `public/` (estáticos), además del manejador global de errores `500`. |

---

### 3.2 Capa de Dominio, Formateo y Persistencia (`src/js/Futbol/`)

Todas las entidades y repositorios de esta carpeta utilizan **campos privados (`#`)**, **getters** de lectura, **setters** controlados y `toJSON()` para serialización segura.

| Archivo | Responsabilidad principal | Qué contiene y por qué existe |
| :--- | :--- | :--- |
| **`Posicion.js`** | Modelo de una fila en la tabla de posiciones | Encapsula `#idEquipo`, `#nombreEquipo`, `#escudoEquipo`, `#idLiga`, `#posicion`, `#partidosJugados`, `#victorias`, `#derrotas`, `#empates`, `#golesFavor`, `#golesContra`, `#diferenciaGol`, `#puntos` y `#racha`. Expone getters, setters editables y `toJSON()`. |
| **`Liga.js`** | Modelo de una competición | Encapsula `#id`, `#nombre`, `#pais`, `#escudo`, `#temporada` y `#tabla` (array de instancias `Posicion`). Al devolver `tabla` retorna una copia (`[...this.#tabla]`) para proteger la integridad interna. |
| **`Equipo.js`** | Modelo de un club de fútbol | Encapsula `#id`, `#nombre`, `#escudo`, `#estadio`, `#pais`, `#fundacion`, `#descripcion`, `#sitioWeb`, `#idLiga`, `#nombreLiga`, más propiedades derivadas para vista detalle (`#proximoPartido`, `#ultimoPartido`, `#posicion`, `#liga`). Soporta construcción por objeto o posicional. |
| **`Partido.js`** | Modelo de un encuentro deportivo | Encapsula todos los datos de un evento (`#id`, `#idLiga`, equipos local/visitante con sus `#escudoEquipo*`, `#golesLocal`, `#golesVisitante`, `#fecha`, `#hora`, `#timestamp`, `#estado`, `#estadio`, `#descripcion`). Incluye getters calculados `esJugado`, `esProximo`, `fechaDate` (UTC) y el método `yaPasoFecha(referencia)`. |
| **`formatos.js`** | Capa de adaptación / *mapper* API <-> Dominio | Funciones puras: `formatearLigaAPI`, `formatearTablaAPI`, `formatearPartidoAPI`, `formatearEquipoAPI` (traducen claves crudas de TheSportsDB como `strHomeTeam`, `intHomeScore`, `strBadge` a nuestras entidades) y `exponerLiga`, `exponerPartido`, `exponerEquipo` (convierten entidades en objetos planos JSON listos para API/disco). |
| **`RepositorioLigas.js`** | Colección en memoria de ligas | Administra `#ligas`. Permite `cargarLigas`, `agregarLiga` (haciendo *merge* si ya existe y conservando tabla si no viene vacía), `buscarLiga` (por ID, nombre normalizado sin tildes/espacios o alias como `"premier"`, `"laliga"`) y `listarLigas`. |
| **`RepositorioPartidos.js`** | Colección en memoria de partidos | Administra `#partidos`. Provee `agregarPartido`/`agregarPartidos` (upsert por `id`), `eliminarPartido`, `obtenerPorId`, `obtenerPorLiga`, `obtenerProximos` (orden ascendente por fecha), `obtenerJugados` (orden descendente) y `obtenerEventosDeLiga`. |
| **`RepositorioEquipos.js`** | Colección y agregador de detalle de clubes | Administra `#equipos`. Además de `agregarEquipo` (fusión sin perder datos existentes), `buscarEquipo`, `buscarCoincidencias` (búsqueda ordenada por exactitud/prefijo), implementa `obtenerDetalleCompleto(id, deps)`: busca el club (local o en API si falta), vincula su posición desde `RepositorioLigas`, y obtiene su próximo y último partido desde `RepositorioPartidos` o consultando a la API bajo demanda si faltan. |
| **`ServicioFutbol.js`** | Cliente HTTP TheSportsDB + Gestor JSON | Centraliza toda comunicación externa y toda lectura/escritura en `data/*.json`. Implementa una **cola secuencial con espaciado mínimo (`1100 ms` en producción, `0 ms` en tests)** y reintentos para `429 Too Many Requests` (`fetchSeguro`), métodos de consulta (`buscarTablaDeLiga`, `buscarProximosEventosLiga` + `eventsround.php`, `buscarEventoPorId`, `buscarEquipoPorId`, `buscarEquiposPorNombre`, `buscarProximosEventosEquipo`, `buscarUltimosEventosEquipo`), resolución local de escudos y métodos específicos de lectura/sobrescritura/anexo para los 4 JSON de fútbol. |

---

### 3.3 Capa de Rutas API REST (`src/js/Routes/`)

| Archivo | Endpoints expuestos | Qué hace cada ruta |
| :--- | :--- | :--- |
| **`ligas.routes.js`** | `GET /api/ligas`<br>`GET /api/ligas/:id`<br>`GET /api/ligas/:id/partidos` | Lista las 5 ligas guardadas; en `/:id` devuelve la liga y, si su tabla aún está vacía, consulta `buscarTablaDeLiga()` en TheSportsDB y guarda la tabla en `data/ligas.json`; en `/:id/partidos` retorna `{ proximos, jugados }` de esa competición. |
| **`partidos.routes.js`** | `GET /api/partidos`<br>`GET /api/partidos/proximos`<br>`GET /api/partidos/jugados`<br>`GET /api/partidos/:id` | Filtra partidos en memoria por `tipo` (`proximos`/`jugados`), `limite` y `liga`, o retorna el detalle completo de un partido específico por `id`. |
| **`equipos.routes.js`** | `GET /api/equipos`<br>`GET /api/equipos/buscar?q=`<br>`GET /api/equipos/:id`<br>`GET /api/equipos/:id/partidos` | Lista equipos locales; `/buscar` busca primero en `equipos.json`, luego en tablas cargadas de ligas, y solo si no hay resultados locales (y `q.length >= 3`) consulta `searchteams.php` filtrando `Soccer`; `/:id` entrega ficha completa (posición + próximo + último partido); `/:id/partidos` lista calendarios del club consultando `eventsnext`/`eventslast` bajo demanda si falta alguna de las dos listas. |

---

### 3.4 Capa de Usuarios y Autenticación (`src/js/usuarios/`)

| Archivo | Responsabilidad principal | Qué contiene y por qué existe |
| :--- | :--- | :--- |
| **`users.js`** | Almacén persistente y seguro de usuarios | Gestiona `data/users.json`. Valida registro (`validateRegistration`), deriva contraseñas con `crypto.scrypt` + *salt* aleatorio de 16 bytes, verifica con `timingSafeEqual` (previene ataques de tiempo) y serializa escrituras atómicas (`tmp` + `rename`). |
| **`auth.js`** | Script cliente de autenticación | Servido por Express en `GET /auth.js`. Construye el `<dialog>` modal de login/registro, valida campos del lado cliente, consulta `/api/me` al cargar, y llama a `/api/login`, `/api/register` y `/api/logout`. |
| **`Usuario.js`** y **`RepositorioUsuarios.js`** | Modelos POO base iniciales de usuario | Clases simples originales de usuario en memoria (`id`, `username`, `email`, `password`). El flujo activo de autenticación utiliza `users.js` por sus requisitos criptográficos y persistencia atómica. |

---

### 3.5 Capa Frontend Modular (`public/js/main.js` y `src/js/cliente/`)

| Archivo | Responsabilidad principal | Qué contiene y con quién colabora |
| :--- | :--- | :--- |
| **`public/js/main.js`** | Orquestador de arranque (único `.js` en `public/`) | Importa los controladores desde `/cliente/*` y activa los módulos correspondientes a la página abierta. |
| **`src/js/cliente/api.js`** | Caché HTTP de ligas en el navegador | `obtenerLigasCompartidas()` consulta `/api/ligas` una sola vez por carga de página (compartiendo la misma promesa entre módulos) y `obtenerEscudoLiga(idLiga)` devuelve la URL del escudo desde el mapa cacheado. |
| **`src/js/cliente/fechas.js`** | Formateo de fechas, horas e iniciales | Contiene funciones puras: `fechaAValorEntrada`, `formatearFechaPartido` (formato corto `"Sáb, 21 nov"`), `formatearFechaLarga` (para modal), `formatearHora` y `inicialesEquipo` (fallback visual si un escudo falla). |
| **`src/js/cliente/modalPartido.js`** | Modal `<dialog>` de detalle de partido | Crea dinámicamente `<dialog id="modalDetallePartido">`, renderiza competición, escudos, enlaces a equipos, marcador/hora, estadio, fecha y descripción (`abrirModalPartido`). Expone `vincularAperturaModalPartido()` que abre el modal al clickear la tarjeta **excepto** si el usuario clickeó un `<a>` o `<button>` interno (preservando enlaces a equipos). Si falta estadio o descripción, consulta `/api/partidos/:id` en segundo plano. |
| **`src/js/cliente/buscadorEquipos.js`** | Buscador de equipos de la barra superior | Hidrata `[data-buscador-equipos]` en todas las páginas. Aplica *debounce* (`260 ms`), cancela peticiones previas con `AbortController`, llama a `/api/equipos/buscar?q=...`, muestra dropdown `role="listbox"` con escudos y soporta navegación por teclado (`ArrowUp`, `ArrowDown`, `Enter`, `Escape`). |
| **`src/js/cliente/tarjetasPartido.js`** | Constructores reutilizables de tarjetas de partidos | Crea `crearElementoPartidoInicio` (tarjetas compactas del panel inicio) y `crearElementoPartidoLiga` (filas detalladas para `liga.html` y barras laterales de `equipo.html`), vinculando cada una con `modalPartido.js`. |
| **`src/js/cliente/controlesGenerales.js`** | Controles interactivos compartidos | Inicializa el año en footer (`#anioActual`), selector/navegación de fechas (`#fechaPartido`), botones de filtro por categoría (`[data-filtro]`) y favoritos persistidos en `localStorage` (`[data-favorito]`). |
| **`src/js/cliente/paginaInicio.js`** | Controlador de `index.html` | Pide ligas y los 15 próximos partidos (`/api/partidos/proximos?limite=15`), los agrupa ordenadamente en bloques por competencia (`agruparPartidosPorCompetencia`) con encabezado de liga y renderiza también los últimos 6 resultados (`/api/partidos/jugados?limite=6`). |
| **`src/js/cliente/paginaLigas.js`** | Controlador de `ligas.html` | Vincula las 6 tarjetas estáticas de ligas con los datos de `/api/ligas` y carga las tablas resumidas **bajo demanda** cuando el usuario despliega `<details class="tabla-liga">` llamando a `/api/ligas/:id`. |
| **`src/js/cliente/paginaLiga.js`** | Controlador de `liga.html` | Lee `?id=` de la URL, llama a `/api/ligas/:id`, renderiza encabezado + tabla completa de posiciones (con botón de reintento si la API limita la petición) y carga `/api/ligas/:id/partidos`. |
| **`src/js/cliente/paginaEquipo.js`** | Controlador de `equipo.html` | Lee `?id=`, pide `/api/equipos/:id` y `/api/equipos/:id/partidos`, muestra encabezado del club, su puesto en liga, las tarjetas destacadas de **Próximo partido** y **Último partido jugado** (ambas clickeables para abrir el modal manteniendo el enlace al rival), datos institucionales y listas laterales. |

---

## 4. Traza completa: API externa → Transformación → Visualización en página

A continuación se detalla el camino exacto de los datos en los 4 escenarios principales de uso.

### Traza A: Arranque del servidor e Inicio (`index.html`) — Próximos partidos agrupados por liga

1. **Arranque (`src/js/server.js` → `inicializarLigas`)**:
   - Carga `data/ligas.json` con `servicioFutbol.cargarLigasLocal()` → crea instancias `Liga` con `tabla: []` en `RepositorioLigas`. **(0 peticiones a la API para ligas o tablas)**.
   - Carga `data/equipos.json` → `RepositorioEquipos` y `data/partidos_jugados.json` → `RepositorioPartidos`.
   - Carga `data/proximos_partidos.json` con `cargarProximosPartidosLocal()` (instancias `Partido` creadas por `formatearPartidoAPI`).
   - Recorre cada próximo partido y ejecuta `partido.yaPasoFecha(ahora)`:
     - Si ya venció, llama a `servicioFutbol.buscarEventoPorId(partido.id)` (`lookupevent.php?id=...`), resuelve sus escudos (`asegurarEscudosPartido`), lo anexa a `data/partidos_jugados.json` y lo elimina de la lista de próximos vigentes.
   - Agrupa los vigentes por liga (`4328, 4331, 4332, 4335, 4334`). Para cualquier liga con menos de `3` partidos (`CUPOS_POR_LIGA = 3`), llama a `servicioFutbol.buscarProximosEventosLiga(idLiga)` (`eventsnextleague.php`, y `eventsround.php` si la API gratuita devuelve menos de 3 eventos).
   - Para los partidos nuevos, `asegurarEscudosPartido` busca el escudo en caché local (`equipos.json` / tablas); si falta un club, llama a `lookupteam.php` o `searchteams.php` **una sola vez**, lo guarda en `equipos.json` y asigna el escudo al partido.
   - Si hubo cambios en los próximos, sobrescribe `data/proximos_partidos.json` con exactamente los 15 partidos (3 por liga).
2. **Petición del navegador (`index.html`)**:
   - El HTML carga `<script type="module" src="js/main.js"></script>`.
   - `main.js` detecta `pagina === "index"` e invoca `inicializarInicio()` (`src/js/cliente/paginaInicio.js`).
   - `paginaInicio.js` pide en paralelo `/api/ligas` (vía `cliente/api.js`) y `/api/partidos/proximos?limite=15` + `/api/partidos/jugados?limite=6` (atendidos por `partidos.routes.js` → `RepositorioPartidos` → `exponerPartido()`).
3. **Transformación y pintado en pantalla**:
   - `paginaInicio.js` ejecuta `agruparPartidosPorCompetencia(proximos, ligasDisponibles)` ordenando bloques según el orden de las 5 ligas.
   - Por cada bloque crea `<section class="grupo-liga-partidos">` con su `<header class="cabecera-grupo-liga">` (escudo de liga, enlace a `liga.html?id=...` y contador de partidos).
   - Dentro de cada bloque llama a `crearElementoPartidoInicio()` (`src/js/cliente/tarjetasPartido.js`), que construye los enlaces `<a href="equipo.html?id=...">` con escudos y vincula el rectángulo con `vincularAperturaModalPartido()` (`src/js/cliente/modalPartido.js`).

### Traza B: Carga bajo demanda de tabla de posiciones (`liga.html?id=4328`)

1. Al abrir `liga.html?id=4328`, `main.js` ejecuta `inicializarLiga()` (`src/js/cliente/paginaLiga.js`).
2. `paginaLiga.js` solicita `GET /api/ligas/4328`.
3. `src/js/Routes/ligas.routes.js` busca la liga en `RepositorioLigas`. Al detectar `liga.tabla.length === 0`:
   - Llama a `servicioFutbol.buscarTablaDeLiga("4328", { lanzarError: true, temporada })` → petición espaciada (`fetchSeguro`) a `lookuptable.php?l=4328`.
   - `formatearTablaAPI()` transforma los objetos crudos (`intRank`, `strTeam`, `strBadge`, `intPoints`...) en un arreglo de instancias `Posicion`.
   - Asigna `liga.tabla = tabla` y persiste en disco llamando `servicioFutbol.guardarLigasLocal(repositorio.ligas)` sobre `data/ligas.json`.
   - Visitas posteriores ya leen la tabla en memoria/JSON con **0 peticiones externas**.
4. `paginaLiga.js` recibe el JSON devuelto por `exponerLiga(liga)`, dibuja la tabla fila por fila (`agregarPosicionATabla`) con enlaces a `equipo.html?id=...`, y dispara `GET /api/ligas/4328/partidos` para llenar los paneles laterales (también interactivos con el modal).

### Traza C: Ficha completa de un equipo y buscador (`buscadorEquipos.js` + `equipo.html`)

1. **Búsqueda en barra superior (`src/js/cliente/buscadorEquipos.js`)**:
   - Al escribir ≥ 2 caracteres, espera `260 ms` y solicita `GET /api/equipos/buscar?q=...`.
   - `src/js/Routes/equipos.routes.js` busca:
     1. En `RepositorioEquipos.buscarCoincidencias()` (datos en `equipos.json`).
     2. En tablas ya cargadas dentro de `RepositorioLigas` (anexando coincidencias al repo).
     3. Solo si no encontró nada local y `q.length >= 3`, llama a `servicioFutbol.buscarEquiposPorNombre(q)` (`searchteams.php?t=...`), filtra únicamente `strSport === "Soccer"` y anexa los resultados a `data/equipos.json`.
   - `buscadorEquipos.js` pinta el desplegable con escudos, liga y país; al hacer clic o presionar `Enter`, navega a `equipo.html?id=...`.
2. **Carga de ficha (`src/js/cliente/paginaEquipo.js` → `GET /api/equipos/:id`)**:
   - `RepositorioEquipos.obtenerDetalleCompleto()` revisa si el equipo está en memoria (`equipos.json`). Si no está, consulta `lookupteam.php?id=...` y lo anexa a `data/equipos.json`.
   - Busca al club dentro de las tablas de `RepositorioLigas` para adjuntar su objeto `posicion` y su `liga`.
   - Busca sus partidos en `RepositorioPartidos`:
     - Si falta su próximo partido (`proximos.length === 0`), llama a `eventsnext.php?id=...`, resuelve escudos locales y lo agrega a `RepositorioPartidos`.
     - Si falta su último partido (`jugados.length === 0`), llama a `eventslast.php?id=...`, resuelve escudos locales, lo agrega a `RepositorioPartidos` y lo **anexa a `data/partidos_jugados.json`**.
   - `paginaEquipo.js` muestra posición en la tabla, las tarjetas destacadas **Próximo partido** y **Último partido jugado** (vinculadas al `<dialog>` de `modalPartido.js` preservando el enlace al rival), información institucional y listas laterales (`/api/equipos/:id/partidos`).

### Traza D: Apertura del modal de detalle de partido (`modalPartido.js`)

1. Al hacer clic dentro de cualquier tarjeta vinculada (`.partido-resumen-interactivo`, `.partido-lista-interactivo`, `.partido-destacado-interactivo`):
   - `modalPartido.js` comprueba primero `if (event.target.closest("a, button, input, select, textarea")) return;`. Si el clic fue sobre el nombre/escudo de un equipo (`<a>`), deja que el navegador vaya a `equipo.html?id=...`.
   - Si fue en el resto del rectángulo, construye/actualiza `<dialog id="modalDetallePartido">`, muestra escudo de liga, equipos con enlaces, marcador/horario, fecha larga, estadio, estado y descripción, y abre el modal nativo con `dialogo.showModal()`.
   - Si al objeto partido le faltaba `estadio` o `descripcion`, consulta en segundo plano `GET /api/partidos/:id` y re-renderiza el contenido si llegaron nuevos datos.

---

## 5. Traza de persistencia sobre archivos `.json` (Sobrescritura vs. Solo-Anexar)

El directorio `data/` alberga 5 archivos JSON, cada uno con una política de escritura diseñada para minimizar peticiones a la API sin perder información histórica:

| Archivo JSON | Política de escritura | Métodos responsables (`Archivo`) | Cuándo y cómo se escribe |
| :--- | :--- | :--- | :--- |
| **`data/proximos_partidos.json`** | **Sobrescritura controlada** | `sobrescribirProximosPartidosLocal()` (`ServicioFutbol.js`) | Se llama en `inicializarLigas()` (`src/js/server.js`) **solo si hubo cambios** (partidos que vencieron por fecha y salieron de próximos, o cupos faltantes repuestos hasta completar 15 equitativos). Reemplaza todo el archivo con la lista vigente de los 15 próximos partidos serializados con `exponerPartido()`. |
| **`data/partidos_jugados.json`** | **Solo anexar (*Append-only*)** | `anexarPartidosJugadosLocal()` (`ServicioFutbol.js`) | **Nunca borra registros existentes.** Lee el arreglo actual en disco, construye un `Set` con los `id` ya almacenados, agrega únicamente los partidos nuevos cuyo `id` no exista y vuelve a escribir el arreglo completo ampliado. Se ejecuta: <br>1. Al arrancar el servidor cuando un próximo partido ya pasó de fecha y se consulta su resultado en `lookupevent.php`. <br>2. Bajo demanda al entrar a un equipo (`GET /api/equipos/:id` o `/partidos`) si no tenía partidos jugados previos y se consulta `eventslast.php`. |
| **`data/equipos.json`** | **Solo anexar (*Append-only*)** | `anexarEquipoLocal()` / `anexarEquiposLocal()` (`ServicioFutbol.js`) | **Nunca borra equipos existentes.** Lee `data/equipos.json`, indexa los `id` y nombres normalizados existentes, descarta duplicados, extrae un objeto base limpio (`id, nombre, escudo, estadio, pais, fundacion, descripcion, sitioWeb, idLiga, nombreLiga` — omitiendo campos dinámicos como `posicion` o `proximoPartido`) y lo añade al final. Se ejecuta: <br>1. Al resolver escudos faltantes de partidos nuevos (`asegurarEscudosPartido`). <br>2. Al abrir un equipo no cacheado (`lookupteam.php` / `searchteams.php`). <br>3. Al buscar en el buscador un equipo remoto de fútbol (`GET /api/equipos/buscar`). |
| **`data/ligas.json`** | **Inicialización + actualización de tabla bajo demanda** | `cargarLigasLocal()` y `guardarLigasLocal()` (`ServicioFutbol.js`) | Si no existe el archivo, guarda las 5 ligas base (`LIGAS_PRINCIPALES_DEFAULT` con `tabla: []`). Luego, cuando un usuario entra a `GET /api/ligas/:id` y esa liga tiene `tabla: []`, consulta `lookuptable.php`, asigna las instancias `Posicion` y ejecuta `guardarLigasLocal(repositorio.ligas)` para persistir la tabla junto a las ligas ya guardadas. |
| **`data/users.json`** | **Escritura atómica en cola** | `persist()` y `serializeWrite()` (`src/js/usuarios/users.js`) | Cada registro se encola en `writeQueue` para evitar condiciones de carrera. Escribe en un archivo temporal (`users.json.<uuid>.tmp`) con permisos restringidos `0o600` y realiza `fs.rename()` atómico sobre `users.json`. |

### Flujo interno de escritura segura en `ServicioFutbol.#escribirJson()`
Todas las operaciones de escritura sobre los JSON deportivos pasan por el método privado `#escribirJson(ruta, datos)` en `src/js/Futbol/ServicioFutbol.js`:
1. Verifica que la carpeta destino exista (`fs.existsSync(dir)` → `fs.mkdirSync(dir, { recursive: true })`).
2. Serializa los datos formateados con `JSON.stringify(datos, null, 2)` en codificación `utf-8`.
3. Captura posibles errores de E/S en un `try/catch` para evitar que un fallo puntual de disco derribe el servidor HTTP.
