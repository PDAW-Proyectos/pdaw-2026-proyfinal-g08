# Documentación Técnica de Arquitectura y Flujos — **Orsai**

Este documento explica en profundidad la arquitectura completa de **Orsai**, el funcionamiento interno de **`src/js/server.js`** y **`src/js/app.js`**, el rol de cada módulo dentro de `src/` y `public/`, el manejo integral de la API externa (**TheSportsDB**) de extremo a extremo, las políticas de persistencia en `data/*.json` y un glosario técnico con las decisiones de diseño adoptadas en el proyecto.

---

## 1. Visión general de la arquitectura

La aplicación sigue una arquitectura **Node.js + Express (ES Modules)** dividida en cuatro capas con separación estricta de responsabilidades:

1. **Punto de entrada y ciclo de vida del servidor (`server.js` y `src/js/server.js`)**: carga de inmediato los datos locales en los repositorios para abrir el puerto sin demoras y ejecuta en segundo plano la sincronización incremental con la API.
2. **Capa de aplicación HTTP (`src/js/app.js` y `src/js/Routes/*`)**: configura Express, gestiona sesiones con cookies `HttpOnly`, expone los endpoints REST `/api/*`, publica el frontend modular bajo `/cliente` y `/auth.js` y sirve los archivos estáticos de `public/`.
3. **Capa de dominio, servicios API y persistencia (`src/js/Futbol/*` y `src/js/usuarios/*`)**: modela entidades encapsuladas con atributos privados (`#`), separa el cliente HTTP/JSON compartido (`ClienteApiFutbol`) de los servicios por dominio (`ServicioLigas`, `ServicioPartidos`, `ServicioEquipos` detrás de la fachada `ServicioFutbol`), mantiene repositorios en memoria y persiste archivos `.json` en `data/`.
4. **Capa de presentación cliente (`public/js/main.js` + `src/js/cliente/*`)**: `public/js/main.js` actúa como único script dentro de `public/` y delega cada vista y componente transversal a módulos especializados dentro de `src/js/cliente/`, construyendo todo el DOM con `document.createElement`, `textContent` y `replaceChildren` (sin `innerHTML`).

---

## 2. Análisis detallado de `server.js` y `app.js`

### 2.1 Arranque raíz (`server.js`) e inicialización del servidor (`src/js/server.js`)

El archivo `server.js` en la raíz del repositorio es un lanzador mínimo que importa `startServer` desde `./src/js/server.js` y verifica mediante `import.meta.url === pathToFileURL(process.argv[1]).href` si fue ejecutado directamente (`node server.js`). Esto permite usar `npm start` o `node server.js` indistintamente y exportar `startServer` para tests sin levantar automáticamente el servidor al importar el módulo.

Toda la lógica real de arranque y orquestación inicial vive en **`src/js/server.js`**:

#### a) Constantes de control de arranque
- `NUEVOS_POR_LIGA_AL_INICIAR = 1`: define que en cada arranque del servidor se intenta sumar **hasta 1 próximo partido nuevo por cada una de las 5 ligas principales** (`4328`, `4331`, `4332`, `4335`, `4334`), acumulándose sobre los partidos ya guardados en `data/proximos_partidos.json`.

#### b) `asegurarEscudosPartido(partido, repositorioEquipos, repositorioLigas, servicioFutbol)`
Completa `escudoEquipoLocal` y `escudoEquipoVisitante` cuando un partido nuevo o recién finalizado llega sin alguno de los dos escudos:
1. Primero busca localmente en `RepositorioEquipos`, `data/equipos.json` y las tablas de `RepositorioLigas` mediante `servicioFutbol.resolverEscudoEquipoLocal(...)` (0 peticiones externas).
2. Solo si sigue faltando, consulta `buscarEquipoPorId` (`lookupteam.php`) o `buscarEquipoPorNombre` (`searchteams.php`), agrega el equipo encontrado al repositorio en memoria y lo anexa a `data/equipos.json`.

#### c) `cargarDatosLocales(servicioFutbol, repositorioPartidos, repositorioEquipos, fechaReferencia)`
Carga de manera **síncrona e inmediata** el estado base desde disco sin hacer ninguna petición HTTP externa:
1. Carga las 5 ligas desde `data/ligas.json` (`cargarLigasLocal()`) en `RepositorioLigas`.
2. Carga los clubes guardados desde `data/equipos.json` (`cargarEquiposLocal()`) en `RepositorioEquipos`.
3. Carga el historial desde `data/partidos_jugados.json` (`cargarPartidosJugadosLocal()`) en `RepositorioPartidos`.
4. Lee `data/proximos_partidos.json` (`cargarProximosPartidosLocal()`), filtra en memoria los que todavía son vigentes (`!p.esJugado && !p.yaPasoFecha(fechaReferencia)`) y los carga en `RepositorioPartidos`.
5. Completa escudos locales faltantes en los partidos cargados y deja enlazadas las referencias cruzadas en `repositorioLigas` (`repositorioPartidos`, `repositorioEquipos`, `servicioFutbol`).

#### d) `sincronizarDatosApi(servicioFutbol, repositorioLigas, repositorioPartidos, repositorioEquipos, fechaReferencia)`
Ejecuta la actualización progresiva contra TheSportsDB manteniendo intacto el histórico acumulado:
1. **Validación de próximos guardados**: recorre `cargarProximosPartidosLocal()`. Para todo partido cuya fecha ya pasó (`yaPasoFecha(fechaReferencia)`) o ya figura jugado:
   - Lo quita de `RepositorioPartidos` temporalmente para no mostrar partidos vencidos como próximos.
   - Llama a `servicioFutbol.buscarEventoPorId(partido.id)` (`lookupevent.php`), resuelve sus escudos si faltan y lo **anexa** a `data/partidos_jugados.json` y a `RepositorioPartidos`.
2. **Conservación + acumulación equitativa**: conserva todos los próximos partidos vigentes (incluidos los de otras competiciones descubiertas al visitar fichas de equipos) usando un `Set` de IDs (`idsYaIncluidos`) para evitar duplicados.
3. **Búsqueda de 1 partido nuevo por liga**: recorre `LIGAS_UTILIZADAS_IDS`, llama a `buscarProximosEventosLiga(idLiga, { idsExistentes, cantidadNuevaObjetivo: 1, fechaReferencia })`, toma el más cercano en fecha que aún no esté guardado, completa sus escudos (`asegurarEscudosPartido`) y lo suma a `proximosAcumulados`.
4. **Ordenamiento y persistencia**: ordena cronológicamente todos los próximos acumulados, actualiza `RepositorioPartidos` y, solo si hubo cambios, sobrescribe `data/proximos_partidos.json` con la lista vigente ampliada.

#### e) `inicializarLigas(...)`
Combina `cargarDatosLocales(...)` + `await sincronizarDatosApi(...)` en forma secuencial. Se conserva exportada para que las pruebas unitarias e de integración puedan ejecutar el flujo completo de forma determinista y verificar el estado final tras terminar todas las llamadas simuladas.

#### f) `resolverPuertoServidor()` y `startServer()`
- **`resolverPuertoServidor()`**: toma `process.env.PORT`, salvo cuando coincide con `process.env.NGINX_PORT` (escenario de contenedor con proxy Nginx escuchando en `8080`), caso en el cual cae en `process.env.DEFAULT_APP_PORT || 3000` para evitar errores `EADDRINUSE`.
- **`startServer()`**:
  1. Inicializa el almacén de usuarios (`createUserStore`).
  2. Instancia `ServicioFutbol`, `RepositorioPartidos` y `RepositorioEquipos`.
  3. Ejecuta **`cargarDatosLocales(...)`** para tener los repositorios poblados en milisegundos.
  4. Crea la app Express con `createApp(...)` y abre el servidor HTTP inmediatamente (`app.listen(port, "0.0.0.0")`), de modo que la aplicación responde desde el primer instante.
  5. Una vez abierto el puerto, lanza **`sincronizarDatosApi(...)` en segundo plano** con `.catch(...)`, evitando bloquear el arranque del servidor si la API externa tarda o responde con `429`.

---

### 2.2 Fábrica de la aplicación Express (`src/js/app.js`)

`src/js/app.js` exporta `createApp({ users, repositorioLigas, repositorioPartidos, repositorioEquipos, servicioFutbol, production })`. Está diseñada bajo el patrón **Factory + Inyección de Dependencias**, lo que permite instanciar exactamente la misma aplicación tanto en producción (`startServer`) como en pruebas unitarias aisladas con repositorios y mocks propios sin tocar archivos reales ni puertos fijos.

Su configuración interna sigue este orden exacto:

1. **Seguridad de proxy y parseo de cuerpos**:
   - Si `production === true`, activa `app.set("trust proxy", 1)` para respetar encabezados HTTPS detrás de un proxy inverso.
   - `express.json({ limit: "16kb" })` y `express.urlencoded({ extended: false })` limitan el tamaño de entrada para evitar cargas maliciosas excesivas.

2. **Middleware de sesión en memoria (`sessions = new Map()`)**:
   - Cookie llamada `Orsai.sid` con vigencia de 7 días (`sessionDurationMs`).
   - En cada petición lee `req.headers.cookie`, extrae `Orsai.sid`, busca el identificador en `sessions` y valida `session.expiresAt > Date.now()`. Si es válida, adjunta `req.user` (desde `users.findById`) y `req.sessionId`; si expiró, la limpia del `Map`.
   - `startSession(res, user)` genera un token criptográfico aleatorio de 32 bytes (`randomBytes(32).toString("hex")`) y emite la cookie con `httpOnly: true` (inaccesible vía `document.cookie`), `sameSite: "lax"` y `secure: production`.
   - `requireAuth` protege rutas privadas devolviendo `401` si no existe `req.user`.

3. **Rutas de autenticación (`/api/register`, `/api/login`, `/api/me`, `/api/logout`)**:
   - `POST /api/register`: delega en `users.register(req.body)`, inicia sesión y responde `201` con `publicUser(user)` (omitiendo siempre el hash de contraseña). Traduce errores de dominio (`invalid_registration` → `400`, `email_exists` → `409`).
   - `POST /api/login`: verifica credenciales con `users.verify(email, password)`, abre cookie de sesión y devuelve `200` o `401`.
   - `GET /api/me`: protegida por `requireAuth`, retorna los datos públicos del usuario autenticado.
   - `POST /api/logout`: protegida por `requireAuth`, elimina la sesión del `Map` y limpia la cookie (`204 No Content`).

4. **Montaje modular de routers de fútbol**:
   - Si recibe `repositorioLigas`, monta `crearRouterLigas(...)` en `/api/ligas`.
   - Si recibe `repositorioPartidos`, monta `crearRouterPartidos(...)` en `/api/partidos`.
   - Si recibe `repositorioEquipos`, monta `crearRouterEquipos(...)` en `/api/equipos`.

5. **Exposición acotada de archivos estáticos y script cliente**:
   - `GET /auth.js`: sirve únicamente `src/js/usuarios/auth.js` para el modal de autenticación en el navegador.
   - `app.use("/cliente", express.static(...))`: expone únicamente la carpeta `src/js/cliente/` (módulos ES del navegador).
   - `app.use(express.static(...))`: sirve HTML y CSS desde `public/` (y `public/js/main.js`).
   - De este modo, **nunca** quedan accesibles por HTTP los módulos de servidor (`server.js`, `users.js`, `Futbol/*`, `Routes/*`) ni los JSON de `data/`.

6. **Manejador global de errores**:
   - Middleware final `(error, req, res, next)` que registra la excepción en consola y responde `500` con un mensaje genérico si aún no se enviaron encabezados, evitando filtrar *stack traces* al cliente.

---

## 3. Cómo manejamos la API externa (TheSportsDB) en todo momento

Toda comunicación con `https://www.thesportsdb.com/api/v1/json/123/` pasa exclusivamente por el servidor backend. El navegador jamás llama a TheSportsDB directamente.

### 3.1 Arquitectura modular de servicios (`src/js/Futbol/`)

Para evitar sobrecargar una única clase con múltiples responsabilidades, la lógica de API y persistencia quedó dividida en una base compartida, 3 servicios de dominio y una fachada:

| Módulo | Responsabilidad | Métodos principales |
| :--- | :--- | :--- |
| **`ClienteApiFutbol.js`** | Base HTTP segura, construcción de URLs y lectura/escritura JSON en disco | `fetchSeguro`, `construirUrl`, `leerJson`, `escribirJson`, `existeArchivo`, `LIGAS_UTILIZADAS_IDS`, `LIGAS_PRINCIPALES_DEFAULT`, `normalizarTexto` |
| **`ServicioLigas.js`** | Persistencia y endpoints de competiciones y tablas | `cargarLigasLocal`, `guardarLigasLocal`, `listarLigas`, `buscarLigaPorId`, `buscarTablaDeLiga` |
| **`ServicioPartidos.js`** | Persistencia y endpoints de partidos futuros y finalizados | `cargarProximosPartidosLocal`, `sobrescribirProximosPartidosLocal`, `anexarProximosPartidosLocal`, `cargarPartidosJugadosLocal`, `anexarPartidosJugadosLocal`, `buscarProximosEventosLiga`, `buscarEventoPorId`, `buscarProximosEventosEquipo`, `buscarUltimosEventosEquipo` |
| **`ServicioEquipos.js`** | Persistencia y endpoints de clubes + resolución local de escudos | `cargarEquiposLocal`, `anexarEquipoLocal`, `anexarEquiposLocal`, `buscarEquipoLocal`, `buscarEquipoPorId`, `buscarEquiposPorNombre`, `buscarEquipoPorNombre`, `resolverEscudoEquipoLocal` |
| **`ServicioFutbol.js`** | **Fachada pública** que unifica los servicios manteniendo estado privado (`#`) | Compone `#clienteApi`, `#servicioLigas`, `#servicioPartidos` y `#servicioEquipos`, exponiendo la interfaz única que consumen `server.js`, los routers y los repositorios. |

### 3.2 Control de tráfico HTTP: `ClienteApiFutbol.fetchSeguro(url, maxReintentos = 2)`

Cada petición a TheSportsDB pasa obligatoriamente por `fetchSeguro`:

1. **Cola secuencial (`#colaPeticiones`)**: encadena las llamadas en una promesa única para que no salgan ráfagas simultáneas hacia TheSportsDB aunque lleguen varias rutas o módulos al mismo tiempo.
2. **Espaciado mínimo (`#esperarTurnoPeticion`)**: mide el tiempo transcurrido desde `#ultimaPeticionMs`; si es menor a `#intervaloMinimoMs` (`1100 ms` por defecto al usar `fetch` real, `0 ms` en tests con `mockFetch`), espera la diferencia antes de disparar la llamada.
3. **Bloque `try` y reintentos de red**:
   - Dentro del `try` ejecuta `await this.#fetchFn(url, { headers: { accept: "application/json", "User-Agent": "curl/7.88.1" } })`.
   - Si falla la red o hay un error de conexión, entra al `catch`: si quedan intentos, espera `400 * (intento + 1)` ms y reintenta (`continue`); si era el último intento, lanza el error.
4. **Manejo de límite de peticiones (`HTTP 429`)**:
   - Lee la cabecera `Retry-After`.
   - Si la espera solicitada es corta (`<= 5` segundos) y quedan reintentos, aguarda `(segundos + 1) * 1000` ms y reintenta.
   - Si es un castigo largo (por ejemplo `120` segundos en la clave gratuita `123`) o se agotaron los intentos, lanza un `Error` descriptivo (`"Límite de peticiones de la API alcanzado. Reintenta en X segundos."`).
5. **Validación HTTP y retorno**: si `!respuesta.ok`, lanza `Falla de la API: <status>`. Si todo salió bien, **retorna una `Promise` que resuelve con el objeto `Response` de `fetch`** listo para hacer `await respuesta.json()`.

### 3.3 Mapa completo de endpoints TheSportsDB, archivos intervinientes y caché

| Endpoint TheSportsDB | Servicio / Método que lo llama | Quién dispara la llamada | Política de caché y persistencia |
| :--- | :--- | :--- | :--- |
| `eventsnextleague.php?id=<liga>` | `ServicioPartidos.buscarProximosEventosLiga` | `sincronizarDatosApi` (`src/js/server.js`) al iniciar | Obtiene próximos eventos de cada liga principal. Se acumulan en `data/proximos_partidos.json` sumando hasta `1` nuevo por liga en cada arranque. |
| `eventsround.php?id=<liga>&r=<ronda>&s=<temp>` | `ServicioPartidos.buscarProximosEventosLiga` | Respaldo automático dentro del mismo método | Como la clave demo `123` suele devolver solo 1 evento en `eventsnextleague.php`, si ese único evento ya estaba guardado se consultan rondas consecutivas para hallar partidos nuevos sin repetir. |
| `lookupevent.php?id=<evento>` | `ServicioPartidos.buscarEventoPorId` | `sincronizarDatosApi` (`src/js/server.js`) | Se llama únicamente cuando un partido guardado en `proximos_partidos.json` ya superó su fecha/hora (`yaPasoFecha`). Su resultado oficial se anexa a `data/partidos_jugados.json`. |
| `lookuptable.php?l=<liga>(&s=<temp>)` | `ServicioLigas.buscarTablaDeLiga` | `GET /api/ligas/:id` (`ligas.routes.js`) | **Bajo demanda**: solo la primera vez que un usuario abre una liga cuya `tabla` está vacía. Luego se persiste en `data/ligas.json` y futuras visitas no llaman a la API. |
| `lookupteam.php?id=<equipo>` | `ServicioEquipos.buscarEquipoPorId` | `asegurarEscudosPartido` (`server.js`) o `GET /api/equipos/:id` (`RepositorioEquipos.obtenerDetalleCompleto`) | Solo si el equipo no existe en `data/equipos.json`. Una vez obtenido, se anexa con `anexarEquipoLocal` y queda cacheado. |
| `searchteams.php?t=<nombre>` | `ServicioEquipos.buscarEquiposPorNombre` | `GET /api/equipos/buscar?q=` (`equipos.routes.js`) o `buscarEquipoPorNombre` | Solo cuando `q.length >= 3` y no hubo coincidencias en `equipos.json` ni en tablas cargadas. Filtra únicamente fútbol (`strSport === "Soccer"`) y anexa a `data/equipos.json`. |
| `eventsnext.php?id=<equipo>` | `ServicioPartidos.buscarProximosEventosEquipo` | `GET /api/equipos/:id` (`RepositorioEquipos`) y `GET /api/equipos/:id/partidos` (`equipos.routes.js`) | Si al abrir un club no hay próximos partidos suyos en memoria, consulta la API, completa escudos locales, actualiza `RepositorioPartidos` y **anexa todos los nuevos vigentes (incluso de otras copas) a `data/proximos_partidos.json`**. |
| `eventslast.php?id=<equipo>` | `ServicioPartidos.buscarUltimosEventosEquipo` | `GET /api/equipos/:id` (`RepositorioEquipos`) y `GET /api/equipos/:id/partidos` (`equipos.routes.js`) | Si al abrir un club no hay resultados recientes suyos en memoria, consulta la API y **anexa** los resultados a `data/partidos_jugados.json`. |

> **Nota sobre límites de tasa (`HTTP 429`) con la clave gratuita `123`:**
> La clave pública demo de TheSportsDB permite alrededor de ~30 peticiones por minuto y responde con bloqueos temporales (`Retry-After: 120`) cuando se excede ese cupo (por ejemplo, tras varios reinicios seguidos donde `eventsnextleague.php` devuelve un partido ya cacheado y dispara búsquedas por ronda `eventsround.php`, o cuando vencen varios partidos al mismo tiempo).

---

## 4. Cómo modelamos el resultado final (Transformación → Dominio → Interfaz)

Desde que llega un JSON crudo de TheSportsDB hasta que el usuario ve una tarjeta o tabla en pantalla, los datos atraviesan 5 etapas bien definidas:

### Etapa 1: Adaptación / Mapeo de entrada (`src/js/Futbol/formatos.js`)
TheSportsDB usa nombres en inglés con prefijos (`idEvent`, `strHomeTeam`, `intHomeScore`, `strBadge`, `intRank`, `strCountry`). Las funciones de `formatos.js` traducen esa estructura externa al lenguaje del dominio en español y retornan instancias de nuestras clases:
- `formatearLigaAPI(datos)` → objeto normalizado de liga (`id`, `nombre`, `temporada`, `pais`, `escudo`).
- `formatearTablaAPI(tablaCruda)` → arreglo de instancias `Posicion`.
- `formatearPartidoAPI(datos)` → instancia `Partido` (lee indistintamente claves crudas `idEvent` o claves locales `id`, por lo que sirve tanto para API, JSON en disco o entidades ya creadas).
- `formatearEquipoAPI(datos)` → instancia `Equipo` (soporta `idTeam`/`id`, `strCountry || strLocation || pais`, descripción en español o inglés).

### Etapa 2: Modelado de entidades encapsuladas y polimorfismo (`Posicion.js`, `Liga.js`, `Partido.js`, `Equipo.js`)
- Todas las clases almacenan su estado en **campos privados `#`** y exponen acceso controlado por getters y setters.
- **`Partido`** calcula comportamiento de negocio sin duplicar lógica fuera de la clase:
  - `esJugado`: `true` si `estado === "FT"` o si existen ambos marcadores (`golesLocal` y `golesVisitante`).
  - `esProximo`: inverso de `esJugado`.
  - `fechaDate`: interpreta fechas/timestamps en UTC.
  - `yaPasoFecha(referencia)`: compara si la fecha del partido ya quedó atrás respecto a `referencia`.
- **`Liga`** normaliza su `#tabla` asegurando que cada elemento sea una instancia `Posicion`.
- **`Equipo`** normaliza `#proximoPartido` y `#ultimoPartido` como instancias `Partido` al asignarse.
- Todas implementan **`toJSON()`**: esto permite que `exponerLiga`, `exponerPartido` y `exponerEquipo` serialicen cualquier entidad o estructura normalizada mediante **polimorfismo** y construcción uniforme (`new Partido(p).toJSON()`, `new Equipo(e).toJSON()`, `new Liga(...).toJSON()`), evitando depender de comprobaciones de tipo como `instanceof` o `typeof` para decidir cómo serializar.

### Etapa 3: Agregación en repositorios en memoria
- **`RepositorioLigas`**: indexa ligas y ofrece búsqueda tolerante a tildes, mayúsculas y alias (`"premier"`, `"laliga"`, `"bundesliga"`, `"seriea"`, `"ligue"`).
- **`RepositorioPartidos`**: mantiene la colección unificada de próximos y jugados, evita duplicados por `id` mediante upsert en `agregarPartido`, ordena próximos de forma ascendente (el más cercano primero) y jugados de forma descendente (el más reciente primero), y filtra por competición y límite.
- **`RepositorioEquipos`**: fusiona datos parciales del mismo club sin pisar campos ya cargados (`agregarEquipo`), resuelve autocompletado ordenado por coincidencia exacta/prefijo (`buscarCoincidencias`) y construye en `obtenerDetalleCompleto()` un objeto compuesto que une: datos base del club + `liga` + `posicion` en tabla + `proximoPartido` + `ultimoPartido`.

### Etapa 4: Exposición REST (`/api/*`)
Los routers (`ligas.routes.js`, `partidos.routes.js`, `equipos.routes.js`) devuelven exclusivamente JSON limpio ya serializado en español:
- `GET /api/partidos/proximos?limite=0` (o `todos=true`) entrega todos los próximos partidos acumulados ordenados cronológicamente.
- `GET /api/equipos/:id` entrega la ficha unificada del club.
- `GET /api/ligas/:id` entrega metadata y tabla de posiciones completa.

### Etapa 5: Renderizado seguro en el cliente (`src/js/cliente/*`)
- **`paginaInicio.js`**: agrupa los próximos partidos por competición (`agruparPartidosPorCompetencia`), renderiza el encabezado de cada liga, oculta inicialmente los partidos que exceden `PARTIDOS_VISIBLES_POR_LIGA_INICIO = 3` (`tarjeta.hidden = true`) y agrega el botón **`Mostrar más (+N)` / `Mostrar menos`** en cada bloque que supere 3 partidos.
- **`tarjetasPartido.js`** y **`modalPartido.js`**: generan las tarjetas con enlaces a `equipo.html?id=...` y vinculan el clic del contenedor para abrir `<dialog id="modalDetallePartido">` (completando en segundo plano desde `GET /api/partidos/:id` si faltan `estadio` o `descripcion`).
- Todo el HTML dinámico del cliente se construye con `document.createElement`, `textContent` y `replaceChildren`, eliminando `innerHTML` y previniendo XSS.

---

## 5. Catálogo completo de archivos JavaScript en `src/` y `public/`

### 5.1 Arranque y Express
| Archivo | Responsabilidad principal |
| :--- | :--- |
| **`server.js`** *(raíz)* | Lanzador raíz que invoca `startServer()` cuando se ejecuta con `node server.js`. |
| **`src/js/server.js`** | Carga inmediata desde JSON (`cargarDatosLocales`), sincronización incremental en segundo plano (`sincronizarDatosApi`), resolución de puerto seguro (`resolverPuertoServidor`) e inicio de Express (`startServer`). |
| **`src/js/app.js`** | Fábrica `createApp`: middlewares de parseo y sesión en memoria (`Orsai.sid`), autenticación REST, montaje de routers `/api/*`, estáticos seguros (`/auth.js`, `/cliente`, `public/`) y manejo global de error `500`. |

### 5.2 Dominio, Servicios API y Persistencia (`src/js/Futbol/`)
| Archivo | Responsabilidad principal |
| :--- | :--- |
| **`Posicion.js`** | Entidad de una fila en la tabla de posiciones (`#` + getters/setters + `toJSON`). |
| **`Liga.js`** | Entidad de liga; normaliza `#tabla` como arreglo de `Posicion`. |
| **`Equipo.js`** | Entidad de club; normaliza `#proximoPartido` y `#ultimoPartido` como `Partido` (admite objeto o constructor posicional). |
| **`Partido.js`** | Entidad de encuentro con getters calculados (`esJugado`, `esProximo`, `fechaDate`) y `yaPasoFecha()`. |
| **`formatos.js`** | Mappers `formatear*API` y normalizadores `exponerLiga`, `exponerPartido`, `exponerEquipo`. |
| **`RepositorioLigas.js`** | Almacén y buscador en memoria de ligas. |
| **`RepositorioPartidos.js`** | Almacén, filtro y ordenamiento en memoria de partidos próximos y jugados. |
| **`RepositorioEquipos.js`** | Almacén, buscador y agregador de detalle completo de equipos (`obtenerDetalleCompleto`). |
| **`ClienteApiFutbol.js`** | Cliente HTTP seguro (`fetchSeguro`, cola secuencial, espaciado mínimo, `429`), constructor de URLs y helpers de lectura/escritura JSON en disco. |
| **`ServicioLigas.js`** | Persistencia local y consultas API de ligas y tablas. |
| **`ServicioPartidos.js`** | Persistencia local (`sobrescribir` próximos / `anexar` próximos y jugados) y consultas API de partidos. |
| **`ServicioEquipos.js`** | Persistencia `append-only` de equipos, resolución local de escudos y búsquedas por ID o nombre. |
| **`ServicioFutbol.js`** | Fachada pública que delega en `ClienteApiFutbol`, `ServicioLigas`, `ServicioPartidos` y `ServicioEquipos`. |

### 5.3 Rutas REST (`src/js/Routes/`) y Usuarios (`src/js/usuarios/`)
| Archivo | Responsabilidad principal |
| :--- | :--- |
| **`ligas.routes.js`** | `GET /api/ligas`, `GET /api/ligas/:id` (carga tabla bajo demanda), `GET /api/ligas/:id/partidos`. |
| **`partidos.routes.js`** | `GET /api/partidos`, `/proximos`, `/jugados` (soporta `limite=0` o `todos=true`) y `/:id`. |
| **`equipos.routes.js`** | `GET /api/equipos`, `/buscar?q=`, `/:id` y `/:id/partidos` (persiste nuevos próximos y jugados descubiertos). |
| **`users.js`** | Persistencia atómica en `data/users.json`, hashing con `crypto.scrypt` + *salt* y verificación con `timingSafeEqual`. |
| **`auth.js`** | Modal cliente de login/registro servido en `/auth.js`, conectado a `/api/login`, `/api/register`, `/api/me` y `/api/logout`. |
| **`Usuario.js` / `RepositorioUsuarios.js`** | Clases base iniciales de modelo de usuario en memoria. |

### 5.4 Frontend Modular (`public/js/main.js` y `src/js/cliente/`)
| Archivo | Responsabilidad principal |
| :--- | :--- |
| **`public/js/main.js`** | Único `.js` en `public/`. Inicializa buscadores, controles generales y el controlador de la vista actual según `document.body.dataset.pagina`. |
| **`src/js/cliente/api.js`** | Caché compartida de `/api/ligas` durante la carga de página (`obtenerLigasCompartidas`, `obtenerEscudoLiga`). |
| **`src/js/cliente/fechas.js`** | Utilidades de presentación en español: `fechaAValorEntrada` (`YYYY-MM-DD` para `<input type="date">`), `formatearFechaPartido` (`"Sáb, 21 nov"`), `formatearFechaLarga`, `formatearHora` (`HH:MM`) e `inicialesEquipo` (respaldo visual si falla un escudo). |
| **`src/js/cliente/controlesGenerales.js`** | Controles transversales de UI: año actual en `#anioActual`, inicialización y desplazamiento `-1 / +1` día en `#fechaPartido` (emitiendo evento `change`), filtros `[data-filtro]` en filas `.fila-resultado` y botones de favoritos `[data-favorito]` guardados en `localStorage` (`Orsai-favorite-matches`). |
| **`src/js/cliente/buscadorEquipos.js`** | Autocompletado accesible (`role="listbox"`) con *debounce* de `260 ms`, cancelación con `AbortController`, ícono vectorial `<svg>` y navegación por teclado (`ArrowUp`, `ArrowDown`, `Enter`, `Escape`). |
| **`src/js/cliente/tarjetasPartido.js`** | Constructores reutilizables `crearElementoPartidoInicio` y `crearElementoPartidoLiga`. |
| **`src/js/cliente/modalPartido.js`** | `<dialog id="modalDetallePartido">` con carga diferida de detalles completos y preservación de enlaces a clubes. |
| **`src/js/cliente/paginaInicio.js`** | Controlador de `index.html`: tarjetas de ligas, bloques agrupados de próximos partidos colapsados a 3 con `Mostrar más (+N)` y últimos 6 resultados. |
| **`src/js/cliente/paginaLigas.js`** | Controlador de `ligas.html`: carga bajo demanda de tablas resumidas al abrir `<details class="tabla-liga">`. |
| **`src/js/cliente/paginaLiga.js`** | Controlador de `liga.html`: cabecera de liga, tabla completa de posiciones con reintento ante `429` y listados de partidos. |
| **`src/js/cliente/paginaEquipo.js`** | Controlador de `equipo.html`: ficha del club, puesto en tabla, tarjetas destacadas de próximo y último partido, e historial lateral. |

---

## 6. Traza de persistencia sobre archivos `.json` (`data/`)

| Archivo JSON | Política de escritura | Métodos responsables | Cuándo y cómo se escribe |
| :--- | :--- | :--- | :--- |
| **`data/proximos_partidos.json`** | **Acumulativa + limpieza de vencidos** | `sobrescribirProximosPartidosLocal()` y `anexarProximosPartidosLocal()` (`ServicioPartidos.js`) | En cada inicio (`sincronizarDatosApi`), limpia partidos ya vencidos (pasándolos a `partidos_jugados.json`), conserva todos los vigentes (incluidos de otras copas) y suma 1 nuevo por cada una de las 5 ligas principales. Al visitar un equipo (`equipos.routes.js` / `RepositorioEquipos.js`), anexa todos los próximos descubiertos evitando duplicados con un `Set` y reordenando por fecha. |
| **`data/partidos_jugados.json`** | **Solo anexar (*Append-only*)** | `anexarPartidosJugadosLocal()` (`ServicioPartidos.js`) | Nunca borra registros previos. Agrega nuevos partidos por `id` no repetido cuando vence un próximo partido en arranque o cuando se consulta `eventslast.php` al visitar un equipo. |
| **`data/equipos.json`** | **Solo anexar (*Append-only*)** | `anexarEquipoLocal()` / `anexarEquiposLocal()` (`ServicioEquipos.js`) | Nunca borra clubes guardados. Deduplica por `id` y nombre normalizado, y guarda únicamente el registro limpio del club (sin campos dinámicos de vista). |
| **`data/ligas.json`** | **Inicialización + tabla bajo demanda** | `cargarLigasLocal()` y `guardarLigasLocal()` (`ServicioLigas.js`) | Si no existe el archivo, siembra `LIGAS_PRINCIPALES_DEFAULT` con `tabla: []`. Al visitar `GET /api/ligas/:id` por primera vez, guarda la tabla obtenida de `lookuptable.php`. |
| **`data/users.json`** | **Escritura atómica en cola** | `persist()` y `serializeWrite()` (`users.js`) | Encola escrituras en `writeQueue`, escribe un archivo temporal (`0o600`) y ejecuta `fs.rename()` atómico. |

---

## 7. Referencia de conceptos técnicos y decisiones de diseño

### 7.1 Módulo `node:fs`, variable `fs` y `!fs.existsSync(ruta)` (`ClienteApiFutbol.js`)
- **`node:fs`**: es el módulo nativo **File System** incluido en Node.js. El prefijo `node:` indica explícitamente que se importa un módulo interno de Node.js y no una dependencia externa de `node_modules`.
- **`fs`**: es la referencia importada de ese módulo mediante la cual se invocan operaciones de archivo (`existsSync`, `readFileSync`, `writeFileSync`, `mkdirSync`).
- **`!fs.existsSync(ruta)` en `leerJson(ruta, respaldo)`**: verifica de forma sincrónica si el archivo existe en disco (`false` si no existe, convertido en `true` por `!`). Si no existe, retorna inmediatamente `respaldo` (por ejemplo `[]` o `null`), evitando una excepción en `readFileSync`.
- **Escritura segura (`escribirJson`)**: comprueba si el directorio existe (`!fs.existsSync(dir)` → `fs.mkdirSync(dir, { recursive: true })`), serializa con `JSON.stringify(datos, null, 2)` en `utf-8` y envuelve la operación en `try/catch` para no derribar el servidor ante fallos de disco.

### 7.2 Qué son `eventsnextleague.php` y "ronda" (`eventsround.php`)
- **`eventsnextleague.php`**: *endpoint* de TheSportsDB que recibe `?id=<idLiga>` y devuelve los próximos encuentros programados de esa liga bajo `cuerpo.events`. En el proyecto se usa dentro de `ServicioPartidos.buscarProximosEventosLiga`.
- **Ronda (`intRound` / `jornada`)**: representa el número de **jornada o fecha** del torneo (por ejemplo, Jornada 14 de LaLiga). Como la clave gratuita `123` de `eventsnextleague.php` suele devolver un único partido, si ese partido ya estaba almacenado, `buscarProximosEventosLiga` toma su `jornada` y `temporada` y consulta `eventsround.php?id=<liga>&r=<ronda>&s=<temporada>` para descubrir partidos nuevos de esa jornada o las inmediatas posteriores.

### 7.3 Qué significa "anexar", "serializar" y el uso de `new Set`
- **Anexar (*Append*)**: agregar elementos nuevos al final de una colección o archivo JSON existente **sin borrar ni perder los registros previos**.
- **Serializar**: transformar instancias encapsuladas con atributos privados (`#`) en objetos planos mediante `.toJSON()` (`exponer*`) y posteriormente en texto JSON con `JSON.stringify(datos, null, 2)` para enviar por HTTP o guardar en disco.
- **`new Set` en `anexarProximosPartidosLocal`**: crea un conjunto de valores únicos con los `id` ya presentes en `proximos_partidos.json`. Permite comprobar en tiempo constante $O(1)$ si un partido nuevo ya existe (`idsExistentes.has(idStr)`), descartar duplicados tanto respecto del disco como dentro del mismo lote recibido (`idsExistentes.add(idStr)`), y filtrar además los ya jugados o vencidos antes de reordenar cronológicamente.

### 7.4 Namespace `http://www.w3.org/2000/svg` en `buscadorEquipos.js`
Al eliminar `innerHTML` y construir el ícono de la lupa de forma programática en `crearIconoLupa()`, no se puede usar `document.createElement("svg")` porque crearía un elemento HTML desconocido en lugar de un gráfico vectorial. `document.createElementNS("http://www.w3.org/2000/svg", "svg")` (y lo mismo para `<path>`) indica al DOM el espacio de nombres XML oficial de SVG estandarizado por el **W3C** para que el navegador dibuje el vector correctamente. No realiza ninguna petición de red: es únicamente una cadena identificadora estándar.

### 7.5 Polimorfismo frente a `instanceof` y `typeof`
Para respetar el encapsulamiento y el polimorfismo orientado a objetos, se evitaron comprobaciones de tipo (`instanceof`, helpers `es...` y `typeof` innecesarios) en la capa de dominio, servicios y rutas:
- **Normalización uniforme en los límites**: los constructores de `Posicion`, `Liga`, `Partido`, `Equipo` y las funciones `formatearPartidoAPI` / `formatearEquipoAPI` aceptan tanto objetos planos como entidades ya instanciadas gracias a que comparten los mismos nombres de getters. En `ClienteApiFutbol`, `new URL(url)` admite cadenas e instancias `URL` de forma nativa.
- **Polimorfismo por contrato (`.toJSON()`)**: como `Liga.#tabla` solo guarda instancias `Posicion` y `Equipo.#proximoPartido`/`#ultimoPartido` solo guardan instancias `Partido`, la serialización llama directamente a `.toJSON()` sin inspeccionar el tipo del objeto.
- **Invocación opcional (`?.()`)**: en `RepositorioEquipos.js` y `equipos.routes.js` los métodos opcionales de persistencia/resolución sobre `servicioFutbol` se invocan mediante `servicioFutbol.metodo?.(...)`.
- **Únicas excepciones justificadas donde sí permanece `typeof`**:
  1. Validación de entradas externas de usuario provenientes de peticiones HTTP en `src/js/usuarios/users.js` (`string`).
  2. Detección de sobrecarga en el constructor de `src/js/Futbol/Equipo.js` (admite un objeto de propiedades o argumentos posicionales).
  3. Detección de soporte del método nativo `dialog.showModal` en el navegador dentro de `src/js/cliente/modalPartido.js`.
