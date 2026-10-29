const authAnonymous = document.querySelector("[data-auth-anonymous]");
const authSession = document.querySelector("[data-auth-session]");
const authName = document.querySelector("[data-auth-name]");
const authFeedback = document.querySelector("[data-auth-feedback]");

if (authAnonymous && authSession && authName && authFeedback) {
  const dialog = document.createElement("dialog");
  dialog.className = "dialogo-autenticacion";
  dialog.setAttribute("aria-labelledby", "titulo-autenticacion");
  dialog.innerHTML = `
    <div class="auth-dialog-header">
      <div>
        <p class="texto-antetitulo mb-1">Comunidad ofsai</p>
        <h2 class="titulo-seccion mb-0" id="titulo-autenticacion"></h2>
      </div>
      <button class="auth-dialog-close" type="button" aria-label="Cerrar">×</button>
    </div>
    <form class="auth-formulario" data-auth-form="register" novalidate hidden>
      <label class="auth-label" for="auth-nombre">Nombre</label>
      <input class="form-control auth-input" id="auth-nombre" name="name" type="text" autocomplete="name" minlength="2" maxlength="80" required data-auth-field />
      <p class="auth-field-error" data-auth-error="name" aria-live="polite" hidden></p>
      <label class="auth-label" for="auth-registro-email">Correo electrónico</label>
      <input class="form-control auth-input" id="auth-registro-email" name="email" type="email" autocomplete="email" maxlength="254" required data-auth-field />
      <p class="auth-field-error" data-auth-error="email" aria-live="polite" hidden></p>
      <label class="auth-label" for="auth-registro-password">Contraseña</label>
      <input class="form-control auth-input" id="auth-registro-password" name="password" type="password" autocomplete="new-password" minlength="8" maxlength="128" required data-auth-field />
      <p class="auth-field-error" data-auth-error="password" aria-live="polite" hidden></p>
      <label class="auth-label" for="auth-equipo">Equipo favorito <span class="auth-optional">(opcional)</span></label>
      <select class="form-select auth-input" id="auth-equipo" name="favoriteTeam">
        <option value="">Elegir más tarde</option>
        <option>Real Madrid</option>
        <option>Barcelona</option>
        <option>Atlético de Madrid</option>
        <option>Sevilla</option>
        <option>Arsenal</option>
        <option>Liverpool</option>
        <option>Manchester City</option>
        <option>Chelsea</option>
        <option>Bayern Múnich</option>
        <option>Borussia Dortmund</option>
        <option>Inter</option>
        <option>Juventus</option>
        <option>River Plate</option>
        <option>Flamengo</option>
      </select>
      <button class="btn boton-grada auth-submit" type="submit">Crear cuenta</button>
      <p class="auth-cambiar-modo">¿Ya tenés cuenta? <button type="button" data-auth-switch="login">Iniciá sesión</button></p>
    </form>
    <form class="auth-formulario" data-auth-form="login" novalidate hidden>
      <label class="auth-label" for="auth-login-email">Correo electrónico</label>
      <input class="form-control auth-input" id="auth-login-email" name="email" type="email" autocomplete="email" maxlength="254" required data-auth-field />
      <p class="auth-field-error" data-auth-error="email" aria-live="polite" hidden></p>
      <label class="auth-label" for="auth-login-password">Contraseña</label>
      <input class="form-control auth-input" id="auth-login-password" name="password" type="password" autocomplete="current-password" required data-auth-field />
      <p class="auth-field-error" data-auth-error="password" aria-live="polite" hidden></p>
      <button class="btn boton-grada auth-submit" type="submit">Iniciar sesión</button>
      <p class="auth-cambiar-modo">¿Todavía no tenés cuenta? <button type="button" data-auth-switch="register">Registrate</button></p>
    </form>
    <p class="auth-dialog-feedback" data-dialog-feedback role="status" aria-live="polite"></p>
  `;
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
