
document.addEventListener("DOMContentLoaded", function () {
  const formulario = document.getElementById("formulario-beta");
  if (!formulario) return;

  const correo = document.getElementById("correo");
  const detalle = document.getElementById("detalle");
  const estado = document.getElementById("estado-beta");

  function errorCorreo() {
    const valor = correo.value.trim();
    if (!valor) return "Ingresa tu correo de estudiante.";

    if (!/^[^\s@]+@[^\s@]+\.(edu\.pe|edu)$/i.test(valor)) {
      return "Usa un correo académico válido (ej.: nombre@universidad.edu.pe).";
    }
    return "";
  }

  function errorDetalle() {
    const valor = detalle.value.trim();
    if (!valor) return "Cuéntanos cuál es tu mayor distracción.";
    if (valor.length < 10) return "Escribe al menos 10 caracteres para describir tu distracción.";
    return "";
  }

  function mostrarValidacion(campo, mensaje) {
    document.getElementById("error-" + campo.id).textContent = mensaje;
    campo.classList.toggle("campo-invalido", Boolean(mensaje));
    campo.classList.toggle("campo-valido", !mensaje && campo.value.trim() !== "");
    campo.setAttribute("aria-invalid", mensaje ? "true" : "false");
    return !mensaje;
  }

  function validarCorreo() {
    return mostrarValidacion(correo, errorCorreo());
  }
  function validarDetalle() {
    return mostrarValidacion(detalle, errorDetalle());
  }

  [correo, detalle].forEach(function (campo) {
    const validar = campo === correo ? validarCorreo : validarDetalle;
    campo.addEventListener("blur", validar);
    campo.addEventListener("input", function () {
      estado.textContent = "";
      estado.className = "estado-beta";
      if (campo.getAttribute("aria-invalid") !== null) validar();
    });
  });

  formulario.addEventListener("submit", function (evento) {
    evento.preventDefault();
    const correoCorrecto = validarCorreo();
    const detalleCorrecto = validarDetalle();

    if (!correoCorrecto || !detalleCorrecto) {
      estado.textContent = "Revisa los campos señalados para continuar.";
      estado.className = "estado-beta error";
      (correoCorrecto ? detalle : correo).focus();
      return;
    }

    estado.textContent = "¡Datos validados! Tu solicitud está lista. Esta es una demostración; aún no se ha enviado a FocusLock.";
    estado.className = "estado-beta exito";
  });
});
