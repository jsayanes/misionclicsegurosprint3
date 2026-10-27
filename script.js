/* =========================================================
   Misión Clic Seguro · Sprint 3 · script.js
   Todo el JavaScript del OA vive en este archivo.
   El HTML solo lo enlaza con <script src="script.js"></script>
   y styles.css se ocupa únicamente de la apariencia: este
   archivo prende y apaga clases (classList) y el CSS decide
   cómo se ve cada estado.
   ========================================================= */


/* ---------- 1. Datos del juego ---------- */

const VIDAS_INICIALES = 5;
const TOTAL_NIVELES = 5;

// Puntos según el intento en que se acierta: 1.º = 100, 2.º = 50...
const PREMIOS = [100, 50, 25, 10, 0];

// Letra de cada premio en el código del certificado (ACS-AAAAA-L5).
const LETRA_PREMIO = { 100: "A", 50: "B", 25: "C", 10: "D", 0: "E" };

// Respuestas correctas y mensajes de BYTE de cada nivel.
const NIVELES = {
    1: {
        tipo: "vf",
        claves: ["f", "v", "f", "v"],
        faltaTexto: "Te falta responder la afirmación ",
        unidad: "afirmaciones",
        explicaciones: [
            "La urgencia es justamente parte de la trampa: busca que actúes rápido, sin pensar y sin verificar.",
            "Un plazo muy corto busca apurarte para que no tengas tiempo de verificar. Cuanto más apuro, más desconfianza.",
            "Responder mantiene la conversación dentro de un canal sospechoso y además puede confirmar que tu dirección está activa.",
            "Esa es la defensa: verificar por un canal oficial que elegís vos, nunca por el enlace que llegó en el mensaje."
        ],
        acierto: "Frenaste la urgencia de PHISH-X: no te apuraste y elegiste verificar por tu cuenta."
    },
    2: {
        tipo: "texto",
        validas: ["microsoft.com", "www.microsoft.com", "@microsoft.com"],
        pistas: {
            "micr0soft-seguro.com": "Ese es el dominio del mensaje falso: usa un cero (0) en lugar de la letra o y agrega «-seguro». Es una imitación.",
            "@micr0soft-seguro.com": "Ese es el dominio del mensaje falso: usa un cero (0) en lugar de la letra o y agrega «-seguro». Es una imitación.",
            "soporte-cuentas@micr0soft-seguro.com": "Esa es la dirección completa del mensaje falso. Lo que hay después de la @ imita al dominio verdadero, pero no lo es.",
            "micr0soft.com": "Mirá bien: ese dominio tiene un cero (0) en lugar de la letra o.",
            "microsoft-seguro.com": "Casi: «-seguro» lo agregó el impostor. El dominio oficial no lo tiene.",
            "microsoft": "Te falta la terminación: un dominio completo termina en algo como «.com»."
        },
        pistaGeneral: "El nombre visible puede escribirse como quiera quien envía el mensaje. Compará letra por letra con el nombre real del servicio.",
        acierto: "Le sacaste el disfraz a PHISH-X: el mensaje decía Microsoft, pero el dominio no era el verdadero."
    },
    3: {
        tipo: "multiple",
        correcta: "e",
        explicaciones: {
            a: "Para comprobar si un mensaje es legítimo no necesitás visitar el destino sospechoso. La verificación debe hacerse por una ruta independiente.",
            b: "Cambiar de dispositivo no vuelve seguro al enlace. El destino sigue siendo el mismo.",
            c: "Copiar y pegar el enlace no cambia su destino. Seguís entrando a la dirección que todavía no verificaste.",
            d: "Eso traslada el riesgo a otra persona. La alternativa segura es verificar desde el sitio o aplicación oficial.",
            f: "La exposición comienza al visitar el destino. No hace falta esperar a que pida información para decidir que no es una ruta segura."
        },
        acierto: "Evitaste el enlace trampa de PHISH-X: verificaste por una ruta independiente, sin tocar el botón."
    },
    4: {
        tipo: "casillas",
        sensibles: ["contrasena", "codigo-sms", "tarjeta", "cvv"],
        explicaciones: {
            empresa: "El nombre de la empresa ya aparece en el mensaje: es información pública y no te expone.",
            pelicula: "Tu opinión sobre una película no sirve para entrar a tus cuentas ni para pagar con tu tarjeta: no es un dato sensible."
        },
        faltante: "Todo lo que sirve para entrar a tus cuentas o pagar con tu tarjeta es sensible: no hace falta entregar todos los datos para quedar expuesto.",
        acierto: "Protegiste tus datos: reconociste toda la información sensible que PHISH-X quería robar."
    },
    5: {
        tipo: "orden",
        claves: ["no-interactuar", "verificar", "reportar", "eliminar"],
        faltaTexto: "Te falta elegir el paso ",
        unidad: "pasos",
        explicaciones: [
            "El protocolo seguro no empieza abriendo el mensaje o el enlace sospechoso: primero evitá interactuar.",
            "Después de frenar, verificá por un canal oficial. Si la verificación llega tarde, ya te expusiste.",
            "Si confirmás que es falso, reportalo: así protegés a otras personas del mismo engaño.",
            "Eliminar corta la interacción, pero va al final: primero verificá y reportá el intento."
        ],
        acierto: "Aplicaste el protocolo completo y desarmaste la operación de PHISH-X."
    }
};


/* ---------- 2. Estado de la partida ---------- */

let vidas = VIDAS_INICIALES;
let puntaje = 0;
let gemas = 0;
let nivelActual = 0;
let errores = 0;          // errores en el nivel actual: deciden el premio
let puntosPorNivel = [];  // para el certificado y su código QR
let golpes = 0;           // para alternar la animación de daño
let respuestaFallida = null;  // última respuesta incorrecta del nivel actual

// Elementos que se usan muchas veces.
const cuerpo = document.body;
const campoNombre = document.querySelector("#nombre-jugador");
const radiosAvatar = document.querySelectorAll('input[name="avatar"]');
const vistaAvatar = document.querySelector("#avatar-preview");
const botonIniciar = document.querySelector("#btn-iniciar");
const avisoRegistro = document.querySelector("#registro-faltante");
const botonAyuda = document.querySelector("#btn-ayuda");
const botonRecursos = document.querySelector("#btn-recursos");


/* ---------- 3. Lógica de corrección (sin DOM) ----------
   Estas funciones solo reciben datos y devuelven un resultado:
   no leen ni cambian la página. */

// Limpia lo que escribió el estudiante antes de comparar:
// sin mayúsculas y sin ningún espacio (ni al borde ni en el medio).
function normalizar(texto) {
    return texto.toLowerCase().replaceAll(" ", "");
}

// Para el dominio también se ignoran "https://", "http://"
// y una barra o un punto al final: "https://Microsoft.com/" vale.
function limpiarDominio(texto) {
    let limpio = normalizar(texto);
    if (limpio.startsWith("https://")) {
        limpio = limpio.slice("https://".length);
    } else if (limpio.startsWith("http://")) {
        limpio = limpio.slice("http://".length);
    }
    while (limpio.endsWith("/") || limpio.endsWith(".")) {
        limpio = limpio.slice(0, -1);
    }
    return limpio;
}

// Puntos que se ganan al acertar después de "erroresEnNivel" errores.
function calcularPremio(erroresEnNivel) {
    if (erroresEnNivel >= PREMIOS.length) {
        return 0;
    }
    return PREMIOS[erroresEnNivel];
}

// Posición de la primera respuesta sin completar, o -1 si están todas.
function primeraVacia(respuestas) {
    for (let i = 0; i < respuestas.length; i++) {
        if (respuestas[i] === null || respuestas[i] === "") {
            return i;
        }
    }
    return -1;
}

// Posición de la primera respuesta que repite una anterior, o -1 si no hay.
function primeraRepetida(respuestas) {
    for (let i = 1; i < respuestas.length; i++) {
        if (respuestas.slice(0, i).includes(respuestas[i])) {
            return i;
        }
    }
    return -1;
}

// Compara posición por posición: devuelve un array de true / false.
function compararPorPosicion(respuestas, claves) {
    const resultados = [];
    for (let i = 0; i < claves.length; i++) {
        resultados.push(respuestas[i] === claves[i]);
    }
    return resultados;
}

function contarAciertos(resultados) {
    let aciertos = 0;
    for (const resultado of resultados) {
        if (resultado) {
            aciertos++;
        }
    }
    return aciertos;
}

function corregirTexto(texto, validas) {
    return validas.includes(limpiarDominio(texto));
}

function corregirMultiple(respuesta, correcta) {
    return respuesta === correcta;
}

// Cuenta las casillas bien y mal marcadas, y las sensibles que faltaron.
function corregirCasillas(marcadas, sensibles) {
    let bien = 0;
    let mal = 0;
    for (const valor of marcadas) {
        if (sensibles.includes(valor)) {
            bien++;
        } else {
            mal++;
        }
    }
    return { bien: bien, mal: mal, faltan: sensibles.length - bien };
}

// Convierte cualquier respuesta en un texto para poder compararla
// con la anterior: ["f","v"] → "f,v"; el dominio, ya limpio.
function claveRespuesta(tipo, respuesta) {
    if (tipo === "texto") {
        return limpiarDominio(respuesta);
    }
    return String(respuesta);
}

// "100-50-100-100-100": nombre del archivo del QR en la carpeta qr/.
function claveQR(puntos) {
    return puntos.join("-");
}

// "ACS-ABAAA-L4": una letra por nivel y las vidas que quedaron.
function codigoCertificado(puntos, vidasRestantes) {
    let letras = "";
    for (const punto of puntos) {
        letras += LETRA_PREMIO[punto];
    }
    return "ACS-" + letras + "-L" + vidasRestantes;
}

// Fecha de hoy como la pide un <input type="date">: "2026-10-26".
function fechaDeHoy() {
    const hoy = new Date();
    const mes = String(hoy.getMonth() + 1).padStart(2, "0");
    const dia = String(hoy.getDate()).padStart(2, "0");
    return hoy.getFullYear() + "-" + mes + "-" + dia;
}


/* ---------- 4. Pantalla (DOM) ---------- */

// --- Leer el formulario de cada nivel ---

function valorMarcado(nombre) {
    const marcado = document.querySelector('input[name="' + nombre + '"]:checked');
    if (marcado === null) {
        return null;
    }
    return marcado.value;
}

function leerRespuesta(n) {
    const tipo = NIVELES[n].tipo;
    if (tipo === "vf") {
        const respuestas = [];
        for (let i = 1; i <= NIVELES[n].claves.length; i++) {
            respuestas.push(valorMarcado("l" + n + "-p" + i));
        }
        return respuestas;
    }
    if (tipo === "texto") {
        return document.querySelector("#l" + n + "-dominio").value;
    }
    if (tipo === "multiple") {
        return valorMarcado("l" + n);
    }
    if (tipo === "casillas") {
        const marcadas = [];
        for (const casilla of document.querySelectorAll('input[name="l' + n + '"]:checked')) {
            marcadas.push(casilla.value);
        }
        return marcadas;
    }
    // tipo "orden": el valor elegido en cada combo, del paso 1 al 4
    const elegidos = [];
    for (const combo of document.querySelectorAll("#form-l" + n + " select")) {
        elegidos.push(combo.value);
    }
    return elegidos;
}

// --- Feedback de BYTE ---

// tipo: "correcto", "incorrecto" o "aviso" (el CSS pinta cada uno).
function mostrarFeedback(n, tipo, titulo, texto, lista) {
    const caja = document.querySelector("#feedback-l" + n);
    caja.classList.remove("correcto", "incorrecto", "aviso");
    // Leer el ancho obliga al navegador a "ver" la caja sin clase:
    // así el temblor de "incorrecto" se repite en cada error.
    void caja.offsetWidth;
    caja.classList.add(tipo);
    caja.querySelector(".feedback-byte-titulo").textContent = titulo;
    caja.querySelector(".feedback-byte-texto").textContent = texto;

    const listaHTML = caja.querySelector(".feedback-byte-lista");
    listaHTML.innerHTML = "";  // vaciar antes de volver a llenar
    for (const linea of lista) {
        const item = document.createElement("li");
        item.textContent = linea;
        listaHTML.appendChild(item);
    }
}

// Avisos amarillos: no son errores, así que no restan vidas.
function avisar(n, titulo, texto) {
    mostrarFeedback(n, "aviso", titulo, texto + " No perdiste ninguna vida.", []);
}

function avisarFaltante(n, texto) {
    avisar(n, "BYTE: Te falta responder", texto);
}

// Pinta de verde o rojo una afirmación, opción, paso o campo.
function marcar(elemento, esCorrecto) {
    if (esCorrecto) {
        elemento.classList.remove("incorrecto");
        elemento.classList.add("correcto");
    } else {
        elemento.classList.remove("correcto");
        elemento.classList.add("incorrecto");
    }
}

function limpiarMarcas(n) {
    const formulario = document.querySelector("#form-l" + n);
    for (const elemento of formulario.querySelectorAll(".correcto, .incorrecto")) {
        elemento.classList.remove("correcto", "incorrecto");
    }
    for (const explicacion of formulario.querySelectorAll(".item-explicacion")) {
        explicacion.textContent = "";
    }
}

function bloquearFormulario(n, bloquear) {
    const formulario = document.querySelector("#form-l" + n);
    for (const control of formulario.querySelectorAll("input, select, button")) {
        control.disabled = bloquear;
    }
}

// --- HUD: vidas, puntaje, gemas y progreso ---

// El mismo dato aparece en varios lugares (HUD, nivel, certificado).
function escribirEnTodos(selector, texto) {
    for (const elemento of document.querySelectorAll(selector)) {
        elemento.textContent = texto;
    }
}

function actualizarHUD() {
    escribirEnTodos(".vidas-valor", vidas);
    escribirEnTodos(".puntaje-valor", puntaje);
    escribirEnTodos(".gemas-valor", gemas);
    const progreso = gemas * 100 / TOTAL_NIVELES;
    escribirEnTodos(".progreso-valor", progreso + "%");
    for (const barra of document.querySelectorAll(".progreso-dinamico")) {
        barra.style.width = progreso + "%";
    }
}

function actualizarIntento(n) {
    document.querySelector("#intento-l" + n).textContent = errores + 1;
    document.querySelector("#premio-l" + n).textContent = calcularPremio(errores) + " puntos";
}

// --- Gamificación: perder vida y ganar nivel ---

function perderVida() {
    vidas = Math.max(0, vidas - 1);
    errores++;
    golpes++;
    // Se alternan dos clases para que el destello rojo se repita en cada golpe.
    if (golpes % 2 === 0) {
        cuerpo.classList.remove("golpe-a");
        cuerpo.classList.add("golpe-b");
    } else {
        cuerpo.classList.remove("golpe-b");
        cuerpo.classList.add("golpe-a");
    }
}

function resolverError(n, texto, lista) {
    perderVida();
    if (vidas === 0) {
        lista.push("Perdiste tu última vida de campaña.");
    } else if (vidas === 1) {
        lista.push("Perdiste 1 vida. Te queda 1. Corregí tu respuesta y volvé a comprobar.");
    } else {
        lista.push("Perdiste 1 vida. Te quedan " + vidas + ". Corregí tu respuesta y volvé a comprobar.");
    }
    mostrarFeedback(n, "incorrecto", "BYTE: ¡Cuidado, agente! PHISH-X casi lo logra", texto, lista);
    actualizarIntento(n);
    actualizarHUD();
    if (vidas === 0) {
        mostrarGameOver();
    }
}

function resolverAcierto(n) {
    const premio = calcularPremio(errores);
    puntaje += premio;
    gemas++;
    puntosPorNivel.push(premio);

    mostrarFeedback(n, "correcto", "BYTE: ¡Defensa exitosa, agente!",
        NIVELES[n].acierto + " Ganaste " + premio + " puntos y 1 gema.", []);
    bloquearFormulario(n, true);
    document.querySelector("#puntos-l" + n).textContent = premio + " puntos";
    document.querySelector("#nivel-" + n).classList.add("ganado");
    actualizarHUD();

    if (n === TOTAL_NIVELES) {
        mostrarCertificado();
    } else {
        cuerpo.classList.add("nivel-" + n + "-ganado");  // muestra la tarjeta del nivel superado
    }
}

// --- Corregir cada tipo de actividad ---

// Verdadero/Falso (nivel 1) y ordenar pasos (nivel 5): se corrige posición por posición.
function comprobarItems(n, respuestas) {
    const datos = NIVELES[n];
    const vacia = primeraVacia(respuestas);
    if (vacia !== -1) {
        avisarFaltante(n, datos.faltaTexto + (vacia + 1) + ".");
        return;
    }
    // En el protocolo cada paso va una sola vez.
    if (datos.tipo === "orden") {
        const repetida = primeraRepetida(respuestas);
        if (repetida !== -1) {
            avisar(n, "BYTE: Revisá tus pasos",
                "El paso " + (repetida + 1) + " repite una opción que ya elegiste antes. Cada paso del protocolo va una sola vez.");
            return;
        }
    }

    const resultados = compararPorPosicion(respuestas, datos.claves);
    for (let i = 0; i < resultados.length; i++) {
        marcar(document.querySelector("#l" + n + "-item-" + (i + 1)), resultados[i]);
        if (!resultados[i]) {
            document.querySelector("#l" + n + "-explicacion-" + (i + 1)).textContent = datos.explicaciones[i];
        }
    }

    const aciertos = contarAciertos(resultados);
    if (aciertos === resultados.length) {
        resolverAcierto(n);
    } else {
        resolverError(n, "Acertaste " + aciertos + " de " + resultados.length + " " + datos.unidad +
            ". Revisá las marcadas en rojo: BYTE te explica cada una.", []);
    }
}

// Respuesta escrita (nivel 2).
function comprobarTexto(n, texto) {
    const datos = NIVELES[n];
    const campo = document.querySelector("#l" + n + "-item-1");
    const limpio = limpiarDominio(texto);
    if (limpio === "") {
        avisarFaltante(n, "Escribí el dominio antes de comprobar.");
        return;
    }
    if (corregirTexto(texto, datos.validas)) {
        marcar(campo, true);
        resolverAcierto(n);
        return;
    }
    marcar(campo, false);
    let pista = datos.pistas[limpio];
    if (pista === undefined) {
        pista = datos.pistaGeneral;
    }
    resolverError(n, "«" + texto.trim() + "» no es el dominio oficial de Microsoft.", [pista]);
}

// Múltiple opción (nivel 3).
function comprobarMultiple(n, respuesta) {
    const datos = NIVELES[n];
    if (respuesta === null) {
        avisarFaltante(n, "Elegí una opción antes de comprobar.");
        return;
    }
    // La opción es el <label> que contiene al radio elegido.
    const opcion = document.querySelector("#l" + n + "-" + respuesta).parentElement;
    if (corregirMultiple(respuesta, datos.correcta)) {
        marcar(opcion, true);
        resolverAcierto(n);
    } else {
        marcar(opcion, false);
        resolverError(n, "Esa no es la acción más segura.", [datos.explicaciones[respuesta]]);
    }
}

// Casillas (nivel 4): todas las sensibles y ninguna de más.
function comprobarCasillas(n, marcadas) {
    const datos = NIVELES[n];
    if (marcadas.length === 0) {
        avisarFaltante(n, "Marcá al menos un dato antes de comprobar.");
        return;
    }

    const lista = [];
    for (const valor of marcadas) {
        const opcion = document.querySelector("#l" + n + "-" + valor).parentElement;
        if (datos.sensibles.includes(valor)) {
            marcar(opcion, true);
        } else {
            marcar(opcion, false);
            lista.push(datos.explicaciones[valor]);
        }
    }

    const resultado = corregirCasillas(marcadas, datos.sensibles);
    if (resultado.mal === 0 && resultado.faltan === 0) {
        resolverAcierto(n);
        return;
    }
    if (resultado.faltan > 0) {
        lista.push("Te faltó marcar " + resultado.faltan + " dato(s) sensible(s). " + datos.faltante);
    }
    resolverError(n, "Marcaste bien " + resultado.bien + " de " + datos.sensibles.length + " datos sensibles.", lista);
}

function comprobarNivel(n) {
    // Un nivel ya ganado, o una partida sin vidas, no se vuelve a corregir.
    if (vidas === 0 || document.querySelector("#nivel-" + n).classList.contains("ganado")) {
        return;
    }
    const respuesta = leerRespuesta(n);
    const tipo = NIVELES[n].tipo;
    const clave = claveRespuesta(tipo, respuesta);

    // La misma respuesta que ya falló no se vuelve a corregir:
    // se avisa y se dejan a la vista las marcas rojas anteriores.
    if (clave === respuestaFallida) {
        avisar(n, "BYTE: Es la misma respuesta",
            "Esa respuesta ya la marqué como incorrecta. Cambiá lo que está en rojo antes de volver a comprobar.");
        return;
    }

    limpiarMarcas(n);
    const vidasAntes = vidas;
    if (tipo === "vf" || tipo === "orden") {
        comprobarItems(n, respuesta);
    } else if (tipo === "texto") {
        comprobarTexto(n, respuesta);
    } else if (tipo === "multiple") {
        comprobarMultiple(n, respuesta);
    } else if (tipo === "casillas") {
        comprobarCasillas(n, respuesta);
    }
    // Si se perdió una vida, la respuesta fue incorrecta: se recuerda.
    if (vidas < vidasAntes) {
        respuestaFallida = clave;
    }
}

// --- Recorrido de la campaña ---

function irANivel(n) {
    nivelActual = n;
    errores = 0;
    respuestaFallida = null;
    if (n > 1) {
        cuerpo.classList.add("nivel-" + n + "-iniciado");
    }
    actualizarIntento(n);
    window.scrollTo(0, 0);
    document.querySelector("#titulo-nivel-" + n).focus({ preventScroll: true });
}

// Vuelve todo al inicio de la campaña (el perfil no se toca).
function reiniciarEstado() {
    vidas = VIDAS_INICIALES;
    puntaje = 0;
    gemas = 0;
    nivelActual = 0;
    errores = 0;
    puntosPorNivel = [];
    golpes = 0;
    respuestaFallida = null;
    cuerpo.classList.remove("golpe-a", "golpe-b");

    for (let n = 1; n <= TOTAL_NIVELES; n++) {
        cuerpo.classList.remove("nivel-" + n + "-iniciado", "nivel-" + n + "-ganado");
        document.querySelector("#nivel-" + n).classList.remove("ganado");
        document.querySelector("#form-l" + n).reset();  // borra lo respondido
        bloquearFormulario(n, false);
        limpiarMarcas(n);
        document.querySelector("#feedback-l" + n).classList.remove("correcto", "incorrecto", "aviso");
        document.querySelector("#puntos-l" + n).textContent = "";
        document.querySelector("#intento-l" + n).textContent = 1;
        document.querySelector("#premio-l" + n).textContent = calcularPremio(0) + " puntos";
    }
    actualizarHUD();
}

function empezarCampania() {
    reiniciarEstado();
    cuerpo.classList.add("campania-activa");  // arranca el cronómetro
    irANivel(1);
}

function mostrarGameOver() {
    cuerpo.classList.add("game-over");
    document.querySelector("#btn-reintentar").focus();
}

// Desde el Game Over o desde el certificado: vuelve a "Cómo funciona la partida".
function reiniciarCampania() {
    reiniciarEstado();
    cuerpo.classList.remove("campania-activa", "game-over");
    // El botón INICIAR NIVEL 1 está fijo abajo: se baja hasta el mapa
    // de la campaña, que es lo último de "Cómo funciona la partida".
    document.querySelector(".mapa").scrollIntoView();
    document.querySelector("#btn-iniciar-nivel1").focus({ preventScroll: true });
}

function mostrarCertificado() {
    document.querySelector("#certificado-nombre").textContent = campoNombre.value.trim();
    for (let i = 0; i < puntosPorNivel.length; i++) {
        document.querySelector(".cert-score-l" + (i + 1)).textContent = puntosPorNivel[i];
    }
    const codigo = codigoCertificado(puntosPorNivel, vidas);
    const imagenQR = document.querySelector("#qr-certificado");
    imagenQR.src = "qr/" + claveQR(puntosPorNivel) + ".png";
    imagenQR.alt = "Código QR del certificado " + codigo;
    document.querySelector("#codigo-certificado").textContent = codigo;

    // Si el estudiante todavía no eligió una fecha, se propone la de hoy.
    const campoFecha = document.querySelector("#fecha-emision");
    if (campoFecha.value === "") {
        campoFecha.value = fechaDeHoy();
    }

    cuerpo.classList.add("nivel-" + TOTAL_NIVELES + "-ganado");  // muestra el certificado y frena el reloj
    window.scrollTo(0, 0);
}

// --- Registro del jugador ---

function avatarElegido() {
    return document.querySelector('input[name="avatar"]:checked');
}

// Habilita INICIAR PARTIDA solo con nombre y avatar.
function revisarRegistro() {
    const faltan = [];
    if (campoNombre.value.trim().length < 2) {
        faltan.push("nombre (al menos 2 letras)");
    }
    if (avatarElegido() === null) {
        faltan.push("avatar");
    }
    botonIniciar.disabled = faltan.length > 0;
    if (faltan.length === 0) {
        avisoRegistro.textContent = "¡Perfil listo! Ya podés iniciar la partida.";
    } else {
        avisoRegistro.textContent = "Te falta: " + faltan.join(", ") + ".";
    }
}

function aplicarAvatar(radio) {
    const emoji = document.querySelector('label[for="' + radio.id + '"] .avatar-emoji');
    vistaAvatar.textContent = emoji.textContent;
    cuerpo.classList.add("avatar-elegido");
}

// --- Paneles de BYTE y de Recursos ---

function alternarPanel(clase, boton) {
    cuerpo.classList.toggle(clase);
    boton.setAttribute("aria-expanded", cuerpo.classList.contains(clase));
}

function cerrarPanel(clase, boton) {
    cuerpo.classList.remove(clase);
    boton.setAttribute("aria-expanded", "false");
    boton.focus();
}


/* ---------- 5. Eventos ---------- */

campoNombre.addEventListener("input", revisarRegistro);

for (const radio of radiosAvatar) {
    radio.addEventListener("change", function () {
        aplicarAvatar(radio);
        revisarRegistro();
    });
}

// INICIAR PARTIDA es el botón de envío del formulario de registro:
// también se activa con Enter en el nombre cuando el perfil está listo.
document.querySelector("#form-registro").addEventListener("submit", function (event) {
    event.preventDefault();
    revisarRegistro();
    // Sin perfil completo, o con la partida ya en marcha, no hace nada.
    if (botonIniciar.disabled || cuerpo.classList.contains("partida-activa")) {
        return;
    }
    cuerpo.classList.add("partida-activa");
    window.scrollTo(0, 0);
});

document.querySelector("#btn-editar-perfil").addEventListener("click", function () {
    cuerpo.classList.remove("partida-activa");
    campoNombre.focus();
});

// Primeros pasos: video → evidencias → reglas → Nivel 1.
document.querySelector("#btn-ir-evidencias").addEventListener("click", function () {
    cuerpo.classList.add("paso-fotos");
    window.scrollTo(0, 0);
});

document.querySelector("#btn-ir-reglas").addEventListener("click", function () {
    cuerpo.classList.add("paso-info");
    window.scrollTo(0, 0);
});

document.querySelector("#btn-iniciar-nivel1").addEventListener("click", empezarCampania);

// Un submit por nivel: se corrige sin recargar la página.
for (let n = 1; n <= TOTAL_NIVELES; n++) {
    document.querySelector("#form-l" + n).addEventListener("submit", function (event) {
        event.preventDefault();
        comprobarNivel(n);
    });
}

// Botones "ENTRAR AL NIVEL N" de las tarjetas de nivel superado.
for (let n = 2; n <= TOTAL_NIVELES; n++) {
    document.querySelector("#btn-ir-nivel-" + n).addEventListener("click", function () {
        irANivel(n);
    });
}

document.querySelector("#btn-reintentar").addEventListener("click", reiniciarCampania);
document.querySelector("#btn-jugar-de-nuevo").addEventListener("click", reiniciarCampania);

document.querySelector("#btn-imprimir").addEventListener("click", function () {
    window.print();
});

botonAyuda.addEventListener("click", function () {
    alternarPanel("ayuda-abierta", botonAyuda);
});
document.querySelector("#btn-cerrar-ayuda").addEventListener("click", function () {
    cerrarPanel("ayuda-abierta", botonAyuda);
});

botonRecursos.addEventListener("click", function () {
    alternarPanel("recursos-abiertos", botonRecursos);
});
document.querySelector("#btn-cerrar-recursos").addEventListener("click", function () {
    cerrarPanel("recursos-abiertos", botonRecursos);
});


/* ---------- 6. Inicio ----------
   Si el navegador recordó un avatar al recargar,
   se vuelve a aplicar para que la pantalla coincida. */

if (avatarElegido() !== null) {
    aplicarAvatar(avatarElegido());
}
revisarRegistro();
actualizarHUD();
