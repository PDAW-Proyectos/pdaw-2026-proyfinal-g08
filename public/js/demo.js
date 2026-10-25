      const entradaFecha = document.querySelector("#fechaPartido");
      const botonNavegacion = document.querySelector(".navbar-toggler");
      const navegacion = document.querySelector("#navegacionPrincipal");
      const navegacionMovil = window.matchMedia("(max-width: 767.98px)");
      const fechaLocal = new Date();
      const fechaAValorEntrada = (fecha) => {
        const anio = fecha.getFullYear();
        const mes = String(fecha.getMonth() + 1).padStart(2, "0");
        const dia = String(fecha.getDate()).padStart(2, "0");
        return `${anio}-${mes}-${dia}`;
      };

      entradaFecha.value = fechaAValorEntrada(fechaLocal);
      document.querySelector("#anioActual").textContent = fechaLocal.getFullYear();

      const sincronizarNavegacion = () => {
        if (navegacionMovil.matches) {
          navegacion.style.setProperty("display", "none", "important");
          botonNavegacion.setAttribute("aria-expanded", "false");
          navegacion.classList.remove("show");
        } else {
          navegacion.style.removeProperty("display");
        }
      };

      sincronizarNavegacion();
      navegacionMovil.addEventListener("change", sincronizarNavegacion);

      botonNavegacion.addEventListener("click", () => {
        const estaExpandida = botonNavegacion.getAttribute("aria-expanded") === "true";
        botonNavegacion.setAttribute("aria-expanded", String(!estaExpandida));
        navegacion.style.setProperty("display", estaExpandida ? "none" : "flex", "important");
        navegacion.classList.toggle("show", !estaExpandida);
      });

      navegacion.querySelectorAll("a").forEach((enlace) => {
        enlace.addEventListener("click", () => {
          botonNavegacion.setAttribute("aria-expanded", "false");
          if (navegacionMovil.matches) {
            navegacion.style.setProperty("display", "none", "important");
          }
          navegacion.classList.remove("show");
        });
      });

      const desplazarFecha = (cantidad) => {
        const fechaSeleccionada = new Date(`${entradaFecha.value}T12:00:00`);
        fechaSeleccionada.setDate(fechaSeleccionada.getDate() + cantidad);
        entradaFecha.value = fechaAValorEntrada(fechaSeleccionada);
        entradaFecha.dispatchEvent(new Event("change", { bubbles: true }));
      };

      document.querySelector("#diaAnterior").addEventListener("click", () => desplazarFecha(-1));
      document.querySelector("#diaSiguiente").addEventListener("click", () => desplazarFecha(1));

      document.querySelectorAll("[data-filtro]").forEach((boton) => {
        boton.addEventListener("click", () => {
          const filtroSeleccionado = boton.dataset.filtro;
          let resultadosVisibles = 0;

          document.querySelectorAll("[data-filtro]").forEach((botonFiltro) => {
            botonFiltro.setAttribute("aria-pressed", String(botonFiltro === boton));
          });

          document.querySelectorAll(".fila-resultado").forEach((fila) => {
            const estaVisible =
              filtroSeleccionado === "todos" || fila.dataset.categoria === filtroSeleccionado;
            fila.hidden = !estaVisible;
            if (estaVisible) resultadosVisibles += 1;
          });

          document.querySelector("#resultadosVacios").hidden = resultadosVisibles > 0;
        });
      });

      const claveFavoritos = "ofsai-favorite-matches";
      const favoritosGuardados = new Set(
        JSON.parse(localStorage.getItem(claveFavoritos) || "[]"),
      );

      document.querySelectorAll("[data-favorito]").forEach((boton) => {
        const esFavorito = favoritosGuardados.has(boton.dataset.favorito);
        boton.setAttribute("aria-pressed", String(esFavorito));
        boton.textContent = esFavorito ? "★" : "☆";
        boton.addEventListener("click", () => {
          const idPartido = boton.dataset.favorito;
          const seleccionado = boton.getAttribute("aria-pressed") !== "true";

          boton.setAttribute("aria-pressed", String(seleccionado));
          boton.textContent = seleccionado ? "★" : "☆";
          if (seleccionado) {
            favoritosGuardados.add(idPartido);
          } else {
            favoritosGuardados.delete(idPartido);
          }
          localStorage.setItem(claveFavoritos, JSON.stringify([...favoritosGuardados]));
        });
      });
