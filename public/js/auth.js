export function inicializarAutenticacion() {
  const controlesAnonimos = document.querySelector(
    ".auth-anonymous[data-auth-anonymous]",
  );
  const controlesDeSesion = document.querySelector("[data-auth-session]");
  const nombreUsuario = document.querySelector("[data-auth-name]");
  const mensajeAutenticacion = document.querySelector("[data-auth-feedback]");

  if (
    !controlesAnonimos ||
    !controlesDeSesion ||
    !nombreUsuario ||
    !mensajeAutenticacion
  ) {
    return;
  }

  const dialogo = crearDialogoAutenticacion();
  document.body.append(dialogo);

  const tituloDialogo = dialogo.querySelector("#titulo-autenticacion");
  const mensajeDialogo = dialogo.querySelector("[data-dialog-feedback]");
  const formularios = [...dialogo.querySelectorAll("[data-auth-form]")];

  function actualizarUsuario(usuario) {
    controlesAnonimos.hidden = Boolean(usuario);
    controlesDeSesion.hidden = !usuario;
    nombreUsuario.textContent = usuario ? usuario.name : "";
  }

  function obtenerMensajeValidacion(campo, formulario) {
    const valor = campo.value.trim();

    if (campo.required && !valor) {
      return "Este campo es obligatorio.";
    }
    if (!valor) {
      return "";
    }
    if (campo.name === "name" && (valor.length < 2 || valor.length > 80)) {
      return "El nombre debe tener entre 2 y 80 caracteres.";
    }
    if (
      campo.name === "email" &&
      (valor.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor))
    ) {
      return "Ingresá un correo electrónico válido.";
    }
    if (
      campo.name === "password" &&
      formulario.dataset.authForm === "register" &&
      (campo.value.length < 8 || campo.value.length > 128)
    ) {
      return "La contraseña debe tener entre 8 y 128 caracteres.";
    }

    return "";
  }

  function validarCampo(campo, formulario) {
    const mensaje = obtenerMensajeValidacion(campo, formulario);
    const elementoError = formulario.querySelector(
      `[data-auth-error="${campo.name}"]`,
    );

    elementoError.textContent = mensaje;
    elementoError.hidden = !mensaje;
    campo.setAttribute("aria-invalid", String(Boolean(mensaje)));

    if (mensaje) {
      elementoError.id = `error-${formulario.dataset.authForm}-${campo.name}`;
      campo.setAttribute("aria-describedby", elementoError.id);
    } else {
      campo.removeAttribute("aria-describedby");
    }

    return !mensaje;
  }

  function limpiarFormulario(formulario) {
    formulario.reset();
    formulario.querySelectorAll("[data-auth-field]").forEach((campo) => {
      campo.removeAttribute("aria-invalid");
      campo.removeAttribute("aria-describedby");
    });
    formulario.querySelectorAll("[data-auth-error]").forEach((elementoError) => {
      elementoError.textContent = "";
      elementoError.hidden = true;
    });
  }

  function abrirDialogo(modo) {
    formularios.forEach((formulario) => {
      formulario.hidden = formulario.dataset.authForm !== modo;
      limpiarFormulario(formulario);
    });

    mensajeDialogo.textContent = "";
    tituloDialogo.textContent =
      modo === "register" ? "Crear una cuenta" : "Iniciar sesión";
    dialogo.showModal();
    dialogo.querySelector(`[data-auth-form="${modo}"] input`).focus();
  }

  async function enviarFormulario(evento, formulario) {
    evento.preventDefault();

    const campos = [...formulario.querySelectorAll("[data-auth-field]")];
    const camposValidos = campos.map((campo) =>
      validarCampo(campo, formulario),
    );

    if (camposValidos.includes(false)) {
      formulario.querySelector('[aria-invalid="true"]').focus();
      return;
    }

    const botonEnviar = formulario.querySelector('[type="submit"]');
    botonEnviar.disabled = true;
    mensajeDialogo.textContent = "";

    try {
      const datosFormulario = Object.fromEntries(new FormData(formulario));
      if (datosFormulario.favoriteTeam === "") {
        datosFormulario.favoriteTeam = null;
      }

      const respuesta = await fetch(
        formulario.dataset.authForm === "register"
          ? "/api/register"
          : "/api/login",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(datosFormulario),
        },
      );
      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          resultado.error || "No se pudo completar la solicitud.",
        );
      }

      actualizarUsuario(resultado.user);
      mensajeAutenticacion.textContent = "";
      formulario.reset();
      dialogo.close();
    } catch (error) {
      mensajeDialogo.textContent =
        error instanceof Error
          ? error.message
          : "No se pudo conectar con el servidor.";
    } finally {
      botonEnviar.disabled = false;
    }
  }

  async function cerrarSesion(evento) {
    const botonCerrarSesion = evento.currentTarget;
    botonCerrarSesion.disabled = true;
    mensajeAutenticacion.textContent = "";

    try {
      const respuesta = await fetch("/api/logout", { method: "POST" });

      if (!respuesta.ok) {
        const resultado = await respuesta.json();
        throw new Error(resultado.error || "No se pudo cerrar la sesión.");
      }

      actualizarUsuario(null);
    } catch (error) {
      mensajeAutenticacion.textContent =
        error instanceof Error
          ? error.message
          : "No se pudo conectar con el servidor.";
    } finally {
      botonCerrarSesion.disabled = false;
    }
  }

  async function cargarSesionActual() {
    try {
      const respuesta = await fetch("/api/me");
      if (respuesta.status === 401) {
        return;
      }

      const resultado = await respuesta.json();
      if (!respuesta.ok) {
        throw new Error(
          resultado.error || "No se pudo consultar la sesión.",
        );
      }

      actualizarUsuario(resultado.user);
    } catch (error) {
      mensajeAutenticacion.textContent =
        error instanceof Error
          ? error.message
          : "No se pudo consultar la sesión.";
    }
  }

  controlesAnonimos.querySelectorAll("[data-auth-open]").forEach((boton) => {
    boton.addEventListener("click", () => abrirDialogo(boton.dataset.authOpen));
  });
  dialogo
    .querySelector(".auth-dialog-close")
    .addEventListener("click", () => dialogo.close());
  dialogo.querySelectorAll("[data-auth-switch]").forEach((boton) => {
    boton.addEventListener("click", () => abrirDialogo(boton.dataset.authSwitch));
  });

  formularios.forEach((formulario) => {
    formulario.querySelectorAll("[data-auth-field]").forEach((campo) => {
      campo.addEventListener("input", () => {
        if (campo.getAttribute("aria-invalid") === "true") {
          validarCampo(campo, formulario);
        }
      });
    });

    formulario.addEventListener("submit", (evento) =>
      enviarFormulario(evento, formulario),
    );
  });

  controlesDeSesion
    .querySelector("[data-auth-logout]")
    .addEventListener("click", cerrarSesion);

  cargarSesionActual();
}

function crearDialogoAutenticacion() {
  const dialogo = document.createElement("dialog");
  dialogo.className = "dialogo-autenticacion";
  dialogo.setAttribute("aria-labelledby", "titulo-autenticacion");

  const encabezado = document.createElement("div");
  encabezado.className = "auth-dialog-header";

  const bloqueTitulo = document.createElement("div");
  const antetitulo = crearElemento("p", "texto-antetitulo mb-1", "Comunidad ofsai");
  const titulo = crearElemento("h2", "titulo-seccion mb-0");
  titulo.id = "titulo-autenticacion";
  bloqueTitulo.append(antetitulo, titulo);

  const botonCerrar = crearBoton("×", "auth-dialog-close", "button");
  botonCerrar.setAttribute("aria-label", "Cerrar");
  encabezado.append(bloqueTitulo, botonCerrar);

  const formularioRegistro = crearFormularioRegistro();
  const formularioInicioSesion = crearFormularioInicioSesion();
  const mensaje = crearElemento("p", "auth-dialog-feedback");
  mensaje.dataset.dialogFeedback = "";
  mensaje.setAttribute("role", "status");
  mensaje.setAttribute("aria-live", "polite");

  dialogo.append(
    encabezado,
    formularioRegistro,
    formularioInicioSesion,
    mensaje,
  );

  return dialogo;
}

function crearFormularioRegistro() {
  const formulario = crearFormulario("register");
  agregarCampoTexto(formulario, {
    etiqueta: "Nombre",
    id: "auth-nombre",
    nombre: "name",
    tipo: "text",
    autocompletado: "name",
    longitudMinima: 2,
    longitudMaxima: 80,
  });
  agregarCampoTexto(formulario, {
    etiqueta: "Correo electrónico",
    id: "auth-registro-email",
    nombre: "email",
    tipo: "email",
    autocompletado: "email",
    longitudMaxima: 254,
  });
  agregarCampoTexto(formulario, {
    etiqueta: "Contraseña",
    id: "auth-registro-password",
    nombre: "password",
    tipo: "password",
    autocompletado: "new-password",
    longitudMinima: 8,
    longitudMaxima: 128,
  });
  agregarSelectorEquipo(formulario);
  agregarBotonEnviar(formulario, "Crear cuenta");
  agregarCambioFormulario(
    formulario,
    "¿Ya tenés cuenta? ",
    "Iniciá sesión",
    "login",
  );

  return formulario;
}

function crearFormularioInicioSesion() {
  const formulario = crearFormulario("login");
  agregarCampoTexto(formulario, {
    etiqueta: "Correo electrónico",
    id: "auth-login-email",
    nombre: "email",
    tipo: "email",
    autocompletado: "email",
    longitudMaxima: 254,
  });
  agregarCampoTexto(formulario, {
    etiqueta: "Contraseña",
    id: "auth-login-password",
    nombre: "password",
    tipo: "password",
    autocompletado: "current-password",
  });
  agregarBotonEnviar(formulario, "Iniciar sesión");
  agregarCambioFormulario(
    formulario,
    "¿Todavía no tenés cuenta? ",
    "Registrate",
    "register",
  );

  return formulario;
}

function crearFormulario(modo) {
  const formulario = document.createElement("form");
  formulario.className = "auth-formulario";
  formulario.dataset.authForm = modo;
  formulario.noValidate = true;
  formulario.hidden = true;

  return formulario;
}

function agregarCampoTexto(formulario, configuracion) {
  const etiqueta = crearElemento(
    "label",
    "auth-label",
    configuracion.etiqueta,
  );
  etiqueta.htmlFor = configuracion.id;

  const campo = document.createElement("input");
  campo.className = "form-control auth-input";
  campo.id = configuracion.id;
  campo.name = configuracion.nombre;
  campo.type = configuracion.tipo;
  campo.autocomplete = configuracion.autocompletado;
  campo.required = true;
  campo.dataset.authField = "";

  if (configuracion.longitudMinima) {
    campo.minLength = configuracion.longitudMinima;
  }
  if (configuracion.longitudMaxima) {
    campo.maxLength = configuracion.longitudMaxima;
  }

  const mensajeError = crearElemento("p", "auth-field-error");
  mensajeError.dataset.authError = configuracion.nombre;
  mensajeError.setAttribute("aria-live", "polite");
  mensajeError.hidden = true;

  formulario.append(etiqueta, campo, mensajeError);
}

function agregarSelectorEquipo(formulario) {
  const etiqueta = crearElemento("label", "auth-label");
  etiqueta.htmlFor = "auth-equipo";
  etiqueta.append(
    document.createTextNode("Equipo favorito "),
    crearElemento("span", "auth-optional", "(opcional)"),
  );

  const selector = document.createElement("select");
  selector.className = "form-select auth-input";
  selector.id = "auth-equipo";
  selector.name = "favoriteTeam";

  const equipos = [
    ["", "Elegir más tarde"],
    ["Real Madrid", "Real Madrid"],
    ["Barcelona", "Barcelona"],
    ["Atlético de Madrid", "Atlético de Madrid"],
    ["Sevilla", "Sevilla"],
    ["Arsenal", "Arsenal"],
    ["Liverpool", "Liverpool"],
    ["Manchester City", "Manchester City"],
    ["Chelsea", "Chelsea"],
    ["Bayern Múnich", "Bayern Múnich"],
    ["Borussia Dortmund", "Borussia Dortmund"],
    ["Inter", "Inter"],
    ["Juventus", "Juventus"],
    ["River Plate", "River Plate"],
    ["Flamengo", "Flamengo"],
  ];

  equipos.forEach(([valor, nombre]) => {
    const opcion = document.createElement("option");
    opcion.value = valor;
    opcion.textContent = nombre;
    selector.append(opcion);
  });

  formulario.append(etiqueta, selector);
}

function agregarBotonEnviar(formulario, texto) {
  formulario.append(crearBoton(texto, "btn boton-grada auth-submit", "submit"));
}

function agregarCambioFormulario(formulario, texto, textoBoton, modo) {
  const indicacion = crearElemento("p", "auth-cambiar-modo");
  indicacion.append(
    document.createTextNode(texto),
    crearBoton(textoBoton, "", "button", { "data-auth-switch": modo }),
  );
  formulario.append(indicacion);
}

function crearBoton(texto, clase, tipo, atributos = {}) {
  const boton = document.createElement("button");
  boton.type = tipo;
  boton.textContent = texto;
  boton.className = clase;

  Object.entries(atributos).forEach(([nombre, valor]) => {
    boton.setAttribute(nombre, valor);
  });

  return boton;
}

function crearElemento(etiqueta, clase, texto = "") {
  const elemento = document.createElement(etiqueta);
  elemento.className = clase;
  elemento.textContent = texto;

  return elemento;
}
