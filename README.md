# Nombre del proyecto

> Orsai. Plataforma deportiva de futbol.

Proyecto del equipo Grupo 8 para _7513 · Proyecto de Desarrollo de Aplicaciones Web_
(Tecnicatura Universitaria en Programación Web y Móvil — DCIC — UNS).

## Ficha del proyecto

| Aspecto                | Descripción                                                                                                                                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Problema               | Aplicacion de resultados y foro de futbol.                                                                                                                                                                                     |
| Usuarios               | Hinchas de equipos y fanaticos del futbol                                                                                                                                                                                      |
| Funcionalidades núcleo | Resultados, horarios, foro, perfiles, prode y tienda de prueba.                                                                                                                                                                |
| Reglas de negocio      | 1. El usuario tiene que estar registrado para participar en el prode 2. El usuario tiene que estar registrado para participar en el foro 3. El usuario tiene que estar registrado para canjear puntos por premios de la tienda |
| API externa            | TheSportsDB, https://thedatadb.readme.io/reference/getteambyname consultar ligas, equipos, partidos y resultados                                                                                                               |

## Equipo y roles del sprint actual

| Integrante                   | Usuario de GitHub | Rol en el sprint      |
| ---------------------------- | ----------------- | --------------------- |
| Sebastian Agunin             | sebagorito        | Referente de producto |
| Facundo Tomas Juanes Marquez | TomasJuanes       | Facilitación          |
| Justino Birk                 | ShiroAyate        | Repositorio           |
|                              |                   | Calidad               |

## Documentacion de la API

Recursos y parametros:
-Search (Busqueda por string, multiples coincidencias)
-LookUp (Busqueda por ID, respuesta unica)
-Get All (Obtener todos los datos de algun tipo: Pais, liga, deporte)
-Search All (Buscar todos los datos de algun tipo, en relacion a un ID obligatorio (EJ: Todas las ligas relacionadas al ID de un deporte))
-Schedule (Obtener eventos/partidos)
Formato de respuesta: JSON (¿Que campos son opcionales?¿Como se representan fechas y ausencias?)
Autenticacion: Clave generica (123)
Limites: 30 request por minuto, cantidad de respuestas limitadas segun Endpoint
Errores:
Terminos y estabilidad:

## Cómo ejecutar el proyecto

```bash
npm install
npm start
```

La aplicación estará disponible en `http://localhost:3000`. Las cuentas se guardan
localmente en `usuarios.json` por defecto (se puede cambiar con `USER_STORE_PATH`);
ese archivo no se versiona y las contraseñas se almacenan como hashes. Las
publicaciones, productos, carritos y pedidos se guardan en `data/comunidad.json`
por defecto; la ubicación se puede cambiar con `COMMUNITY_STORE_PATH`.
La configuración administrativa, incluido el límite de sesión, se guarda en
`data/admin-settings.json` y se puede reubicar con `ADMIN_SETTINGS_PATH`. Las
las sesiones duran 10 minutos por defecto desde el inicio de sesión; el administrador
puede ajustar el límite entre 1 y 1440 minutos para sesiones nuevas.

Para configurar la cuenta administradora inicial, definir `ADMIN_NAME`,
`ADMIN_EMAIL` y `ADMIN_PASSWORD` en un `.env` local antes de iniciar el servidor.
No compartir ni versionar ese archivo. Usa una contraseña robusta en cualquier
entorno expuesto.

## Foro, perfiles y tienda

- Las cuentas registradas pueden crear publicaciones y comentarios.
- Los perfiles públicos muestran el equipo favorito, publicaciones y comentarios,
  sin exponer el correo electrónico ni datos de autenticación. El perfil propio
  requiere iniciar sesión y también muestra el correo y el historial de canjes.
- Solo una cuenta con `role: "admin"` puede acceder al panel privado para moderar
  publicaciones, gestionar productos y consultar, suspender, reactivar o eliminar
  cuentas. El servidor protege tanto el panel como sus operaciones.
- El carrito pertenece a la cuenta iniciada. El servidor valida stock y vuelve a
  calcular los totales en puntos al registrar un canje de prueba.
- Los precios del catálogo se expresan en puntos. Esta versión no implementa
  saldos ni formas de obtener puntos, y no procesa pagos reales.
- Al eliminar una cuenta, su nombre pasa a ser “Cuenta borrada”, se conserva el
  correo para administración y sus publicaciones y comentarios dejan de ser
  visibles públicamente. La suspensión conserva la cuenta y se puede revertir.

## Cómo ejecutar las pruebas

```bash
npm test
```

## Documentación

- Diagramas y wireframes: [`docs/`](docs/)
- Acuerdos de trabajo y convenciones: [`CONTRIBUTING.md`](CONTRIBUTING.md)
- Riesgos: [`docs/riesgos.md`](docs/riesgos.md)

## Uso de herramientas de IA

Registrar aquí qué herramientas se usaron, para qué tareas y qué se adoptó de sus propuestas.

| Fecha | Herramienta | Tarea | Qué se adoptó y por qué |
| ----- | ----------- | ----- | ----------------------- |
|       |             |       |                         |
