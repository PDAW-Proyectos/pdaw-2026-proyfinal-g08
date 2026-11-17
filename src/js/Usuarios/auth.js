const authAnonymous = document.querySelector(".auth-anonymous[data-auth-anonymous]");
const authSession = document.querySelector("[data-auth-session]");
const authName = document.querySelector("[data-auth-name]");
const authFeedback = document.querySelector("[data-auth-feedback]");

if (authAnonymous && authSession && authName && authFeedback) {
  const crearElemento = (tag, opciones = {}, hijos = []) => {
    const el = document.createElement(tag);
    if (opciones.className) el.className = opciones.className;
    if (opciones.textContent !== undefined) el.textContent = opciones.textContent;
    if (opciones.attributes) {
      Object.entries(opciones.attributes).forEach(([clave, valor]) => {
        if (valor !== undefined && valor !== null) {
          el.setAttribute(clave, String(valor));
        }
      });
    }
    if (opciones.hidden) el.hidden = true;
    hijos.forEach((hijo) => {
      if (hijo !== null && hijo !== undefined) el.append(hijo);
    });
    return el;
  };

  const crearCampoTexto = ({ id, label, name, type, autocomplete, minlength, maxlength }) => {
    const labelEl = crearElemento("label", {
      className: "auth-label",
      textContent: label,
      attributes: { for: id },
    });
    const inputEl = crearElemento("input", {
      className: "form-control auth-input",
      attributes: {
        id,
        name,
        type,
        autocomplete,
        minlength,
        maxlength,
        required: "",
        "data-auth-field": "",
      },
    });
    const errorEl = crearElemento("p", {
      className: "auth-field-error",
      hidden: true,
      attributes: { "data-auth-error": name, "aria-live": "polite" },
    });
    return [labelEl, inputEl, errorEl];
  };

  const EQUIPOS_FAVORITOS = [
    "Real Madrid",
    "Barcelona",
    "Atlético de Madrid",
    "Sevilla",
    "Arsenal",
    "Liverpool",
    "Manchester City",
    "Chelsea",
    "Bayern Múnich",
    "Borussia Dortmund",
    "Inter",
    "Juventus",
    "River Plate",
    "Flamengo",
  ];

  const dialog = crearElemento(
    "dialog",
    {
      className: "dialogo-autenticacion",
      attributes: { "aria-labelledby": "titulo-autenticacion" },
    },
    [
      crearElemento("div", { className: "auth-dialog-header" }, [
        crearElemento("div", {}, [
          crearElemento("p", {
            className: "texto-antetitulo mb-1",
            textContent: "Comunidad ofsai",
          }),
          crearElemento("h2", {
            className: "titulo-seccion mb-0",
            attributes: { id: "titulo-autenticacion" },
          }),
        ]),
        crearElemento("button", {
          className: "auth-dialog-close",
          textContent: "×",
          attributes: { type: "button", "aria-label": "Cerrar" },
        }),
      ]),
      crearElemento(
        "form",
        {
          className: "auth-formulario",
          hidden: true,
          attributes: { "data-auth-form": "register", novalidate: "" },
        },
        [
          ...crearCampoTexto({
            id: "auth-nombre",
            label: "Nombre",
            name: "name",
            type: "text",
            autocomplete: "name",
            minlength: 2,
            maxlength: 80,
          }),
          ...crearCampoTexto({
            id: "auth-registro-email",
            label: "Correo electrónico",
            name: "email",
            type: "email",
            autocomplete: "email",
            maxlength: 254,
          }),
          ...crearCampoTexto({
            id: "auth-registro-password",
            label: "Contraseña",
            name: "password",
            type: "password",
            autocomplete: "new-password",
            minlength: 8,
            maxlength: 128,
          }),
          crearElemento("label", { className: "auth-label", attributes: { for: "auth-equipo" } }, [
            "Equipo favorito ",
            crearElemento("span", { className: "auth-optional", textContent: "(opcional)" }),
          ]),
          crearElemento(
            "select",
            {
              className: "form-select auth-input",
              attributes: { id: "auth-equipo", name: "favoriteTeam" },
            },
            [
              crearElemento("option", {
                textContent: "Elegir más tarde",
                attributes: { value: "" },
              }),
              ...EQUIPOS_FAVORITOS.map((equipo) =>
                crearElemento("option", { textContent: equipo })
              ),
            ]
          ),
          crearElemento("button", {
            className: "btn boton-grada auth-submit",
            textContent: "Crear cuenta",
            attributes: { type: "submit" },
          }),
          crearElemento("p", { className: "auth-cambiar-modo" }, [
            "¿Ya tenés cuenta? ",
            crearElemento("button", {
              textContent: "Iniciá sesión",
              attributes: { type: "button", "data-auth-switch": "login" },
            }),
          ]),
        ]
      ),
      crearElemento(
        "form",
        {
          className: "auth-formulario",
          hidden: true,
          attributes: { "data-auth-form": "login", novalidate: "" },
        },
        [
          ...crearCampoTexto({
            id: "auth-login-email",
            label: "Correo electrónico",
            name: "email",
            type: "email",
            autocomplete: "email",
            maxlength: 254,
          }),
          ...crearCampoTexto({
            id: "auth-login-password",
            label: "Contraseña",
            name: "password",
            type: "password",
            autocomplete: "current-password",
          }),
          crearElemento("button", {
            className: "btn boton-grada auth-submit",
            textContent: "Iniciar sesión",
            attributes: { type: "submit" },
          }),
          crearElemento("p", { className: "auth-cambiar-modo" }, [
            "¿Todavía no tenés cuenta? ",
            crearElemento("button", {
              textContent: "Registrate",
              attributes: { type: "button", "data-auth-switch": "register" },
            }),
          ]),
        ]
      ),
      crearElemento("p", {
        className: "auth-dialog-feedback",
        attributes: { "data-dialog-feedback": "", role: "status", "aria-live": "polite" },
      }),
    ]
  );
  document.body.append(dialog);

  const title = dialog.querySelector("#titulo-autenticacion");
  const dialogFeedback = dialog.querySelector("[data-dialog-feedback]");
  const forms = [...dialog.querySelectorAll("[data-auth-form]")];

  const setUser = (user) => {
    authAnonymous.hidden = Boolean(user);
    authSession.hidden = !user;
    authName.textContent = user ? user.name : "";
  };

  const validationMessage = (field, form) => {
    const value = field.value.trim();
    if (field.required && !value) return "Este campo es obligatorio.";
    if (!value) return "";
    if (field.name === "name" && (value.length < 2 || value.length > 80)) {
      return "El nombre debe tener entre 2 y 80 caracteres.";
    }
    if (
      field.name === "email" &&
      (value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
    ) {
      return "Ingresá un correo electrónico válido.";
    }
    if (
      field.name === "password" &&
      form.dataset.authForm === "register" &&
      (field.value.length < 8 || field.value.length > 128)
    ) {
      return "La contraseña debe tener entre 8 y 128 caracteres.";
    }
    return "";
  };

  const validateField = (field, form) => {
    const message = validationMessage(field, form);
    const error = form.querySelector(`[data-auth-error="${field.name}"]`);
    error.textContent = message;
    error.hidden = !message;
    field.setAttribute("aria-invalid", String(Boolean(message)));
    if (message) {
      field.setAttribute("aria-describedby", error.id || `error-${form.dataset.authForm}-${field.name}`);
      error.id = `error-${form.dataset.authForm}-${field.name}`;
    } else {
      field.removeAttribute("aria-describedby");
    }
    return !message;
  };

  const openDialog = (mode) => {
    forms.forEach((form) => {
      form.hidden = form.dataset.authForm !== mode;
      form.reset();
      form.querySelectorAll("[data-auth-field]").forEach((field) => {
        field.removeAttribute("aria-invalid");
        field.removeAttribute("aria-describedby");
      });
      form.querySelectorAll("[data-auth-error]").forEach((error) => {
        error.textContent = "";
        error.hidden = true;
      });
    });
    dialogFeedback.textContent = "";
    title.textContent = mode === "register" ? "Crear una cuenta" : "Iniciar sesión";
    dialog.showModal();
    dialog.querySelector(`[data-auth-form="${mode}"] input`).focus();
  };

  authAnonymous.querySelectorAll("[data-auth-open]").forEach((button) => {
    button.addEventListener("click", () => openDialog(button.dataset.authOpen));
  });
  dialog.querySelector(".auth-dialog-close").addEventListener("click", () => dialog.close());
  dialog.querySelectorAll("[data-auth-switch]").forEach((button) => {
    button.addEventListener("click", () => openDialog(button.dataset.authSwitch));
  });

  forms.forEach((form) => {
    form.querySelectorAll("[data-auth-field]").forEach((field) => {
      field.addEventListener("input", () => {
        if (field.getAttribute("aria-invalid") === "true") validateField(field, form);
      });
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const fieldsAreValid = [...form.querySelectorAll("[data-auth-field]")].map((field) =>
        validateField(field, form),
      );
      if (fieldsAreValid.includes(false)) {
        form.querySelector('[aria-invalid="true"]').focus();
        return;
      }

      const submitButton = form.querySelector('[type="submit"]');
      submitButton.disabled = true;
      dialogFeedback.textContent = "";
      try {
        const fields = Object.fromEntries(new FormData(form));
        if (fields.favoriteTeam === "") fields.favoriteTeam = null;
        const response = await fetch(
          form.dataset.authForm === "register" ? "/api/register" : "/api/login",
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(fields),
          },
        );
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "No se pudo completar la solicitud.");

        setUser(result.user);
        authFeedback.textContent = "";
        form.reset();
        dialog.close();
      } catch (error) {
        dialogFeedback.textContent = error.message || "No se pudo conectar con el servidor.";
      } finally {
        submitButton.disabled = false;
      }
    });
  });

  authSession.querySelector("[data-auth-logout]").addEventListener("click", async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    authFeedback.textContent = "";
    try {
      const response = await fetch("/api/logout", { method: "POST" });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "No se pudo cerrar la sesión.");
      }
      setUser(null);
    } catch (error) {
      authFeedback.textContent = error.message || "No se pudo conectar con el servidor.";
    } finally {
      button.disabled = false;
    }
  });

  fetch("/api/me")
    .then(async (response) => {
      if (response.status === 401) return null;
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo consultar la sesión.");
      return result.user;
    })
    .then((user) => {
      if (user) setUser(user);
    })
    .catch((error) => {
      authFeedback.textContent = error.message || "No se pudo consultar la sesión.";
    });
}
