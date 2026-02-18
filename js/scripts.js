function debugLog(msg) {
  console.log(msg);
  const div = document.getElementById("debugConsole");
  if (div) {
    div.innerHTML += msg + "<br>";
    div.scrollTop = div.scrollHeight;
  }
}

let UID = null;
let UID_BASE = null;
let ROL_ACTUAL = null;

function LS_KEY(key){
  return UID ? UID + "_" + key : key;
}

let repertorios = {};
let events = {};
let asignacionesMusicos = {};
let eventosInfo = {};
let repertorioGlobal = [];
let fechaEditando = {};
let diaActual = {};
let selectedDate = null;
let fileData = {};
let favoritoActual = {};
let vipEditIndex = null;
let musicosPorInstrumento = {};
let data = null;
let selectedEventIndex = null;
let afinadorInicializado = false;
let interval = null;
let beat = 0;
let audioCtx = null;
let wasInTune = false;
let micStream = null;
let rafId = null;
let fechaActualEditando = null;
let vipGlobal = [];
let listenersIniciados = false;

firebase.auth().onAuthStateChanged(async (user) => {

  const rolSession = sessionStorage.getItem("rol");

  // 🔒 VIP MODE
  if (rolSession === "vip") {

    ROL_ACTUAL = "vip";
    UID = null;
    UID_BASE = sessionStorage.getItem("uidAdmin");

    debugLog("🔒 MODO VIP ACTIVO");
    debugLog("UID_BASE: " + UID_BASE);

    const wrapper = document.getElementById("settingsGearWrapper");
    if (wrapper) wrapper.remove();

    iniciarListenersVIP(UID_BASE);

    return;
  }

  // 👑 ADMIN MODE
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  UID = user.uid;
  UID_BASE = UID;
  ROL_ACTUAL = "admin";

  debugLog("👑 MODO ADMIN ACTIVO");
  debugLog("UID: " + UID);

  const wrapper = document.getElementById("settingsGearWrapper");
  if (wrapper) wrapper.style.display = "block";

  iniciarListeners(db.collection("usuarios").doc(UID));

  // 🔥 CARGAR VIPS AQUÍ
  await cargarVIPs();

});

function iniciarListenersVIP(uidAdmin) {

  const baseRef = db.collection("usuarios").doc(uidAdmin);

  // 🔥 EVENTOS
  baseRef.collection("eventos")
    .onSnapshot(snapshot => {
      eventosInfo = {};
      snapshot.forEach(doc => eventosInfo[doc.id] = doc.data());
      renderizarAgenda();
      renderCalendar();
    });

  // 🔥 REPERTORIOS POR DÍA
  baseRef.collection("repertorios")
  .onSnapshot(snapshot => {
    repertorios = {};
    snapshot.forEach(doc => {
      if (doc.id === "global") return; // 👈 IGNORAR GLOBAL
      repertorios[doc.id] = doc.data().canciones || [];
    });
    renderizarAgenda();
    renderCalendar();
  });

  // 🔥 REPERTORIO GLOBAL
  baseRef.collection("repertorios")
  .doc("global")
  .onSnapshot(doc => {

    if (!doc.exists) {
      console.warn("⚠ Global VIP no existe todavía");
      return;
    }

    const data = doc.data();

    if (!data || !Array.isArray(data.canciones)) {
      console.warn("⚠ Global VIP sin canciones válidas");
      return;
    }

    repertorioGlobal = data.canciones.map(c => {
      asegurarPlayCount(c);
      return c;
    });

    renderRepertorioGlobal();
    renderHome();
    renderHomeMasEscuchadas();
    renderHomeFavoritos();
    renderizarAgenda();

    debugLog("🔥 Repertorio VIP sincronizado");

  });

  // 🔥 CONFIG INSTRUMENTOS
  baseRef.collection("config")
    .doc("instrumentos")
    .onSnapshot(doc => {
      if (doc.exists) {
        musicosPorInstrumento = doc.data().data || {};
      }
    });

  // 🔥 ASIGNACIONES
  baseRef.collection("asignaciones")
    .onSnapshot(snapshot => {
      asignacionesMusicos = {};
      snapshot.forEach(doc => asignacionesMusicos[doc.id] = doc.data());
      renderizarAgenda();
    });

  // 🔥 IMPORTANT / LOBBY
  baseRef.collection("important")
    .doc("lobby")
    .onSnapshot(doc => {
      if (!doc.exists) return;

      const data = doc.data();
      document.getElementById("importantText").value = data.text || "";
      document.getElementById("importantPreview").innerHTML = data.file
        ? `<a href="${data.file}" target="_blank">📎 Archivo adjunto</a>`
        : "";
    });

  // 🔥 CALENDARIO EVENTS
  baseRef.collection("events")
    .onSnapshot(snapshot => {
      events = {};
      snapshot.forEach(doc => events[doc.id] = doc.data().lista || []);
      renderCalendar();
      renderWeeklyEvents();
    });

  // 🔥 VIP (lectura para usuarios VIP)
  baseRef.collection("vip")
    .doc("lista")
    .onSnapshot(doc => {
      if (!doc.exists) {
        vipGlobal = [];
      } else {
        vipGlobal = doc.data().usuarios || [];
      }
      renderVIPs();
      console.log("🔥 VIP sincronizado con admin");
    });

  debugLog("🔥 VIP sincronizado con admin");
}

function iniciarListeners(baseRef) {

  if (listenersIniciados) return;
  listenersIniciados = true;

  // 🔥 EVENTOS EN TIEMPO REAL
  baseRef.collection("eventos")
    .onSnapshot(snapshot => {
      eventosInfo = {};
      snapshot.forEach(doc => eventosInfo[doc.id] = doc.data());
      renderizarAgenda();
      renderCalendar();
    });

  // 🔥 REPERTORIOS POR DÍA EN TIEMPO REAL
  baseRef.collection("repertorios")
  .onSnapshot(snapshot => {
    repertorios = {};
    snapshot.forEach(doc => {
      if (doc.id === "global") return; // 👈 IGNORAR GLOBAL
      repertorios[doc.id] = doc.data().canciones || [];
    });
    renderizarAgenda();
    renderCalendar();
  });


  // 🔥 CONFIG INSTRUMENTOS
  baseRef.collection("config")
    .doc("instrumentos")
    .onSnapshot(doc => {
      if (doc.exists) musicosPorInstrumento = doc.data().data || {};
    });

  // 🔥 ASIGNACIONES
  baseRef.collection("asignaciones")
    .onSnapshot(snapshot => {
      asignacionesMusicos = {};
      snapshot.forEach(doc => asignacionesMusicos[doc.id] = doc.data());
      renderizarAgenda();
    });

  // 🔥 REPERTORIO “GLOBAL” DEL USUARIO
  baseRef.collection("repertorios")
    .doc("global")
    .onSnapshot(doc => {

      if (!doc.exists) {
        console.warn("⚠ Global no existe todavía");
        return;
      }

      if (modoEdicionActivo) return;

      const data = doc.data();

      if (!data || !Array.isArray(data.canciones)) {
        console.warn("⚠ Global sin canciones válidas, no actualizo");
        return;
      }

      repertorioGlobal = data.canciones.map(c => {
        asegurarPlayCount(c);
        return c;
      });

      renderRepertorioGlobal();
      renderHome();
      renderHomeMasEscuchadas();
      renderHomeFavoritos();
      renderizarAgenda();

      debugLog("🔥 Repertorio personal sincronizado");
    });

  // 🔥 VIP DEL USUARIO
  baseRef.collection("vip")
    .doc("lista")
    .onSnapshot(doc => {
      if (!doc.exists) {
        vipGlobal = [];
      } else {
        vipGlobal = doc.data().usuarios || [];
      }
      renderVIPs();
      debugLog("🔥 VIP personal sincronizado");
    });

  // 🔥 IMPORTANT / LOBBY DEL USUARIO
  baseRef.collection("important")
    .doc("lobby")
    .onSnapshot(doc => {
      if (!doc.exists) {
        document.getElementById("importantText").value = "";
        document.getElementById("importantPreview").innerHTML = "";
        return;
      }

      const data = doc.data();
      document.getElementById("importantText").value = data.text || "";
      document.getElementById("importantPreview").innerHTML = data.file
        ? `<a href="${data.file}" target="_blank">📎 Archivo adjunto</a>`
        : "";

      debugLog("🔥 Important personal sincronizado");
    });

  // 🔥 CALENDARIO - EVENTS
  baseRef.collection("events")
    .onSnapshot(snapshot => {
      events = {};
      snapshot.forEach(doc => events[doc.id] = doc.data().lista || []);
      renderCalendar();
      renderWeeklyEvents();
      debugLog("🔥 Events personal sincronizado: " + JSON.stringify(events));
    });
}


async function guardarEvento(fecha, dataEvento) {
  if (!UID) return;

  const baseRef = db.collection("usuarios").doc(UID);

  await baseRef
    .collection("eventos")
    .doc(fecha)
    .set(dataEvento);
}

  let paginaRepertorio = 1;
  const CANCIONES_POR_PAGINA = 10;
  let filtroRepertorio = "";  

  const modalNuevaFecha = new bootstrap.Modal(document.getElementById('modalNuevaFecha'));

  document.getElementById('btnAgregarDia').addEventListener('click', () => {
    fechaEditando = null; // 🔥 modo crear
    document.getElementById('inputFechaModal').value = '';
    document.getElementById('inputDescripcionModal').value = '';
    document.getElementById('btnEliminarFecha').classList.add('d-none');
    modalNuevaFecha.show();
  });

document.getElementById('btnGuardarFecha').addEventListener('click', async () => {

  const nuevaFecha = document.getElementById('inputFechaModal').value;
  const descripcion = document.getElementById('inputDescripcionModal').value.trim() || "Ensayo";

  if (!nuevaFecha) return alert('Seleccioná una fecha');

  if (!UID) return;

  const baseRef = db.collection("usuarios").doc(UID);

  await baseRef
    .collection("eventos")
    .doc(nuevaFecha)
    .set({
      descripcion,
      horario: "--:--",
      creado: new Date()
    });

  fechaEditando = null;
  document.activeElement?.blur();
  modalNuevaFecha.hide();
});

document.getElementById('btnEliminarFecha').addEventListener('click', async () => {

  if (!fechaEditando || !UID) return;

  const confirmar = confirm("¿Eliminar este evento?");
  if (!confirmar) return;

  const baseRef = db.collection("usuarios").doc(UID);

  await baseRef
    .collection("eventos")
    .doc(fechaEditando)
    .delete();

  fechaEditando = null;
  modalNuevaFecha.hide();
});

document.getElementById('modalMusicos')
.addEventListener('hidden.bs.modal', function () {

  // Solo re-renderizamos la agenda
  renderizarAgenda();

});

  function formatearFecha(fecha) {
    const [year, month, day] = fecha.split('-');
    return `${day}/${month}/${year}`;
  }

  function renderizarMusicos(fecha) {
    const asignacion = asignacionesMusicos[fecha];
    if (!asignacion) return '<em>No hay músicos asignados</em>';
    let html = '<ul class="list-group">';
    for (const instrumento in asignacion) {
      const musicos = asignacion[instrumento];
      html += `<li class="list-group-item"><strong>${instrumento}:</strong> ${musicos.join(', ') || '<em>ninguno</em>'}</li>`;
    }
    html += '</ul>';
    return html;
  }

  function obtenerDescripcionEvento(fecha) {
    return eventosInfo[fecha]?.descripcion || "";
  }

  function obtenerHorarioEvento(fecha) {
    return eventosInfo[fecha]?.horario || "--:--";
  }

  function clickEditarHorario(event, fecha) {
    if (!modoEdicionActivo) return;

    event.stopPropagation(); // ⛔ evita el collapse
    editarHorario(fecha);
  }

async function editarHorario(fecha) {

  if (!UID) return;

  const actual = obtenerHorarioEvento(fecha);
  const nuevo = prompt("Horario (ej: 19:30 - 22:00):", actual);
  if (!nuevo) return;

  const baseRef = db.collection("usuarios").doc(UID);

  await baseRef
    .collection("eventos")
    .doc(fecha)
    .update({
      horario: nuevo,
      actualizado: new Date()
    });

  console.log("🔥 Horario actualizado");
}

  // Función para abrir el modal y mostrar los músicos por instrumento
function abrirModalMusicos(fecha) {
  diaActual = fecha;
  fechaActualEditando = fecha
  const container = document.getElementById('bodyModalMusicos');
  const clave = fecha;

  container.innerHTML = `
    <div class="modal-bloque">
      <div class="modal-bloque-header">Instrumentos Disponibles</div>
      ${generarBotonesInstrumentos(clave)}
    </div>
    <div id="tbody-${idDomSafe(clave)}" class="d-flex flex-column gap-2"></div>
  `;

  const instrumentosAsignados = asignacionesMusicos[clave] || {};
  
  for (const instrumento in instrumentosAsignados) {
    // 🛡️ Validación extra: Solo dibuja si el instrumento existe en la lista maestra
    if (musicosPorInstrumento.hasOwnProperty(instrumento)) {
      agregarFilaMusico(clave, instrumento, instrumentosAsignados[instrumento]);
    } else {
      // Opcional: Limpiar basura si se encuentra algo que no debería estar
      delete asignacionesMusicos[clave][instrumento];
    }
  }

  const modal = bootstrap.Modal.getOrCreateInstance(
      document.getElementById('modalMusicos')
    );
    modal.show();

}

// Función para generar botones para cada instrumento
function generarBotonesInstrumentos(clave) {
  return Object.keys(musicosPorInstrumento).map(instrumento => `
    <button class="btn btn-sm btn-instrumento me-2 mb-2"
      onclick="agregarFilaMusico('${clave}', '${instrumento}')">
      ➕ ${instrumento}
    </button>
  `).join('');
}

// Función para agregar una fila en el modal para un instrumento 
function agregarFilaMusico(clave, instrumento, seleccionados = []) {

    const filaId = idDomSafe(`fila-${clave}_${instrumento}`);
    if (document.getElementById(filaId)) return;
  
  const tbody = document.getElementById(`tbody-${idDomSafe(clave)}`);
  const fila = document.createElement("div");
    fila.className = "modal-bloque";
  const divId = idDomSafe(`musicos-${clave}_${instrumento}`);

  fila.id = filaId;

  fila.innerHTML = `
    <td>
      <div class="mb-1 d-flex justify-content-between align-items-center">
        <select class="form-select w-75" onchange="agregarMusicoSeleccionadoFila(this, '${clave}', '${instrumento}')">
          <option value="">➕ Agregar músico</option>
          ${(musicosPorInstrumento[instrumento] || []).map(m => `<option value="${m}">${m}</option>`).join('')}
        </select>
        <button class="btn btn-sm btn-outline-danger ms-2" onclick="eliminarInstrumentoDeFecha('${clave}', '${instrumento}')">❌</button>
      </div>
      <div id="${divId}" class="d-flex flex-wrap gap-2 mt-2"></div>
      <div class="instrumento-label">${instrumento}</div>
    </td>
  `;
  tbody.appendChild(fila);

  // Rellenar si hay músicos ya asignados
  seleccionados.forEach(musico => {
    agregarBadgeMusico(divId, musico, clave, instrumento);
  });
}

// Función para agregar un músico seleccionado en la fila
function agregarMusicoSeleccionadoFila(select, clave, instrumento) {
  const valor = select.value;
  if (!valor) return;

  const divId = idDomSafe(`musicos-${clave}_${instrumento}`);
  agregarBadgeMusico(divId, valor, clave, instrumento);
  select.value = ""; // Limpiar el campo de selección
}

function abrirEditorMusicosPorInstrumento() {
  const contenedor = document.getElementById('bodyEditorInstrumentos');
  contenedor.innerHTML = '';

  Object.entries(musicosPorInstrumento).forEach(([instrumento, musicos]) => {
    const bloque = document.createElement('div');
    bloque.className = "modal-bloque";

    bloque.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-2">
        <input type="text" class="form-control form-control-sm input-instrumento"
               value="${instrumento}">
        <button class="btn btn-sm btn-outline-danger ms-2"
                onclick="eliminarInstrumentoEditor(this)">
          ❌
        </button>
      </div>

      <div class="d-flex flex-wrap gap-2">
        ${musicos.map(m => `
          <div class="input-group mb-1" style="max-width: 260px;">
            <input type="text" class="form-control musico-input" value="${m}">
            <button class="btn btn-outline-danger btn-sm eliminar-musico">❌</button>
          </div>
        `).join('')}

        <div class="input-group mb-1" style="max-width: 260px;">
          <input type="text" class="form-control nuevo-musico" placeholder="Agregar músico...">
          <button class="btn btn-outline-success btn-sm agregar-musico">➕</button>
        </div>
      </div>
    `;

    // eliminar músico
    bloque.querySelectorAll('.eliminar-musico').forEach(btn => {
      btn.onclick = () => btn.closest('.input-group').remove();
    });

    // agregar músico
    bloque.querySelector('.agregar-musico').onclick = (e) => {
      const input = bloque.querySelector('.nuevo-musico');
      const nombre = input.value.trim();
      if (!nombre) return;

      const nuevo = document.createElement('div');
      nuevo.className = 'input-group mb-1';
      nuevo.style.maxWidth = '260px';
      nuevo.innerHTML = `
        <input type="text" class="form-control musico-input" value="${nombre}">
        <button class="btn btn-outline-danger btn-sm eliminar-musico">❌</button>
      `;
      nuevo.querySelector('.eliminar-musico').onclick = () => nuevo.remove();

      bloque.querySelector('.agregar-musico').parentElement.before(nuevo);
      input.value = '';
    };

    contenedor.appendChild(bloque);
  });

// NUEVO instrumento
const formNuevo = document.createElement('div');
  formNuevo.className = 'border-top pt-3 mt-3';
  formNuevo.innerHTML = `
    <h6>➕ Nuevo instrumento</h6>
    <div class="input-group" style="max-width:300px;">
      <input type="text" id="nuevoInstrumentoInput" class="form-control">
      <button class="btn btn-outline-primary" id="btnAgregarInstrumento">Agregar</button>
    </div>
  `;
  contenedor.appendChild(formNuevo);

  document.getElementById('btnAgregarInstrumento').onclick = async () => {

    const input = document.getElementById('nuevoInstrumentoInput');
    let nombre = input.value.trim();

    if (!nombre) return alert("Nombre vacío");

    // 🧹 Normalizar nombre
    nombre = nombre
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/^./, l => l.toUpperCase());

    // 🔥 1️⃣ Sincronizar lo que está en pantalla
    const bloques = document.querySelectorAll('#bodyEditorInstrumentos .modal-bloque');
    const nuevoMapa = {};

    bloques.forEach(bloque => {
      let nom = bloque.querySelector('.input-instrumento')?.value.trim();
      if (!nom) return;

      nom = nom
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/^./, l => l.toUpperCase());

      const musicos = Array.from(bloque.querySelectorAll('.musico-input'))
        .map(i => i.value.trim())
        .filter(v => v);

      const musicosNormalizados = [...new Set(
        musicos.map(m =>
          m.toLowerCase()
            .replace(/\s+/g, ' ')
            .replace(/^./, l => l.toUpperCase())
        )
      )].sort();

      nuevoMapa[nom] = musicosNormalizados;
    });

    musicosPorInstrumento = nuevoMapa;

    // 🚫 Evitar duplicados
    const existe = Object.keys(musicosPorInstrumento)
      .some(i => i.toLowerCase() === nombre.toLowerCase());

    if (existe) return alert("Ese instrumento ya existe");

    // ➕ 2️⃣ Agregar instrumento vacío
    musicosPorInstrumento[nombre] = [];

    // 📚 Ordenar alfabéticamente
    musicosPorInstrumento = Object.fromEntries(
      Object.entries(musicosPorInstrumento)
        .sort(([a],[b]) => a.localeCompare(b))
    );

    try {

      // ☁️ Guardar en Firestore
      const baseRef = db.collection("usuarios").doc(UID);

      await baseRef
        .collection("config")
        .doc("instrumentos")
        .set({
          data: musicosPorInstrumento,
          actualizado: new Date()
        });

    } catch (error) {
      console.error("Error guardando instrumento:", error);
      alert("Error al guardar en la nube");
      return;
    }

    input.value = "";

    // 🔄 Redibujar modal
    abrirEditorMusicosPorInstrumento();
  };

  const modal = bootstrap.Modal.getOrCreateInstance(
    document.getElementById('modalEditorInstrumentos')
  );
  modal.show();

}

function eliminarInstrumentoEditor(btn) {
  if (!confirm("¿Eliminar instrumento completo?")) return;
  btn.closest('.modal-bloque').remove();
}

document.getElementById('guardarInstrumentosBtn').onclick = async () => {

  if (!UID) return;

  const bloques = document.querySelectorAll('#bodyEditorInstrumentos .modal-bloque');
  const nuevoMapa = {};

  bloques.forEach(bloque => {
    const nombre = bloque.querySelector('.input-instrumento')?.value.trim();
    if (!nombre) return;

    const musicos = Array.from(bloque.querySelectorAll('.musico-input'))
      .map(i => i.value.trim())
      .filter(v => v);

    nuevoMapa[nombre] = musicos;
  });

  musicosPorInstrumento = nuevoMapa;

  const baseRef = db.collection("usuarios").doc(UID);

  await baseRef
    .collection("config")
    .doc("instrumentos")
    .set({
      data: musicosPorInstrumento,
      actualizado: new Date()
    });

  const modalElem = document.getElementById('modalEditorInstrumentos');
  const instancia = bootstrap.Modal.getInstance(modalElem);
  if (instancia) instancia.hide();
};

async function eliminarInstrumentoGlobal(nombreInstrumento) {

  if (!UID) return;
  if (!confirm(`¿Eliminar "${nombreInstrumento}" de todos los eventos?`)) return;

  const baseRef = db.collection("usuarios").doc(UID);

  // 1️⃣ Eliminar del mapa local
  delete musicosPorInstrumento[nombreInstrumento];

  await baseRef
    .collection("config")
    .doc("instrumentos")
    .set({
      data: musicosPorInstrumento,
      actualizado: new Date()
    });

  // 2️⃣ Eliminar de todas las fechas
  const asignacionesSnap = await baseRef.collection("asignaciones").get();

  for (const doc of asignacionesSnap.docs) {
    if (doc.data()[nombreInstrumento]) {
      await baseRef
        .collection("asignaciones")
        .doc(doc.id)
        .update({
          [nombreInstrumento]: firebase.firestore.FieldValue.delete()
        });
    }
  }

  alert("Instrumento eliminado correctamente.");
}


// Función para agregar el badge de un músico al div correspondiente
function agregarBadgeMusico(divId, valor, clave, instrumento) {
  const lista = document.getElementById(divId);
  const badge = document.createElement("div");
  badge.className = "badge-musico d-flex align-items-center gap-2";

  const span = document.createElement("span");
  span.textContent = valor;

  // Permitir edición con doble clic
  span.addEventListener('dblclick', () => {
    const nuevoNombre = prompt("Editar nombre del músico:", span.textContent);
    if (nuevoNombre && nuevoNombre.trim()) {
      span.textContent = nuevoNombre.trim();
      actualizarAsignacion(clave, instrumento);
    }
  });

  // Botón eliminar con clase de edición
  const boton = document.createElement("button");
  boton.className = "btn btn-sm btn-close ms-2 boton-edicion d-none";
  boton.onclick = () => {
    badge.remove();
    actualizarAsignacion(clave, instrumento);
  };

  badge.appendChild(span);
  badge.appendChild(boton);
  lista.appendChild(badge);

  actualizarAsignacion(clave, instrumento);
}

async function actualizarAsignacion(fecha, instrumento) {

  if (!UID) return;

  const divId = idDomSafe(`musicos-${fecha}_${instrumento}`);
  const badges = document.querySelectorAll(`#${divId} span`);

  const lista = Array.from(badges).map(b => b.textContent);

  const baseRef = db.collection("usuarios").doc(UID);

  await baseRef
    .collection("asignaciones")
    .doc(fecha)
    .set({
      [instrumento]: lista
    }, { merge: true });
}

// Función para eliminar un instrumento de la fecha seleccionada
async function eliminarInstrumentoDeFecha(clave, instrumento) {

  if (!UID) return;

  if (!confirm(`¿Eliminar "${instrumento}" de la fecha ${formatearFecha(clave)}?`)) return;

  try {

    const baseRef = db.collection("usuarios").doc(UID);

    await baseRef
      .collection("asignaciones")
      .doc(clave)
      .update({
        [instrumento]: firebase.firestore.FieldValue.delete()
      });

    // eliminar del DOM
    const filaId = idDomSafe(`fila-${clave}_${instrumento}`);
    const fila = document.getElementById(filaId);
    if (fila) fila.remove();

    console.log("🔥 Instrumento eliminado correctamente");

  } catch (error) {
    console.error("Error eliminando instrumento:", error);
    alert("No se pudo eliminar el instrumento");
  }
}

// Guardar los cambios de los músicos asignados
document.getElementById('guardarMusicosBtn')
.addEventListener('click', async () => {

  if (!UID) return;

  try {

    const baseRef = db.collection("usuarios").doc(UID);

    await baseRef
      .collection("asignaciones")
      .doc(fechaActualEditando)
      .set(asignacionesMusicos[fechaActualEditando], { merge: true });

    bootstrap.Modal
      .getInstance(document.getElementById('modalMusicos'))
      .hide();

    console.log("🔥 Asignación guardada");

  } catch (error) {
    console.error("Error guardando músicos:", error);
    alert("No se pudieron guardar los cambios");
  }
});

function renderizarRepertorio(fecha) {
  
  const lista = repertorios[fecha];
  console.log("🔹 renderizarRepertorio", fecha, lista);
  if (!lista || lista.length === 0) return '<em>No hay repertorio asignado</em>';

  let html = '<ul class="list-group">';

  lista.forEach((cancion, i) => {
    const real = repertorioGlobal[cancion.indexReal];
    if (!real) return;

    html += `
      <li class="list-group-item d-flex justify-content-between align-items-center">
        <div>
          <strong>${real.titulo}</strong>
          ${real.tonalidad ? `<small class="ms-2" style="color:#00cfff;">(${real.tonalidad})</small>` : ''}
        </div>

        <div class="d-flex align-items-center gap-2">
          ${real.youtube ? `<button class="btn btn-sm btn-soft-primary" onclick="abrirYoutubeEnModal('${real.youtube}', ${cancion.indexReal})">▶️</button>` : ''}
          ${real.letra ? `<button class="btn btn-sm btn-soft-secondary" onclick="window.open('${real.letra}', '_blank')">📄</button>` : ''}

          <button class="btn btn-sm"
            onclick="toggleFavorito(${cancion.indexReal})"
            title="Favorito">
            ${repertorioGlobal[cancion.indexReal]?.favorito ? "⭐" : "☆"}
          </button>

          <!-- ❌ SOLO EN MODO EDICIÓN -->
          <button class="btn btn-sm btn-delete-song boton-edicion"
            onclick="quitarCancionDelDia(event, '${fecha}', ${i}, this)">
            ❌
          </button>
        </div>
      </li>
    `;
  });

  html += '</ul>';
  return html;
}

function abrirModalRepertorio(fecha) {
  diaActual = fecha;
  const container = document.getElementById("bodyModalRepertorio");

  const cancionesGlobal = repertorioGlobal;
  const cancionesDia = repertorios[fecha] || [];

  if (!cancionesGlobal || cancionesGlobal.length === 0) {
    container.innerHTML = "<em>No hay canciones en el repertorio general</em>";
    return;
  }

  container.innerHTML = `
    <ul class="list-group">
      ${cancionesGlobal.map((c, i) => {

        // ✅ CLAVE: verificar por indexReal
        const yaAgregada = cancionesDia.some(
          cd => cd.indexReal === i
        );

        return `
          <li class="list-group-item d-flex justify-content-between align-items-center">
            <div>
              <strong>${c.titulo}</strong>
              ${c.tonalidad ? `<small class="ms-2">(${c.tonalidad})</small>` : ""}
            </div>

            <div>
              ${
                yaAgregada
                  ? `<span class="badge bg-success">✔</span>`
                  : `<button class="btn btn-sm btn-app"
                        onclick="agregarCancionADia(event, ${i}, this)">
                        ➕
                    </button>`
              }
            </div>
          </li>
        `;
      }).join("")}
    </ul>
  `;

  const modal = bootstrap.Modal.getOrCreateInstance(
    document.getElementById("modalRepertorio")
  );
  modal.show();
}

async function agregarCancionADia(event, indexGlobal, boton){

  if(!modoEdicionActivo){
    alert("Activá modo edición para guardar cambios");
    return;
  }

  if (!UID) return;

  event.preventDefault();
  event.stopPropagation();

  if(!repertorios[diaActual]) repertorios[diaActual] = [];

  const existe = repertorios[diaActual]
    .some(c => c.indexReal === indexGlobal);

  if(existe){
    alert("Esa canción ya está en el repertorio del día");
    return;
  }

  repertorios[diaActual].push({
    indexReal: indexGlobal
  });

  try {

    const baseRef = db.collection("usuarios").doc(UID);

    await baseRef
      .collection("repertorios")
      .doc(diaActual)
      .set({
        canciones: repertorios[diaActual],
        actualizado: new Date()
      }, { merge: true });

    if(boton){
      boton.outerHTML = `<span class="badge bg-success">✔</span>`;
    }

    debugLog("🔥 Canción agregada correctamente");

  } catch (error) {
    console.error("Error guardando repertorio:", error);
    alert("No se pudo guardar en la nube");
  }
}

function agregarCancion() {
  const container = document.getElementById('bodyModalRepertorio');

  const nuevoBloque = document.createElement('div');
  // Eliminamos 'bloque-cancion' y 'position-relative' de aquí
  nuevoBloque.className = 'modal-bloque'; 
  nuevoBloque.innerHTML = `
    <div class="song-row"> 
        <div class="row g-2 song-input"> 
            <div class="col-md-3">
                <label class="modal-bloque-header">Título</label>
                <input type="text" class="form-control titulo" placeholder="Título" />
            </div>
            <div class="col-md-2">
              <label class="modal-bloque-header">Tonalidad</label>
              <input type="text" class="form-control tonalidad"
                placeholder="Tonalidad"
                style="color:#f1f5f9; background-color:#1e293b; border:1px solid #3b82f6;" />
            </div>
            <div class="col-md-3">
                <label class="modal-bloque-header">Link YouTube</label>
                <input type="url" class="form-control youtube" placeholder="URL YouTube" />
            </div>
            <div class="col-md-4">
                <label class="modal-bloque-header">Link Letra/tablatura</label>
                <input type="url" class="form-control letra" placeholder="URL Letra/Tab" />
            </div>
        </div>
        <div>
          <!-- Usamos this.closest('.modal-bloque') para eliminar el contenedor correcto -->
          <button class="btn btn-delete-song" onclick="this.closest('.modal-bloque').remove()" aria-label="Eliminar canción">
              <i class="bi bi-trash"></i> 
          </button>
        </div>
    </div>
  `;

  // Aseguramos que se inserta antes del botón de agregar canción si existe
  const botonAgregar = container.querySelector('button.btn-app-outline.mt-3');
  if (botonAgregar) {
    container.insertBefore(nuevoBloque, botonAgregar);
  } else {
    container.appendChild(nuevoBloque);
  }
}

document.getElementById('guardarRepertorioBtn').addEventListener('click', () => {
  if(!modoEdicionActivo){
    alert("Activá modo edición para guardar cambios");
    return;
  }

  // 🔥 sincroniza lo que está escrito en pantalla
  sincronizarRepertorioDesdeInputs();

  guardarRepertorioGlobal();
  renderRepertorioGlobal();

  // ✅ QUITAR FOCO antes de cerrar el modal (SOLUCIÓN)
  document.activeElement?.blur();

  bootstrap.Modal.getInstance(
    document.getElementById('modalRepertorio')
  ).hide();
});

function guardarDiaAbierto(fecha){
  localStorage.setItem(LS_KEY("DIA_ABIERTO"), fecha);
}

function renderizarAgenda() {
  const agenda = document.getElementById('agenda');
  agenda.querySelectorAll('.dia').forEach(e => e.remove());

  Object.keys(eventosInfo).forEach(fecha => {
    const fechaId = fecha.replace(/-/g, '_');

    const divDia = document.createElement('div');
    divDia.classList.add('dia', 'mt-4');

    divDia.innerHTML = `
      <div class="d-flex align-items-stretch gap-2 mb-2 w-100">

  <!-- BOTÓN COLLAPSE -->
  <button class="btn day-pill px-4 py-3 flex-fill"
    data-bs-toggle="collapse"
    data-bs-target="#contenedor-${fechaId}"
    aria-controls="contenedor-${fechaId}"
    onclick="guardarDiaAbierto('${fecha}')">

    <div class="d-flex align-items-center w-100">
      <div class="fw-semibold text-nowrap data-fecha="${fecha}" onclick="editarFechaInline(event, '${fecha}')">
        📅 ${formatearFecha(fecha)}
      </div>

      <span class="evento-descripcion d-block text-truncate"
      data-fecha="${fecha}"
      contenteditable="false"
      onclick="activarEdicionDescripcion(event, this)"
      onblur="guardarDescripcionInline(this)"
      onkeydown="manejarEnterDescripcion(event, this)">
  ${obtenerDescripcionEvento(fecha)}
</span>

      </div>

      <span class="evento-horario text-nowrap"
        data-fecha="${fecha}"
        contenteditable="false"
        onclick="activarEdicionHorario(event, this, '${fecha}')"
        onblur="guardarHorarioInline(this, '${fecha}')"
        onkeydown="manejarEnterHorario(event, this)">
        ⏰ ${obtenerHorarioEvento(fecha)}
      </span>
    </div>
  </button>
  </div>

</div>

      <div id="contenedor-${fechaId}" class="collapse mt-3">
        <div class="collapse-inner-fixed">
          <div class="row">
          <div class="col-md-6 mb-3">
            <div class="card h-100">
              <div class="card-header d-flex justify-content-between align-items-center">
                <strong>🎤 Músicos</strong>
                <div class="d-flex gap-2">
                
                  <button class="btn btn-app boton-edicion"
                    onclick="abrirModalMusicos('${fecha}')">
                    Editar músicos
                  </button>
                  <button class="btn btn-app-outline boton-edicion"
                    onclick="abrirEditorMusicosPorInstrumento()">
                    Editar instrumento
                  </button>
                </div>
              </div>
              <div class="card-body" id="musicos_${fechaId}">
                ${renderizarMusicos(fecha)}
              </div>
            </div>
          </div>

          <div class="col-md-6 mb-3">
            <div class="card h-100">
              <div class="card-header d-flex justify-content-between align-items-center">
                <strong>🎼 Repertorio</strong>
                <button class="btn btn-app boton-edicion"
                  onclick="abrirModalRepertorio('${fecha}')">
                  Editar
                </button>
              </div>
              <div class="card-body" id="repertorio_${fechaId}">
                ${renderizarRepertorio(fecha)}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    agenda.appendChild(divDia);
  });

  // 🔥 REABRIR EL DÍA QUE ESTABA ABIERTO
  let diaAbierto = localStorage.getItem(LS_KEY("DIA_ABIERTO")) || "";
    if (typeof diaAbierto === "string" && diaAbierto !== "") {
    const id = diaAbierto.replace(/-/g, '_');
    const colapsable = document.getElementById(`contenedor-${id}`);
    if (colapsable) {
      new bootstrap.Collapse(colapsable, { show: true });
    }
  }
}

  
  function editarEvento(fecha) {
  if (!modoEdicionActivo) return;

  fechaEditando = fecha;

  document.getElementById('inputFechaModal').value = fecha;
  document.getElementById('inputDescripcionModal').value =
    eventosInfo[fecha]?.descripcion || '';

  document.getElementById('btnEliminarFecha').classList.remove('d-none');

  modalNuevaFecha.show();
}

function activarEdicionDescripcion(event, el) {
  if (!modoEdicionActivo) return;

  event.stopPropagation(); // no colapsar
  el.contentEditable = true;
  el.focus();
}

async function guardarDescripcionInline(el) {

  if (!UID) return;

  el.contentEditable = false;

  const fecha = el.dataset.fecha;
  const texto = el.textContent.trim() || "Ensayo";

  const baseRef = db.collection("usuarios").doc(UID);

  await baseRef
    .collection("eventos")
    .doc(fecha)
    .update({
      descripcion: texto,
      actualizado: new Date()
    });
}

function manejarEnterDescripcion(e, el) {
  if (e.key === "Enter") {
    e.preventDefault();
    el.blur();
  }
}

function editarFechaInline(event, fecha) {
  if (!modoEdicionActivo) return;

  event.stopPropagation(); // evita collapse

  fechaEditando = fecha;

  document.getElementById('inputFechaModal').value = fecha;
  document.getElementById('inputDescripcionModal').value =
    eventosInfo[fecha]?.descripcion || "";
  document.getElementById('btnEliminarFecha').classList.remove('d-none');
  modalNuevaFecha.show();
}

function activarEdicionHorario(event, el, fecha) {
  if (!modoEdicionActivo) return;

  event.stopPropagation(); // ⛔ no colapsa

  // Activar edición
  el.contentEditable = true;
  el.focus();

  // Cursor al final
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

function manejarEnterHorario(e, el) {
  if (e.key === "Enter") {
    e.preventDefault();
    el.blur(); // fuerza guardado
  }
}

async function guardarHorarioInline(el, fecha) {

  if (!UID) return;
  if (!modoEdicionActivo) return;

  el.contentEditable = false;

  let texto = el.textContent.replace("⏰", "").trim();
  if (!texto) texto = "--:--";

  const baseRef = db.collection("usuarios").doc(UID);

  await baseRef
    .collection("eventos")
    .doc(fecha)
    .update({
      horario: texto,
      actualizado: new Date()
    });
}

async function eliminarFecha(fecha) {

  if (!UID) return;

  if (!confirm(
    `¿Eliminar ${formatearFecha(fecha)}?\n\nSe borrará todo el contenido.`
  )) return;

  const baseRef = db.collection("usuarios").doc(UID);

  await baseRef.collection("eventos").doc(fecha).delete();
  await baseRef.collection("asignaciones").doc(fecha).delete();
  await baseRef.collection("repertorios").doc(fecha).delete();

  console.log("🔥 Fecha eliminada correctamente");
}

function idDomSafe(texto) {
  return texto.replace(/\W+/g, '_');
}

async function abrirYoutubeEnModal(url, index) {

  console.log("---- CLICK REPRODUCIR ----");
  console.log("UID_BASE:", UID_BASE);
  console.log("repertorioGlobal existe?", !!repertorioGlobal);
  console.log("cantidad canciones:", repertorioGlobal?.length);
  console.log("index recibido:", index);

  if (!repertorioGlobal || repertorioGlobal.length === 0) {
    console.warn("⚠ BLOQUEADO: repertorio vacío");
    return;
  }

  if (!repertorioGlobal[index]) {
    console.warn("⚠ BLOQUEADO: index no existe");
    return;
  }

  const videoId = extraerIdYoutube(url);
  if (!videoId) return;

  // Incrementar contador de reproducciones local
  repertorioGlobal[index].plays = (repertorioGlobal[index].plays || 0) + 1;

  // 🔒 Verificar UID_BASE antes de guardar
  if (!UID_BASE) {
    console.error("❌ UID_BASE no definido. No se puede guardar repertorio.");
  } else if (!modoEdicionActivo) { 
    // 🔒 Solo guardar si NO está activo modo edición
    try {
      const baseRef = db.collection("usuarios").doc(UID_BASE);
      await baseRef
        .collection("repertorios")
        .doc("global")
        .set({
          canciones: repertorioGlobal,
          actualizado: new Date()
        }, { merge: true });
      console.log("🔥 Guardado correcto. Total canciones:", repertorioGlobal.length);
    } catch (e) {
      console.error("❌ Error guardando repertorio en Firestore:", e);
    }
  } else {
    console.log("⚠ Modo edición activo. No se guarda en Firestore.");
  }

  // Reproducir video
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  document.getElementById("youtubeFrame").src = embedUrl;

  new bootstrap.Modal(
    document.getElementById("modalYoutubePlayer")
  ).show();
}

function cerrarYoutubeModal() {
  document.getElementById("youtubeFrame").src = ""; // Detiene el video
}

function extraerIdYoutube(url) {
  if (!url) return null;

  if (url.includes("v=")) {
    return url.split("v=")[1].split("&")[0];
  }

  if (url.includes("youtu.be/")) {
    return url.split("youtu.be/")[1].split("?")[0];
  }

  return null;
}

let modoEdicionActivo = false;

document.addEventListener("DOMContentLoaded", () => {
  actualizarBotonEdicion();
});

function activarModoEdicion() {
  modoEdicionActivo = true;
  document.body.classList.add('modo-edicion');

  actualizarEstadoImportant();
  actualizarBuscadorYoutubeGlobal();
  renderRepertorioGlobal();
  renderCalendar();

  actualizarBotonEdicion(); // 👈
}

function desactivarModoEdicion() {
  sincronizarRepertorioDesdeInputs();
  guardarRepertorioGlobal();

  modoEdicionActivo = false;
  document.body.classList.remove('modo-edicion');

  actualizarEstadoImportant();
  actualizarBuscadorYoutubeGlobal();
  renderRepertorioGlobal();

  actualizarBotonEdicion(); // 👈
  renderCalendar();

}

function actualizarBotonEdicion() {
  if (modoEdicionActivo) {
    btnToggleEdicion.innerHTML = `
      <i class="bi bi-unlock-fill"></i> Desactivar edición
    `;
    btnToggleEdicion.title = "Salir del modo edición";
  } else {
    btnToggleEdicion.innerHTML = `
      <i class="bi bi-lock-fill"></i> Activar edición
    `;
    btnToggleEdicion.title = "Entrar al modo edición";
  }
}

// Función para validar si una URL es válida
function isValidURL(url) {
  const pattern = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i;
  return pattern.test(url);
}

// CALENDARIO*********************************************************************************************CALENDARIO

function showSection(section) {
  document.querySelectorAll(".sidebar-link").forEach(link => {
    link.classList.remove("active");
  });

  const activeLink = document.querySelector(
    `.sidebar-link[data-section="${section}"]`
  );
  if (activeLink) activeLink.classList.add("active");
  
  document.getElementById("homeSection").style.display = "none";
  document.getElementById("lobbySection").style.display = "none";
  document.getElementById("agendaSection").style.display = "none";
  document.getElementById("calendarSection").style.display = "none";
  document.getElementById("repertorioSection").style.display = "none";
  document.getElementById("afinadorSection").style.display = "none";
  document.getElementById("metronomoSection").style.display = "none";

  // 🔒 ocultar siempre el botón
  document.getElementById("btnAgregarDia").classList.add("d-none");

  if (section === "home") {
    document.getElementById("homeSection").style.display = "block";
    renderHome?.(); // opcional, si existe
  }

  if (section === "lobby") {
    document.getElementById("lobbySection").style.display = "block";
    renderWeeklyEvents();
    actualizarEstadoImportant();
  }

  if (section === "agenda") {
    document.getElementById("agendaSection").style.display = "block";

    // ✅ SOLO en agenda
    document.getElementById("btnAgregarDia").classList.remove("d-none");
  }

  if (section === "calendario") {
    document.getElementById("calendarSection").style.display = "block";
    renderCalendar();
  }

  if (section === "afinador") {
    afinadorSection.style.display = "flex";
    initAfinador();
  }

  if(section !== "afinador"){
    detenerAfinador();
  }

  if (section === "metronomo") {
    metronomoSection.style.display = "flex";
    initMetronomo();
  }

  if (section !== "metronomo") {
    detenerMetronomo();
  }

  if (section === "repertorio") {
    document.getElementById("repertorioSection").style.display = "block";
    renderRepertorioGlobal();
  }

}

function detenerAfinador(){
  if(micStream){
    micStream.getTracks().forEach(track => track.stop());
    micStream = null;
  }

  if(audioCtx){
    audioCtx.close();
    audioCtx = null;
  }

  if(rafId){
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  wasInTune = false;
}

function detenerMetronomo(){
  if(interval){
    clearInterval(interval);
    interval = null;
  }

  if(audioCtx){
    audioCtx.close();
    audioCtx = null;
  }

  beat = 0;
}

let date = new Date();

function renderCalendar() {
  const monthYear = document.getElementById("monthYear");
  const daysContainer = document.getElementById("calendarDays");

  const year = date.getFullYear();
  const month = date.getMonth();

  monthYear.textContent = date
    .toLocaleString("es-ES", { month: "long", year: "numeric" })
    .toUpperCase();

  daysContainer.innerHTML = "";

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // espacios vacíos
  for (let i = 0; i < firstDay; i++) {
    daysContainer.innerHTML += `<div class="day"></div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const fullDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dayEvents = events[fullDate]

    let eventosHTML = "";

    if (Array.isArray(dayEvents) && dayEvents.length > 0) {
      const MAX_EVENTOS = 2;

      eventosHTML = dayEvents
        .slice(0, MAX_EVENTOS)
        .map(e =>
          `<div class="event">🕒 ${e.time || ""} ${e.text || ""}</div>`
        )
        .join("");

      if (dayEvents.length > MAX_EVENTOS) {
        eventosHTML += `
          <div class="event more">
            +${dayEvents.length - MAX_EVENTOS} más
          </div>
        `;
      }
    }

    daysContainer.innerHTML += `
      <div class="day ${modoEdicionActivo ? 'editable' : ''}"
        onclick="${modoEdicionActivo
          ? `openModal('${fullDate}')`
          : `verEvento('${fullDate}')`}">
        <strong>${d}</strong>
        ${eventosHTML}
      </div>
    `;
  }
}

function clickEvento(ev, fecha, index) {
  ev.stopPropagation(); // 🚫 evita que se dispare el click del día

  selectedEventIndex = index;
  fechaEditando = fecha;

  if (!modoEdicionActivo) {
    verEvento(fecha, index);
    return;
  }

  const evento = events[fecha][index];

  document.getElementById('inputFechaModal').value = fecha;
  document.getElementById('inputDescripcionModal').value = evento.text || '';
  document.getElementById('inputHoraModal').value = evento.time || '';

  document.getElementById('btnEliminarFecha').classList.remove('d-none');

  modalNuevaFecha.show();
}

function clickDiaCalendario(fecha) {

  const lista = events[fecha] || [];

  // 🔒 fuera de modo edición → solo ver
  if (!modoEdicionActivo) {
    if (lista.length) {
      verEvento(fecha);
    }
    return;
  }

  // ✏️ modo edición
  resetModalCalendario();
  selectedDate = fecha;

  if (lista.length === 0) {
    // ➕ NO hay eventos → modal vacío (crear)
    mostrarFormularioEvento();
  } else {
    // 📋 HAY eventos → mostrar lista editable
    mostrarListaEditable(fecha);
  }

  bootstrap.Modal.getOrCreateInstance(
    document.getElementById("eventModal")
  ).show();
}

function verEvento(fecha) {
  const lista = events[fecha];
  if (!Array.isArray(lista) || lista.length === 0) return;

  resetModalCalendario();

  const contenedor = document.getElementById("eventList");
  contenedor.innerHTML = "";

  lista.forEach(e => {
    contenedor.innerHTML += `
      <div class="border rounded p-2 mb-2">
        <strong>🕒 ${e.time || "--:--"}</strong>
        <div>${e.text}</div>
      </div>
    `;
  });

  document.getElementById("vistaListaEventos").classList.remove("d-none");

  bootstrap.Modal.getOrCreateInstance(
    document.getElementById("eventModal")
  ).show();
}

function openModal(fecha) {
  if (!modoEdicionActivo) return;

  resetModalCalendario();
  selectedDate = fecha;

  const lista = events[fecha] || [];

  if (lista.length === 0) {
    // ➕ agregar nuevo
    agregarEventoNuevo(fecha);
  } else {
    mostrarListaEditable(fecha);
  }

  bootstrap.Modal.getOrCreateInstance(
    document.getElementById("eventModal")
  ).show();
}

function editarEventoCalendar(fecha, index) {
  resetModalCalendario();

  selectedDate = fecha;
  selectedEventIndex = index;

  const evento = events[fecha][index];

  document.getElementById("eventTime").value = evento.time || "";
  document.getElementById("eventText").value = evento.text || "";

  document.getElementById("vistaFormularioEvento").classList.remove("d-none");
  document.getElementById("btnGuardarEvento").classList.remove("d-none");
  document.getElementById("btnEliminarEvento").classList.remove("d-none");
}

function agregarEventoNuevo(fecha) {
  resetModalCalendario();

  selectedDate = fecha;
  selectedEventIndex = null;

  document.getElementById("vistaFormularioEvento").classList.remove("d-none");
  document.getElementById("btnGuardarEvento").classList.remove("d-none");
}

function mostrarListaEditable(fecha) {
  const contenedor = document.getElementById("eventList");
  contenedor.innerHTML = "";

  events[fecha].forEach((e, index) => {
    contenedor.innerHTML += `
      <div class="border rounded p-2 mb-2 d-flex justify-content-between align-items-center">
        <div>
          <strong>🕒 ${e.time || "--:--"}</strong>
          <div>${e.text}</div>
        </div>

        <button class="btn btn-sm btn-outline-primary"
          onclick="editarEventoCalendar('${fecha}', ${index})">
          ✏️ Editar
        </button>
      </div>
    `;
  });

  contenedor.innerHTML += `
    <button class="btn btn-primary w-100 mt-2"
      onclick="agregarEventoNuevo('${fecha}')">
      ➕ Agregar evento
    </button>
  `;

  document.getElementById("vistaListaEventos").classList.remove("d-none");
}

async function saveEvent() {

  const text = eventText.value.trim();
  const time = eventTime.value;

  if (!text) {
    alert("Escribí una descripción");
    return;
  }

  const ref = db
    .collection("usuarios")
    .doc(UID)
    .collection("events")
    .doc(selectedDate);

  try {

    const doc = await ref.get();
    let lista = [];

    if (doc.exists) {
      lista = doc.data().lista || [];
    }

    if (selectedEventIndex !== null) {
      lista[selectedEventIndex] = { text, time };
    } else {
      lista.push({ text, time });
    }

    await ref.set({ lista });

    console.log("🔥 Evento guardado correctamente");

    bootstrap.Modal.getInstance(eventModal).hide();

  } catch (e) {
    console.error("❌ Error Firestore:", e);
    alert("No se pudo guardar el evento");
  }
}

function resetModalCalendario() {
  // vistas
  document.getElementById("vistaListaEventos").classList.add("d-none");
  document.getElementById("vistaFormularioEvento").classList.add("d-none");

  // botones
  document.getElementById("btnGuardarEvento")?.classList.add("d-none");
  document.getElementById("btnEliminarEvento")?.classList.add("d-none");

  // inputs
  document.getElementById("eventTime").value = "";
  document.getElementById("eventText").value = "";

  selectedDate = null;
  selectedEventIndex = null;
  
}

async function deleteEvent() {
  if (selectedDate === null || selectedEventIndex === null) return;
  if (!confirm("¿Eliminar este evento?")) return;

  const ref = db
    .collection("usuarios")
    .doc(UID)
    .collection("events")
    .doc(selectedDate);

  try {

    const doc = await ref.get();
    if (!doc.exists) return;

    let lista = doc.data().lista || [];

    lista.splice(selectedEventIndex, 1);

    if (lista.length === 0) {
      await ref.delete();
    } else {
      await ref.set({ lista });
    }

    console.log("🔥 Evento eliminado correctamente");

    bootstrap.Modal.getInstance(
      document.getElementById("eventModal")
    ).hide();

  } catch (e) {
    console.error("❌ Error eliminando:", e);
    alert("No se pudo eliminar el evento");
  }
}

function prevMonth(){
  date.setMonth(date.getMonth()-1);
  renderCalendar();
}

function nextMonth(){
  date.setMonth(date.getMonth()+1);
  renderCalendar();
}


// LOBBY*********************************************************************************************LOBBY

document.addEventListener("DOMContentLoaded", () => {
  showSection("home");
});

function renderWeeklyEvents() {
  const container = document.getElementById("weeklyEvents");
  container.innerHTML = "";

  const today = new Date();

  // 🔹 Calcular lunes de esta semana
  const day = today.getDay(); // 0 = domingo, 1 = lunes, ...
  const diffToMonday = (day === 0 ? -6 : 1 - day); // si hoy es domingo, retrocede 6 días
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() + diffToMonday);
  weekStart.setHours(0,0,0,0);

  // 🔹 Calcular domingo de esta semana
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23,59,59,999);

  let weekEvents = [];

  // 🔹 Filtrar eventos que están dentro de la semana
  for (let dateStr in events) {
    const [y, m, d] = dateStr.split("-");
    const eventDate = new Date(y, m - 1, d);
    eventDate.setHours(0,0,0,0);

    if (eventDate >= weekStart && eventDate <= weekEnd) {
      const e = events[dateStr];
      weekEvents.push({
        date: eventDate,
        data: Array.isArray(e) ? e : [e] // si hay varios eventos en la misma fecha
      });
    }
  }

  if (weekEvents.length === 0) {
    container.innerHTML = `<div class="empty-week">No hay eventos esta semana</div>`;
    return;
  }

  // 🔹 Ordenar los eventos por fecha
  weekEvents.sort((a, b) => a.date - b.date);

  // 🔹 Renderizar
  weekEvents.forEach(day => {
    day.data.forEach(e => {
      container.innerHTML += `
        <div class="week-event">
          <strong>${day.date.toLocaleDateString("es-ES",{weekday:"long", day:"numeric"})}</strong><br>
          🕒 ${e.time || ""} — ${e.text}
        </div>
      `;
    });
  });
}

async function saveImportant() {
  if (!modoEdicionActivo) {
    alert("Activá modo edición para guardar cambios");
    return;
  }

  if (!UID) {
    alert("Usuario no cargado aún");
    return;
  }

  const text = document.getElementById("importantText").value;
  const fileInput = document.getElementById("importantFile");

  const guardar = async (data) => {
    try {
      // 🔑 Guardamos en la colección del usuario, no global
      const baseRef = db.collection("usuarios").doc(UID);
      await baseRef
        .collection("important")
        .doc("lobby")
        .set({
          ...data,
          actualizado: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

      console.log("🔥 Important personal guardado");

    } catch (e) {
      console.error("❌ Firestore error:", e);
      alert("No se pudo guardar");
    }
  };

  if (fileInput.files.length > 0) {
    const reader = new FileReader();
    reader.onload = () => {
      guardar({
        text,
        file: reader.result
      });
    };
    reader.readAsDataURL(fileInput.files[0]);
  } else {
    guardar({
      text,
      file: null
    });
  }
}

function LS_KEY(key){
  return `MYAPP_${key}`; // ejemplo de prefijo
}

function iniciarListenerImportant(){

  db.collection("global")
    .doc("lobby")
    .onSnapshot((doc) => {

      if (!doc.exists) {
        document.getElementById("importantText").value = "";
        document.getElementById("importantPreview").innerHTML = "";
        return;
      }

      const data = doc.data();

      document.getElementById("importantText").value = data.text || "";

      if (data.file) {
        document.getElementById("importantPreview").innerHTML = `
          <a href="${data.file}" target="_blank">📎 Archivo adjunto</a>
        `;
      } else {
        document.getElementById("importantPreview").innerHTML = "";
      }

      console.log("🔥 Important sincronizado");
    });
}

async function deleteImportant(){
  if(!modoEdicionActivo){
    alert("Activá modo edición para guardar cambios");
    return;
  }

  if(!confirm("¿Eliminar información importante?")) return;

  // 1️⃣ Local
  localStorage.removeItem(LS_KEY(LS_IMPORTANT));
  document.getElementById("importantText").value = "";
  document.getElementById("importantPreview").innerHTML = "";

  // 2️⃣ 🔥 GLOBAL
  try {
    await db
      .collection("global")
      .doc("lobby")
      .collection("config")
      .doc("important")
      .delete();

    console.log("🔥 Important GLOBAL eliminado");
  } catch(e){
    console.error("Error eliminando global:", e);
  }
}

function actualizarEstadoImportant(){
  document.getElementById("importantText").disabled = !modoEdicionActivo;
  document.getElementById("importantFile").disabled = !modoEdicionActivo;

  document.querySelectorAll(".important-edit").forEach(el => {
    el.style.display = modoEdicionActivo ? "inline-block" : "none";
  });
}


// REPERTORIO********************************************************************************************REPERTORIO

function renderRepertorioGlobal() {
  console.log("🔹 renderRepertorioGlobal", repertorioGlobal);
  const cont = document.getElementById("repertorioGlobalList");
  // Guardar scroll actual
  const scrollAnterior = cont.scrollTop;

  cont.innerHTML = "";

  if (!repertorioGlobal) repertorioGlobal = [];

  const esMobile = window.innerWidth < 768; // detecta pantalla chica

  // FILTRO POR TÍTULO
  const filtradas = repertorioGlobal
    .map((c, index) => ({ ...c, indexReal: index }))
    .filter(c => c && typeof c.titulo === "string" && c.titulo.toLowerCase().includes(filtroRepertorio));

  // Si no hay canciones filtradas, mostrar mensaje
  if (filtradas.length === 0) {
    cont.innerHTML = "<em>No hay canciones en el repertorio</em>";
    return;
  }

  // PAGINACIÓN
  const totalPaginas = Math.ceil(filtradas.length / CANCIONES_POR_PAGINA);
  paginaRepertorio = Math.min(paginaRepertorio, totalPaginas);

  const inicio = (paginaRepertorio - 1) * CANCIONES_POR_PAGINA;

  // Separar canciones nuevas para ponerlas al final
  const nuevas = filtradas.filter(c => c.nueva);
  const viejas = filtradas.filter(c => !c.nueva);

  // Concatenar y tomar solo las visibles
  const visibles = viejas.concat(nuevas).slice(inicio, inicio + CANCIONES_POR_PAGINA);


  visibles.forEach((c) => {

    // 👉 MOBILE + NO EDICIÓN = vista compacta
    if (esMobile && !modoEdicionActivo) {
      cont.innerHTML += `
        <div class="modal-bloque" data-index="${c.indexReal}">
          <div class="d-flex justify-content-between align-items-center">

            <strong class="text-truncate">${c.titulo}</strong>

            <div class="d-flex gap-2">
              <button class="btn btn-sm"
                onclick="toggleFavorito(${c.indexReal})">
                <i class="bi bi-star${c.favorito ? '-fill text-warning' : ''}"></i>
              </button>

              ${c.youtube ? `
                <button class="btn btn-sm btn-soft-primary"
                  onclick="abrirYoutubeEnModal('${c.youtube}', ${c.indexReal})">▶️</button>
              ` : ""}

              ${c.letra ? `
                <button class="btn btn-sm btn-soft-secondary"
                  onclick="window.open('${c.letra}', '_blank')">📄</button>
              ` : ""}
            </div>

          </div>
        </div>
      `;
      return;
    }

    // 👉 DESKTOP o MODO EDICIÓN = vista completa
    cont.innerHTML += `
      <div class="modal-bloque" data-index="${c.indexReal}">
        <div class="row g-2 align-items-end">

          <div class="col-md-3">
            <label>Título</label>
            <input class="form-control titulo"
              value="${c.titulo}"
              ${modoEdicionActivo ? "" : "disabled"}>
          </div>

          <div class="col-md-2">
            <label>Tonalidad</label>
            <input class="form-control tonalidad"
              value="${c.tonalidad || ''}"
              ${modoEdicionActivo ? "" : "disabled"}>
          </div>

          <div class="col-md-3">
            <label>YouTube</label>
            <input class="form-control youtube"
              value="${c.youtube || ''}"
              ${modoEdicionActivo ? "" : "disabled"}>
          </div>

          <div class="col-md-3">
            <label>Letra / Tab</label>
            <input class="form-control letra"
              value="${c.letra || ''}"
              ${modoEdicionActivo ? "" : "disabled"}>
          </div>

          <!-- 🎵 BOTONES -->
          <button class="btn btn-sm btn-fav"
            onclick="toggleFavorito(${c.indexReal})"
            title="Favorito">
            <i class="bi bi-star${c.favorito ? '-fill text-warning' : ''}"></i>
          </button>

          <div class="col-md-2 d-flex gap-1 justify-content-end flex-wrap">

            ${c.youtube ? `
              <button class="btn btn-sm btn-soft-primary"
                onclick="abrirYoutubeEnModal('${c.youtube}', ${c.indexReal})">▶️</button>
            ` : ""}

            ${c.letra ? `
              <button class="btn btn-sm btn-soft-secondary"
                onclick="window.open('${c.letra}', '_blank')">📄</button>
            ` : ""}

            ${modoEdicionActivo ? `
              <button class="btn btn-delete-song"
                onclick="eliminarCancionGlobal(${c.indexReal})">🗑</button>
            ` : ""}
          </div>

        </div>
      </div>
    `;
  });

  renderPaginacionRepertorio(totalPaginas);

}

function agregarCancionGlobal() {
  if (!modoEdicionActivo) activarModoEdicion();

  sincronizarRepertorioDesdeInputs();

  // Agregar nueva canción
  const nuevaCancion = {
    titulo: "",
    tonalidad: "",
    youtube: "",
    letra: "",
    favorito: false,
    plays: 0,
    nueva: true
  };
  repertorioGlobal.push(nuevaCancion);

  const cont = document.getElementById("repertorioGlobalList");
  const indexReal = repertorioGlobal.length - 1;

  // Insertar HTML igual que renderRepertorioGlobal (modo DESKTOP o EDICIÓN)
  cont.insertAdjacentHTML("beforeend", `
    <div class="modal-bloque" data-index="${indexReal}">
      <div class="row g-2 align-items-end">

        <div class="col-md-3">
          <label>Título</label>
          <input class="form-control titulo" value="${nuevaCancion.titulo}" ${modoEdicionActivo ? "" : "disabled"}>
        </div>

        <div class="col-md-2">
          <label>Tonalidad</label>
          <input class="form-control tonalidad" value="${nuevaCancion.tonalidad || ''}" ${modoEdicionActivo ? "" : "disabled"}>
        </div>

        <div class="col-md-3">
          <label>YouTube</label>
          <input class="form-control youtube" value="${nuevaCancion.youtube || ''}" ${modoEdicionActivo ? "" : "disabled"}>
        </div>

        <div class="col-md-3">
          <label>Letra / Tab</label>
          <input class="form-control letra" value="${nuevaCancion.letra || ''}" ${modoEdicionActivo ? "" : "disabled"}>
        </div>

        <!-- 🎵 BOTÓN FAVORITO -->
        <button class="btn btn-sm btn-fav" onclick="toggleFavorito(${indexReal})" title="Favorito">
          <i class="bi bi-star${nuevaCancion.favorito ? '-fill text-warning' : ''}"></i>
        </button>

        <div class="col-md-2 d-flex gap-1 justify-content-end flex-wrap">

          ${nuevaCancion.youtube ? `
            <button class="btn btn-sm btn-soft-primary"
              onclick="abrirYoutubeEnModal('${nuevaCancion.youtube}', ${indexReal})">▶️</button>
          ` : ""}

          ${nuevaCancion.letra ? `
            <button class="btn btn-sm btn-soft-secondary"
              onclick="window.open('${nuevaCancion.letra}', '_blank')">📄</button>
          ` : ""}

          ${modoEdicionActivo ? `
            <button class="btn btn-delete-song"
              onclick="eliminarCancionGlobal(${indexReal})">🗑</button>
          ` : ""}

        </div>

      </div>
    </div>
  `);

  // Opcional: mantener scroll donde estaba o bajar a la nueva
  // cont.scrollTop = cont.scrollTop; // queda donde estaba
  cont.scrollTop = cont.scrollHeight; // baja hasta la nueva canción
}

async function guardarRepertorioGlobal() {

  if (!UID_BASE) {
    console.error("UID_BASE no definido");
    return;
  }

  try {

    // 🔥 SOLO sincronizar si existe el contenedor
    const cont = document.getElementById("repertorioGlobalList");

    if (cont && cont.children.length > 0) {
      sincronizarRepertorioDesdeInputs();
    }

    const baseRef = db.collection("usuarios").doc(UID_BASE);

    await baseRef
      .collection("repertorios")
      .doc("global")
      .set({
        canciones: repertorioGlobal,
        actualizado: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

    console.log("🔥 Repertorio guardado correctamente");

  } catch (error) {

    console.error("Error guardando repertorio:", error);

  }

}

async function eliminarCancionGlobal(index) {
  if (!modoEdicionActivo) {
    alert("Activá modo edición para guardar cambios");
    return;
  }

  if (!confirm("¿Eliminar esta canción del repertorio?")) return;

  repertorioGlobal.splice(index, 1);

  await guardarRepertorioGlobal();

  renderRepertorioGlobal();
}

async function quitarCancionDelDia(event, fecha, index, boton) {

  if (!modoEdicionActivo) {
    alert("Activá modo edición para guardar cambios");
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  if (!repertorios[fecha]) return;

  repertorios[fecha].splice(index, 1);

  const ref = db
    .collection("usuarios")
    .doc(UID)
    .collection("repertorios")
    .doc(fecha);

  try {

    if (repertorios[fecha].length === 0) {
      delete repertorios[fecha];
      await ref.delete();
      console.log("🔥 Día eliminado");
    } else {
      await ref.set({
        lista: repertorios[fecha],
        actualizado: new Date()
      });
    }

  } catch (e) {
    console.error("❌ Error Firestore:", e);
    alert("Error al guardar cambios");
    return;
  }

  const li = boton.closest("li");
  if (li) li.remove();
}

function sincronizarRepertorioDesdeInputs(){

  const cont = document.getElementById("repertorioGlobalList");

  if (!cont) return;

  const bloques = cont.querySelectorAll(".modal-bloque");

  if (bloques.length === 0) return; // 🔥 CRÍTICO

  bloques.forEach((b) => {

    const indexReal = parseInt(b.dataset.index);

    if (isNaN(indexReal)) return;

    const tituloInput = b.querySelector(".titulo");
    const youtubeInput = b.querySelector(".youtube");
    const letraInput = b.querySelector(".letra");
    const tonalidadInput = b.querySelector(".tonalidad");

    // 🔥 SOLO actualizar si existen inputs reales
    if (tituloInput) repertorioGlobal[indexReal].titulo = tituloInput.value.trim();
    if (youtubeInput) repertorioGlobal[indexReal].youtube = youtubeInput.value.trim();
    if (letraInput) repertorioGlobal[indexReal].letra = letraInput.value.trim();
    if (tonalidadInput) repertorioGlobal[indexReal].tonalidad = tonalidadInput.value.trim();

  });

}

function buscarRepertorio(texto) {
  filtroRepertorio = texto.toLowerCase();
  paginaRepertorio = 1;
  renderRepertorioGlobal();
}

function renderPaginacionRepertorio(totalPaginas) {
  const cont = document.getElementById("paginacionRepertorio");
  cont.innerHTML = "";

  if (totalPaginas <= 1) return;

  cont.innerHTML = `
    <div class="d-flex align-items-center gap-2 mt-3">

      <button class="btn btn-flecha"
        ${paginaRepertorio === 1 ? "disabled" : ""}
        onclick="cambiarPaginaRepertorio(-1)">
        <i class="bi bi-chevron-left"></i>
      </button>

      <span id="paginaActual" class="fw-bold">
        ${paginaRepertorio} / ${totalPaginas}
      </span>

      <button class="btn btn-flecha"
        ${paginaRepertorio === totalPaginas ? "disabled" : ""}
        onclick="cambiarPaginaRepertorio(1)">
        <i class="bi bi-chevron-right"></i>
      </button>

    </div>
  `;
}

function cambiarPaginaRepertorio(delta) {
  paginaRepertorio += delta;
  renderRepertorioGlobal();
}

function actualizarBuscadorYoutubeGlobal() {
  const box = document.getElementById("buscadorYoutubeGlobal");
  if (!box) return;

  box.classList.toggle("d-none", !modoEdicionActivo);
}

function buscarEnYoutubeDesdeModal() {
  const input = document.getElementById("repYoutube");

  if (!input) {
    console.warn("No se encontró el input repYoutube");
    return;
  }

  const valor = input.value.trim();
  if (!valor) {
    alert("Ingresá un link o texto para buscar en YouTube");
    return;
  }

  // 👉 Si es URL, abrir directo
  if (valor.startsWith("http")) {
    window.open(valor, "_blank");
    return;
  }

  // 👉 Si es texto, buscar en YouTube
  const query = encodeURIComponent(valor);
  const url = `https://www.youtube.com/results?search_query=${query}`;
  window.open(url, "_blank");
}

// HOME**********************************************************************************Home

async function playFromHome(index) {
  const cancion = repertorioGlobal[index];
  if (!cancion || !cancion.youtube) return;

  const videoId = extraerIdYoutube(cancion.youtube);
  if (!videoId) return;

  // ▶ reproducir en el iframe del home
  const frame = document.getElementById("homeYoutubeFrame");
  frame.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;

  document.getElementById("homePlayer").classList.remove("d-none");

  // 🔥 contador global
  cancion.plays = (cancion.plays || 0) + 1;

  await guardarRepertorioGlobal(); // persistencia real

  // renderizamos la lista sin borrar el video actual
  renderHome(videoId);
  renderHomeMasEscuchadas(videoId);
}

function renderHome(currentPlayingId = null) {
  const container = document.getElementById("homeCards");
  if (!container) return;

  container.innerHTML = "";

  // 🔥 ordenar por plays
  const masEscuchados = repertorioGlobal
    .map((c, index) => ({ ...c, indexReal: index }))
    .filter(c => c.youtube)
    .sort((a,b) => (b.plays || 0) - (a.plays || 0))
    .slice(0, 6);

  const ultimosAgregados = repertorioGlobal
    .map((c, index) => ({ ...c, indexReal: index }))
    .filter(c => c.youtube)
    .slice(-6)
    .reverse();

  // 🔹 Renderizo los más escuchados
  masEscuchados.forEach(c => {
    const videoId = extraerIdYoutube(c.youtube);
    if (!videoId) return;

    const isPlaying = videoId === currentPlayingId; // si es el video que se está reproduciendo
    container.innerHTML += `
      <div class="col-6 col-md-2">
        <div class="card h-100 ${isPlaying ? "playing" : ""}">
          <img src="https://img.youtube.com/vi/${videoId}/hqdefault.jpg" class="card-img-top video-thumb">
          <div class="card-body text-center d-flex flex-column gap-2">
            <strong class="video-title">${c.titulo}</strong>
            <button class="btn btn-sm btn-dark mx-auto"
              ${isPlaying ? "disabled" : `onclick="playFromHome(${c.indexReal})"`}>
              ▶
            </button>
          </div>
        </div>
      </div>
    `;
  });

  // 🔹 Renderizo los últimos agregados
  const containerUltimos = document.getElementById("ultimosCards");
  if (containerUltimos) {
    containerUltimos.innerHTML = "";
    ultimosAgregados.forEach(c => {
      const videoId = extraerIdYoutube(c.youtube);
      if (!videoId) return;

      const isPlaying = videoId === currentPlayingId;
      containerUltimos.innerHTML += `
        <div class="col-6 col-md-2">
          <div class="card h-100 ${isPlaying ? "playing" : ""}">
            <img src="https://img.youtube.com/vi/${videoId}/hqdefault.jpg" class="card-img-top video-thumb">
            <div class="card-body text-center d-flex flex-column gap-2">
              <strong class="video-title">${c.titulo}</strong>
              <button class="btn btn-sm btn-dark mx-auto"
                ${isPlaying ? "disabled" : `onclick="playFromHome(${c.indexReal})"`}>
                ▶
              </button>
            </div>
          </div>
        </div>
      `;
    });
  }
}

function asegurarPlayCount(cancion) {
  if (typeof cancion.plays !== "number") {
    cancion.plays = 0;
  }
  if (typeof cancion.favorito !== "boolean") {
    cancion.favorito = false;
  }
}


function renderHomeMasEscuchadas() {
  const cont = document.getElementById("homeMasEscuchadas");
  if (!cont) return;

  cont.innerHTML = "";

  const canciones = repertorioGlobal
    .map((c, index) => ({
      ...c,
      indexReal: index,
      plays: c.plays || 0
    }))
    .filter(c => c.youtube)
    .sort((a, b) => b.plays - a.plays)
    .slice(0, 6);

  if (canciones.length === 0) {
    cont.innerHTML = "<em>No hay reproducciones aún</em>";
    return;
  }

  canciones.forEach(c => {
    const videoId = extraerIdYoutube(c.youtube);

    cont.innerHTML += `
      <div class="col-6 col-md-2">
        <div class="card h-100">
          <img src="https://img.youtube.com/vi/${videoId}/hqdefault.jpg"
               class="card-img-top video-thumb">

          <div class="card-body">
            <h6 class="card-title">${c.titulo}</h6>

            <div class="d-flex justify-content-between align-items-center">
              <button class="btn btn-sm btn-dark"
                onclick="playFromHome(${c.indexReal})">
                ▶
              </button>

              <small>🔥 ${c.plays}</small>
            </div>
          </div>
        </div>
      </div>
    `;
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderHome();              
  renderHomeMasEscuchadas();
  renderHomeFavoritos();
});

async function toggleFavorito(indexReal) {

  repertorioGlobal[indexReal].favorito =
    !repertorioGlobal[indexReal].favorito;

  await guardarRepertorioGlobal();

  renderRepertorioGlobal();
  renderHomeFavoritos();
}


function renderHomeFavoritos() {
  const container = document.getElementById("homeFavoritos");
  if (!container) return;

  container.innerHTML = "";

  const favoritos = repertorioGlobal
    .map((c, i) => ({ ...c, indexReal: i }))
    .filter(c => c.favorito && c.youtube);

  if (favoritos.length === 0) {
    container.innerHTML = `<p class="text-muted">No hay favoritos aún ⭐</p>`;
    return;
  }

  container.innerHTML = `
    <ul class="list-group">
      ${favoritos.map(c => `
        <li class="list-group-item d-flex justify-content-between align-items-center">
          <span>🎵 ${c.titulo}</span>
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-dark"
              onclick="playFromFavoritos(${c.indexReal})">▶</button>
            <button class="btn btn-sm btn-secondary"
              onclick="pauseFavorito()">⏸</button>
          </div>
        </li>
      `).join("")}
    </ul>
  `;
}

function pauseFavorito() {
  const frame = document.getElementById("homeYoutubeFrameFav");
  frame.src = ""; // corta reproducción
}

async function playFromFavoritos(index) {
  const cancion = repertorioGlobal[index];
  if (!cancion || !cancion.youtube) return;

  const videoId = extraerIdYoutube(cancion.youtube);
  if (!videoId) return;

  const videoFrame = document.getElementById("homeYoutubeFrame");
  videoFrame.src = "";

  const frame = document.getElementById("homeYoutubeFrameFav");
  frame.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;

  cancion.plays = (cancion.plays || 0) + 1;

  await guardarRepertorioGlobal();

  renderHome();
  renderHomeMasEscuchadas();
  renderHomeFavoritos();
}

// VIP**********************************************************************************VIP

function obtenerVIPs() {
  return vipGlobal;
}

async function guardarVIPs(lista) {

  if (!UID) return;

  try {

    // guardar en usuario
    await db.collection("usuarios")
      .doc(UID)
      .collection("vip")
      .doc("lista")
      .set({
        usuarios: lista
      });

    // guardar índice global
    await db.collection("vipKeys")
      .doc(clave)
      .set({
        nombre: nombre,
        uidAdmin: UID
      });

    vipGlobal = lista;

    renderVIPs();

    console.log("✅ VIPs guardados correctamente");

  } catch (error) {

    console.error(error);

  }

}

function renderVIPs() {
  if (!UID) return; 
  
  const lista = obtenerVIPs();
  const ul = document.getElementById("vipList");
  if (!ul) return;

  ul.innerHTML = "";

  if (lista.length === 0) {
    ul.innerHTML = `<li class="list-group-item text-muted">No hay VIP registrados</li>`;
    return;
  }

  lista.forEach((vip, index) => {
    ul.innerHTML += `
      <li class="list-group-item d-flex justify-content-between align-items-center">
        <span style="cursor:pointer" onclick="editarVIP(${index})">
          👤 ${vip.nombre} — 📱 ${vip.clave}
        </span>
        <button class="btn btn-sm btn-danger" onclick="eliminarVIP(${index})">❌</button>
      </li>
    `;
  });
}

function editarVIP(index) {
  const lista = obtenerVIPs();
  const vip = lista[index];

  document.getElementById("vipNombre").value = vip.nombre;
  document.getElementById("vipClave").value = vip.clave;

  vipEditIndex = index;

  document.getElementById("guardarVIP").textContent = "Actualizar VIP";
}

async function eliminarVIP(index) {
  const lista = [...vipGlobal];
  lista.splice(index, 1);
  await guardarVIPs(lista);
}

document.getElementById("guardarVIP").addEventListener("click", async () => {
  if (!UID) return alert("Esperá un segundo… usuario cargando");

  const nombre = document.getElementById("vipNombre").value.trim();
  const clave = document.getElementById("vipClave").value.trim();
  if (!nombre || !clave) return alert("Completa nombre y teléfono");

  try {
    // 🔹 Traer la lista actual desde Firestore
    const snap = await db.collection("usuarios")
      .doc(UID)
      .collection("vip")
      .doc("lista")
      .get();

    const lista = snap.exists ? snap.data().usuarios || [] : [];

    if (vipEditIndex !== null) {
      lista[vipEditIndex] = { nombre, clave, uidAdmin: UID }; // edición
      vipEditIndex = null;
    } else {
      if (lista.some(v => v.clave === clave)) return alert("Ese teléfono ya está registrado");
      lista.push({ nombre, clave, uidAdmin: UID }); // creación
    }

    // 🔹 Guardar lista completa de vuelta en Firestore
    await db.collection("usuarios")
      .doc(UID)
      .collection("vip")
      .doc("lista")
      .set({
      usuarios: lista,
      actualizado: new Date()
    });

    vipGlobal = lista; // actualizar variable global
    renderVIPs();

    document.getElementById("vipNombre").value = "";
    document.getElementById("vipClave").value = "";
    document.getElementById("guardarVIP").textContent = "Guardar VIP";

    console.log("✅ VIP agregado correctamente");

  } catch (error) {
    console.error("Error guardando VIP:", error);
    alert("No se pudo guardar el VIP");
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const rol = sessionStorage.getItem("rol");
  console.log("ROL ACTUAL:", rol);

  const settingsGearWrapper = document.getElementById("settingsGearWrapper");

  if (!settingsGearWrapper) return;

  if (rol === "vip") {
    settingsGearWrapper.style.display = "none"; // 👑 VIP NO ve engranaje
  }
});

document.addEventListener('hide.bs.modal', () => {
  document.activeElement?.blur();
});

async function cargarVIPs() {
  try {
    const snap = await db.collection("usuarios")
      .doc(UID_BASE)
      .collection("vip")
      .doc("lista")
      .get();

    if (snap.exists) {
      vipGlobal = snap.data().usuarios || [];
      console.log("✅ VIPs cargados desde Firestore:", vipGlobal);
    } else {
      vipGlobal = [];
      console.log("⚠️ No hay VIPs en Firestore todavía");
    }

    renderVIPs();

  } catch (error) {
    console.error("❌ Error cargando VIPs:", error);
  }
}
// Gadgets/Settings**********************************************************************************Gatgets/Settings

const btnGadgets = document.getElementById("btnGadgets");
const gadgetsMenu = document.getElementById("gadgetsMenu");

const btnSettings = document.getElementById("btnSettings");
const settingsMenu = document.getElementById("settingsMenu");

const btnToggleEdicion = document.getElementById("btnToggleEdicion");
const btnAbrirVIP = document.getElementById("btnAbrirVIP");

/* ===== GADGETS ===== */
btnGadgets.addEventListener("click", (e) => {
  e.stopPropagation();

  gadgetsMenu.classList.toggle("d-none");
  settingsMenu.classList.add("d-none"); // cerrar settings
});

/* ===== SETTINGS ===== */
btnSettings.addEventListener("click", (e) => {
  e.stopPropagation();

  settingsMenu.classList.toggle("d-none");
  gadgetsMenu.classList.add("d-none"); // cerrar gadgets
});

/* ===== BOTÓN EDICIÓN ===== */
btnToggleEdicion.addEventListener("click", (e) => {
  e.stopPropagation();

  if (modoEdicionActivo) {
    desactivarModoEdicion();
  } else {
    activarModoEdicion();
  }

  settingsMenu.classList.add("d-none");
  gadgetsMenu.classList.add("d-none");
});

/* ===== VIP ===== */
btnAbrirVIP.addEventListener("click", () => {
  const modal = new bootstrap.Modal(document.getElementById("modalVIP"));
  modal.show();
  settingsMenu.classList.add("d-none");
});

/* ===== CLICK FUERA ===== */
document.addEventListener("click", (e) => {
  if (
    !gadgetsMenu.contains(e.target) &&
    !btnGadgets.contains(e.target) &&
    !settingsMenu.contains(e.target) &&
    !btnSettings.contains(e.target)
  ) {
    gadgetsMenu.classList.add("d-none");
    settingsMenu.classList.add("d-none");
  }
});


document.querySelectorAll('.sidebar-link[data-section]').forEach(link => {
  link.addEventListener('click', () => {
    const section = link.dataset.section;

    showSection(section);

    // cerrar menús si estaban abiertos
    gadgetsMenu.classList.add("d-none");
    settingsMenu.classList.add("d-none");
  });
});

