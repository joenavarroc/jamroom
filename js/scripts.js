const LS_MUSICOS_POR_INSTRUMENTO = "musicosPorInstrumento";

let musicosPorInstrumento = JSON.parse(localStorage.getItem(LS_MUSICOS_POR_INSTRUMENTO)) || {
  "Directores": ["Sabri", "Maru", "Leo", "Lore", "Juanchi"],
  "Voces": ["Lore", "Leo", "Juanchi", "Sabri", "Maru","Bianca","Blannca", "Balqui"],
  "Teclado": ["Gaby", "Jhony", "Juanchi","Rodri"],
  "Guitarra Eléctrica": ["Gustavo","Migue"],
  "Guitarra Acústica": ["Jhony", "Lean"],
  "Batería": ["Diego", "Joseph"],
  "Bajo": ["Joseph", "Jhony"],
  "Saxo": ["Juanchi"]
};

  const LS_MUSICOS = 'asignacionesMusicos';
  const LS_REPERTORIO = 'repertorios';

  const LS_EVENTOS = "eventosInfo";
  let fechaEditando = null;

  let paginaRepertorio = 1;
  const CANCIONES_POR_PAGINA = 10;
  let filtroRepertorio = "";

  const LS_REPERTORIO_GLOBAL = "repertorioGlobal";
  let repertorioGlobal = JSON.parse(localStorage.getItem(LS_REPERTORIO_GLOBAL)) || [];

  let eventosInfo = JSON.parse(localStorage.getItem(LS_EVENTOS)) || {};

  let asignacionesMusicos = JSON.parse(localStorage.getItem(LS_MUSICOS)) || {};
  let repertorios = JSON.parse(localStorage.getItem(LS_REPERTORIO)) || {};
  let diaActual = null;
  let diaAbierto = null;
  

  const modalNuevaFecha = new bootstrap.Modal(document.getElementById('modalNuevaFecha'));

  document.getElementById('btnAgregarDia').addEventListener('click', () => {
    fechaEditando = null; // 🔥 modo crear
    document.getElementById('inputFechaModal').value = '';
    document.getElementById('inputDescripcionModal').value = '';
    document.getElementById('btnEliminarFecha').classList.add('d-none');
    modalNuevaFecha.show();
  });

  document.getElementById('btnGuardarFecha').addEventListener('click', () => {
  const nuevaFecha = document.getElementById('inputFechaModal').value;
  const descripcion = document.getElementById('inputDescripcionModal').value.trim() || "Ensayo";

  if (!nuevaFecha) return alert('Seleccioná una fecha');

  // 🆕 CREAR
  if (!fechaEditando) {
    if (asignacionesMusicos[nuevaFecha]) {
      return alert('La fecha ya existe');
    }

    asignacionesMusicos[nuevaFecha] = {};
    repertorios[nuevaFecha] = [];
    eventosInfo[nuevaFecha] = { descripcion, horario: "--:--" };
  }
  // ✏️ EDITAR
  else {
    // si cambia la fecha
    if (fechaEditando !== nuevaFecha) {
      asignacionesMusicos[nuevaFecha] = asignacionesMusicos[fechaEditando];
      repertorios[nuevaFecha] = repertorios[fechaEditando];
      eventosInfo[nuevaFecha] = {
        ...eventosInfo[fechaEditando],
        descripcion
      };

      delete asignacionesMusicos[fechaEditando];
      delete repertorios[fechaEditando];
      delete eventosInfo[fechaEditando];
    } else {
      eventosInfo[nuevaFecha].descripcion = descripcion;
    }
  }

  localStorage.setItem(LS_MUSICOS, JSON.stringify(asignacionesMusicos));
  localStorage.setItem(LS_REPERTORIO, JSON.stringify(repertorios));
  localStorage.setItem(LS_EVENTOS, JSON.stringify(eventosInfo));

  fechaEditando = null;
  renderizarAgenda();
  modalNuevaFecha.hide();
});

document.getElementById('btnEliminarFecha').addEventListener('click', () => {
  if (!fechaEditando) return;

  const fecha = fechaEditando;

  const confirmar = confirm(
    `¿Eliminar el evento del ${formatearFecha(fecha)}?\n\n` +
    `Se borrarán músicos, repertorio y datos asociados.`
  );

  if (!confirmar) return;

  // 🔥 borrar TODO
  delete asignacionesMusicos[fecha];
  delete repertorios[fecha];
  delete eventosInfo[fecha];

  localStorage.setItem(LS_MUSICOS, JSON.stringify(asignacionesMusicos));
  localStorage.setItem(LS_REPERTORIO, JSON.stringify(repertorios));
  localStorage.setItem(LS_EVENTOS, JSON.stringify(eventosInfo));

  fechaEditando = null;
  diaAbierto = null;

  modalNuevaFecha.hide();
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


function editarHorario(fecha) {
  if (!modoEdicionActivo) return;

  const actual = obtenerHorarioEvento(fecha);
  const nuevo = prompt("Horario (ej: 19:30 - 22:00):", actual);
  if (!nuevo) return;

  if (!eventosInfo[fecha]) eventosInfo[fecha] = {};
  eventosInfo[fecha].horario = nuevo;

  localStorage.setItem(LS_EVENTOS, JSON.stringify(eventosInfo));
  renderizarAgenda();
}

  // Función para abrir el modal y mostrar los músicos por instrumento
function abrirModalMusicos(fecha) {
  diaActual = fecha;
  const container = document.getElementById('bodyModalMusicos');
  const clave = fecha;

  // Cargar siempre desde localStorage
  musicosPorInstrumento = JSON.parse(localStorage.getItem(LS_MUSICOS_POR_INSTRUMENTO)) || {};

  container.innerHTML = `
    <div class="modal-bloque">
      <div class="modal-bloque-header">Instrumentos</div>
      ${generarBotonesInstrumentos(clave)}
    </div>
    <div id="tbody-${idDomSafe(clave)}" class="d-flex flex-column gap-2"></div>
  `;

  const instrumentosAsignados = asignacionesMusicos[clave] || {};
  for (const instrumento in instrumentosAsignados) {
    agregarFilaMusico(clave, instrumento, instrumentosAsignados[instrumento]);
  }

  new bootstrap.Modal(document.getElementById('modalMusicos')).show();
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

  document.getElementById('btnAgregarInstrumento').onclick = () => {
    const nombre = document.getElementById('nuevoInstrumentoInput').value.trim();
    if (!nombre) return alert("Nombre vacío");
    if (musicosPorInstrumento[nombre]) return alert("Ya existe");

    musicosPorInstrumento[nombre] = [];
    localStorage.setItem(LS_MUSICOS_POR_INSTRUMENTO, JSON.stringify(musicosPorInstrumento));
    abrirEditorMusicosPorInstrumento();
  };

  new bootstrap.Modal(document.getElementById('modalEditorInstrumentos')).show();
}

function eliminarInstrumentoEditor(btn) {
  if (!confirm("¿Eliminar instrumento completo?")) return;
  btn.closest('.modal-bloque').remove();
}

document.getElementById('guardarInstrumentosBtn').onclick = () => {
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
  localStorage.setItem(LS_MUSICOS_POR_INSTRUMENTO, JSON.stringify(musicosPorInstrumento));

  bootstrap.Modal.getInstance(document.getElementById('modalEditorInstrumentos')).hide();
};


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

// Función para actualizar las asignaciones de músicos******************************************************************************
function actualizarAsignacion(clave, instrumento) {
  const divId = idDomSafe(`musicos-${clave}_${instrumento}`);
  const nombres = Array.from(document.getElementById(divId).children)
    .map(el => el.textContent.trim());

  if (!asignacionesMusicos[clave]) asignacionesMusicos[clave] = {};
  asignacionesMusicos[clave][instrumento] = nombres;

  // 💾 Guardar automáticamente en localStorage
  localStorage.setItem(LS_MUSICOS, JSON.stringify(asignacionesMusicos));
}

// Función para eliminar un instrumento de la fecha seleccionada
function eliminarInstrumentoDeFecha(clave, instrumento) {
  if (!confirm(`¿Eliminar "${instrumento}" de la fecha ${formatearFecha(clave)}?`)) return;

  delete asignacionesMusicos[clave][instrumento];
  localStorage.setItem(LS_MUSICOS, JSON.stringify(asignacionesMusicos));

  const filaId = idDomSafe(`fila-${clave}_${instrumento}`);
  const fila = document.getElementById(filaId);
  if (fila) fila.remove();
}


// Guardar los cambios de los músicos asignados
document.getElementById('guardarMusicosBtn').addEventListener('click', () => {
  localStorage.setItem(LS_MUSICOS, JSON.stringify(asignacionesMusicos));
  renderizarAgenda(); // Vuelve a renderizar la agenda con los cambios
  bootstrap.Modal.getInstance(document.getElementById('modalMusicos')).hide(); // Cierra el modal
});

function renderizarRepertorio(fecha) {
  const lista = repertorios[fecha];
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

function agregarCancionADia(event, indexGlobal, boton){
  if(!modoEdicionActivo) return;

  event.preventDefault();
  event.stopPropagation(); // ⛔ evita scroll / collapse

  if(!repertorios[diaActual]) repertorios[diaActual] = [];

  // evitar duplicados
  const existe = repertorios[diaActual].some(c => c.indexReal === indexGlobal);
  if(existe) return alert("Esa canción ya está en el repertorio del día");

  repertorios[diaActual].push({
    indexReal: indexGlobal
  });

  localStorage.setItem(LS_REPERTORIO, JSON.stringify(repertorios));

  // ✅ cambiar solo el botón ➕ por ✔
  boton.outerHTML = `<span class="badge bg-success">✔</span>`;

  // ✅ agregar SOLO el <li> nuevo al repertorio visual del día
  const fechaId = diaActual.replace(/-/g,'_');
  const ul = document.querySelector(`#repertorio_${fechaId} ul`);

  if(ul){
    const real = repertorioGlobal[indexGlobal];

    const li = document.createElement("li");
    li.className = "list-group-item d-flex justify-content-between align-items-center";

    li.innerHTML = `
      <div>
        <strong>${real.titulo}</strong>
        ${real.tonalidad ? `<small class="ms-2" style="color:#00cfff;">(${real.tonalidad})</small>` : ''}
      </div>

      <div class="d-flex align-items-center gap-2">
        ${real.youtube ? `<button class="btn btn-sm btn-soft-primary" onclick="abrirYoutubeEnModal('${real.youtube}', ${cancion.indexReal})">▶️</button>` : ''}
        ${real.letra ? `<button class="btn btn-sm btn-soft-secondary" onclick="window.open('${real.letra}', '_blank')">📄</button>` : ''}

        <button class="btn btn-sm"
          onclick="toggleFavorito(${indexGlobal})">
          ${repertorioGlobal[indexGlobal]?.favorito ? "⭐" : "☆"}
        </button>

        <button class="btn btn-sm btn-delete-song boton-edicion"
          onclick="quitarCancionDelDia(event, '${diaActual}', ${repertorios[diaActual].length-1}, this)">
          ❌
        </button>
      </div>
    `;

    ul.appendChild(li);
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
  // solo cerrar modal, NO tocar datos
  renderizarAgenda();

  const modalRepertorio = bootstrap.Modal.getOrCreateInstance(
    document.getElementById('modalRepertorio')
  );
  modalRepertorio.hide();
});


function renderizarAgenda() {
  const agenda = document.getElementById('agenda');
  agenda.querySelectorAll('.dia').forEach(e => e.remove());

  Object.keys(asignacionesMusicos).forEach(fecha => {
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
    onclick="diaAbierto='${fecha}'">

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
  if (diaAbierto) {
    const id = diaAbierto.replace(/-/g, '_');
    const colapsable = document.getElementById(`contenedor-${id}`);
    if (colapsable) {
      new bootstrap.Collapse(colapsable, { show: true });
    }
  }
}

  renderizarAgenda();

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

function guardarDescripcionInline(el) {
  el.contentEditable = false;

  const fecha = el.dataset.fecha;
  const texto = el.textContent.trim() || "Ensayo";

  if (!eventosInfo[fecha]) eventosInfo[fecha] = {};
  eventosInfo[fecha].descripcion = texto;

  localStorage.setItem(LS_EVENTOS, JSON.stringify(eventosInfo));
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

function guardarHorarioInline(el, fecha) {
  if (!modoEdicionActivo) return;

  el.contentEditable = false;

  // Limpiar texto (sacar emoji y espacios)
  let texto = el.textContent.replace("⏰", "").trim();
  if (!texto) texto = "--:--";

  if (!eventosInfo[fecha]) eventosInfo[fecha] = {};
  eventosInfo[fecha].horario = texto;

  localStorage.setItem(LS_EVENTOS, JSON.stringify(eventosInfo));

  // Re-render suave
  renderizarAgenda();
}

function eliminarFecha(fecha) {
  if (!confirm(`¿Estás seguro de que deseas eliminar la fecha ${formatearFecha(fecha)}? Esta acción no se puede deshacer.`)) {
    return;
  }

  delete asignacionesMusicos[fecha];
  delete repertorios[fecha];
  localStorage.setItem(LS_MUSICOS, JSON.stringify(asignacionesMusicos));
  localStorage.setItem(LS_REPERTORIO, JSON.stringify(repertorios));
  renderizarAgenda();
}


function idDomSafe(texto) {
  return texto.replace(/\W+/g, '_');
}

function abrirYoutubeEnModal(url, index) {
  const videoId = extraerIdYoutube(url);
  if (!videoId) {
    alert("URL de YouTube inválida.");
    return;
  }

  // 🔥 SUMAR PLAY
  if (typeof index === "number") {
    repertorioGlobal[index].plays = (repertorioGlobal[index].plays || 0) + 1;

    localStorage.setItem(
      LS_REPERTORIO_GLOBAL,
      JSON.stringify(repertorioGlobal)
    );

    renderHome(); // refresca ranking
  }

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

function activarModoEdicion() {
  modoEdicionActivo = true;
  document.body.classList.add('modo-edicion');
  document.getElementById('btnModoEdicion').classList.add('d-none');
  document.getElementById('btnSalirEdicion').classList.remove('d-none');

  actualizarEstadoImportant();
  actualizarBuscadorYoutubeGlobal();
  renderRepertorioGlobal();
  renderCalendar(); // 🔥 FORZAR reconstrucción del calendario
}

function desactivarModoEdicion() {
  modoEdicionActivo = false;
  document.body.classList.remove('modo-edicion');
  document.getElementById('btnModoEdicion').classList.remove('d-none');
  document.getElementById('btnSalirEdicion').classList.add('d-none');

  actualizarEstadoImportant();
  actualizarBuscadorYoutubeGlobal();
  modoEdicionActivo = false;
  renderRepertorioGlobal();

}

document.getElementById('btnSalirEdicion').addEventListener('click', desactivarModoEdicion);

const CLAVE_EDICION = "clave"; // Cambiala por una más segura si querés

document.getElementById('btnModoEdicion').addEventListener('click', () => {
  if (modoEdicionActivo) return;

  const clave = prompt("Ingrese la clave para activar el modo edición:");
  if (clave === CLAVE_EDICION) {
    activarModoEdicion();
  } else {
    alert("Clave incorrecta");
  }
});

async function generarPDF(fecha) {
  const { jsPDF } = window.jspdf;
  const fechaId = idDomSafe(fecha);
  const doc = new jsPDF();
  const margen = 15;
  let y = margen;

  // Usar una fuente que soporte caracteres especiales
  doc.setFont("helvetica", "normal"); // Aseguramos que se usa una fuente que soporta caracteres especiales

  const formateada = formatearFecha(fecha);
  doc.setFontSize(16);
  doc.text(`Evento: ${formateada}`, margen, y);
  y += 10;

  // Músicos
  doc.setFontSize(12);
  doc.text("Músicos:", margen, y);
  y += 6;

  const musicosData = asignacionesMusicos[fecha];
  if (musicosData && Object.keys(musicosData).length > 0) {
    for (const [instrumento, musicos] of Object.entries(musicosData)) {
      const texto = `• ${instrumento}: ${musicos.join(', ')}`;
      doc.text(texto, margen + 5, y);
      y += 6;
    }
  } else {
    doc.text("Sin asignaciones", margen + 5, y);
    y += 6;
  }

  y += 5;

  // Repertorio
  doc.setFontSize(12);
  doc.text("Repertorio:", margen, y);
  y += 6;

  const canciones = repertorios[fecha] || [];
  if (canciones.length > 0) {
    canciones.forEach((cancion) => {
      doc.text(`• ${cancion.titulo}${cancion.tonalidad ? ` (${cancion.tonalidad})` : ''}`, margen + 5, y);
      y += 6;

      // Agregar enlace de YouTube
      if (cancion.youtube && isValidURL(cancion.youtube)) {
        const youtubeLink = cancion.youtube;
        try {
          console.log("Agregando enlace de YouTube:", youtubeLink);
          const enlaceY = y; // Guarda la posición Y para el enlace de YouTube
          doc.setTextColor(0, 0, 255); // Color azul para el enlace
          // Utilizar el método de texto normal con la URL como enlace
          doc.text('YouTube', margen + 10, enlaceY);
          doc.link(margen + 10, enlaceY - 3, 30, 6, { url: youtubeLink }); // Usamos `link` para los enlaces
          doc.setTextColor(0, 0, 0); // Regresar el color a negro
          y += 6;
        } catch (error) {
          console.error("Error al agregar enlace de YouTube:", error);
        }
      }

      // Agregar enlace de Letra/Tab
      if (cancion.letra && isValidURL(cancion.letra)) {
        const letraLink = cancion.letra;
        try {
          console.log("Agregando enlace de Letra/Tab:", letraLink);
          const enlaceY = y; // Guarda la posición Y para el enlace de Letra/Tab
          doc.setTextColor(0, 0, 255); // Color azul para el enlace
          // Utilizar el método de texto normal con la URL como enlace
          doc.text('Letra/Tab', margen + 10, enlaceY);
          doc.link(margen + 10, enlaceY - 3, 30, 6, { url: letraLink }); // Usamos `link` para los enlaces
          doc.setTextColor(0, 0, 0); // Regresar el color a negro
          y += 6;
        } catch (error) {
          console.error("Error al agregar enlace de Letra/Tab:", error);
        }
      }

      y += 2;
    });
  } else {
    doc.text("Sin canciones asignadas", margen + 5, y);
    y += 6;
  }

  y += 5;

  // QR como imagen (opcional)
  const qrCanvas = document.getElementById(`qr_${fechaId}`)?.querySelector('canvas');
  if (qrCanvas) {
    const imgData = qrCanvas.toDataURL("image/png");
    doc.addImage(imgData, 'PNG', margen, y, 50, 50);
    y += 60;
  }

  doc.save(`Evento_${fechaId}.pdf`);
}

// Función para validar si una URL es válida
function isValidURL(url) {
  const pattern = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i;
  return pattern.test(url);
}

document.querySelectorAll('.sidebar-link').forEach(link => {
  link.addEventListener('click', () => {
    document.querySelectorAll('.sidebar-link')
      .forEach(l => l.classList.remove('active'));

    link.classList.add('active');

    // acá después mostramos la sección correspondiente
    console.log('Ir a:', link.dataset.section);
  });
});
 

// CALENDARIO*********************************************************************************************CALENDARIO

function showSection(section) {
  document.getElementById("homeSection").style.display = "none";
  document.getElementById("lobbySection").style.display = "none";
  document.getElementById("agendaSection").style.display = "none";
  document.getElementById("calendarSection").style.display = "none";
  document.getElementById("repertorioSection").style.display = "none";

  // 🔒 ocultar siempre el botón
  document.getElementById("btnAgregarDia").classList.add("d-none");

  if (section === "home") {
    document.getElementById("homeSection").style.display = "block";
    renderHome?.(); // opcional, si existe
  }

  if (section === "lobby") {
    document.getElementById("lobbySection").style.display = "block";
    renderWeeklyEvents();
    loadImportant();
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

  if (section === "repertorio") {
    document.getElementById("repertorioSection").style.display = "block";
    renderRepertorioGlobal();
  }

}

let date = new Date();
let selectedDate = null;
const LS_EVENTS = "calendarEvents";
let events = JSON.parse(localStorage.getItem(LS_EVENTS)) || {};

function renderCalendar() {
  const monthYear = document.getElementById("monthYear");
  const daysContainer = document.getElementById("calendarDays");

  const year = date.getFullYear();
  const month = date.getMonth();

  monthYear.textContent = date.toLocaleString("es-ES", { month: "long", year: "numeric" })
  .toUpperCase();

  daysContainer.innerHTML = "";

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();

  for(let i=0;i<firstDay;i++){
    daysContainer.innerHTML += `<div class="day"></div>`;
  }

  for(let d=1; d<=daysInMonth; d++){
    const fullDate = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const event = events[fullDate];

    daysContainer.innerHTML += `
      <div class="day ${modoEdicionActivo ? 'editable' : ''}"
        onclick="${modoEdicionActivo 
          ? `openModal('${fullDate}')` 
          : `verEvento('${fullDate}')`}">
        <strong>${d}</strong>
        ${event ? `<div class="event">${event.time} - ${event.text}</div>` : ""}
      </div>
    `;
  }
}

function verEvento(fecha){
  const e = events[fecha];
  if(!e) return;

  const modal = new bootstrap.Modal(document.getElementById("eventModal"));

  document.getElementById("eventText").value = e.text;
  document.getElementById("eventTime").value = e.time;

  // bloquear edición
  document.getElementById("eventText").disabled = true;
  document.getElementById("eventTime").disabled = true;

  // ocultar botones
  document.getElementById("btnEliminarEvento").style.display = "none";
  document.getElementById("btnGuardarEvento").style.display = "none";

  modal.show();
}

function openModal(dateStr){
  if (!modoEdicionActivo) return;

  selectedDate = dateStr;
  const modal = new bootstrap.Modal(document.getElementById("eventModal"));

  document.getElementById("eventText").disabled = false;
  document.getElementById("eventTime").disabled = false;

  document.getElementById("eventText").value = events[dateStr]?.text || "";
  document.getElementById("eventTime").value = events[dateStr]?.time || "";

  // mostrar botones
  document.getElementById("btnEliminarEvento").style.display = "inline-block";
  document.getElementById("btnGuardarEvento").style.display = "inline-block";

  modal.show();
}

function saveEvent(){
  const text = document.getElementById("eventText").value;
  const time = document.getElementById("eventTime").value;

  if(!text){
    alert("Escribí una descripción");
    return;
  }

  events[selectedDate] = { text, time };
  localStorage.setItem(LS_EVENTS, JSON.stringify(events));
  bootstrap.Modal.getInstance(document.getElementById("eventModal")).hide();
  renderCalendar();
}

function deleteEvent(){
  if(!selectedDate) return;
  if(confirm("¿Eliminar evento?")){
    delete events[selectedDate];
    localStorage.setItem(LS_EVENTS, JSON.stringify(events));
    bootstrap.Modal.getInstance(document.getElementById("eventModal")).hide();
    renderCalendar();
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

renderCalendar();


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


const LS_IMPORTANT = "importantBox";

function saveImportant(){
  if(!modoEdicionActivo) return; // ⛔ solo en modo edición

  const text = document.getElementById("importantText").value;
  const fileInput = document.getElementById("importantFile");
  let fileData = null;

  if(fileInput.files.length > 0){
    const reader = new FileReader();
    reader.onload = function(){
      fileData = reader.result;
      localStorage.setItem(LS_IMPORTANT, JSON.stringify({text, file:fileData}));
      loadImportant();
    };
    reader.readAsDataURL(fileInput.files[0]);
  } else {
    localStorage.setItem(LS_IMPORTANT, JSON.stringify({text, file:null}));
    loadImportant();
  }
}


function loadImportant(){
  const data = JSON.parse(localStorage.getItem(LS_IMPORTANT));
  if(!data) return;

  document.getElementById("importantText").value = data.text || "";

  if(data.file){
    document.getElementById("importantPreview").innerHTML = `
      <a href="${data.file}" target="_blank">📎 Archivo adjunto</a>
    `;
  } else {
    document.getElementById("importantPreview").innerHTML = "";
  }
}

function deleteImportant(){
  if(!modoEdicionActivo) return; // ⛔ solo en modo edición
  localStorage.removeItem(LS_IMPORTANT);
  document.getElementById("importantText").value = "";
  document.getElementById("importantPreview").innerHTML = "";
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
  const cont = document.getElementById("repertorioGlobalList");
  cont.innerHTML = "";

  if (!repertorioGlobal || repertorioGlobal.length === 0) {
    cont.innerHTML = "<em>No hay canciones en el repertorio</em>";
    return;
  }

  const esMobile = window.innerWidth < 768; // 👈 detecta pantalla chica

  // 🔍 FILTRO POR TÍTULO
  const filtradas = repertorioGlobal
    .map((c, index) => ({ ...c, indexReal: index }))
    .filter(c =>
      c.titulo.toLowerCase().includes(filtroRepertorio)
    );

  if (filtradas.length === 0) {
    cont.innerHTML = "<em>No se encontraron canciones</em>";
    return;
  }

  // 📄 PAGINACIÓN
  const totalPaginas = Math.ceil(filtradas.length / CANCIONES_POR_PAGINA);
  paginaRepertorio = Math.min(paginaRepertorio, totalPaginas);

  const inicio = (paginaRepertorio - 1) * CANCIONES_POR_PAGINA;
  const visibles = filtradas.slice(inicio, inicio + CANCIONES_POR_PAGINA);

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

  localStorage.setItem(
    LS_REPERTORIO_GLOBAL,
    JSON.stringify(repertorioGlobal)
  );
}

function agregarCancionGlobal(){
  if(!modoEdicionActivo) return;

  // 🔹 primero sincronizamos lo que está escrito
  sincronizarRepertorioDesdeInputs();

  // 🔹 ahora sí agregamos uno nuevo vacío
  repertorioGlobal.push({
    titulo: "",
    tonalidad: "",
    youtube: "",
    letra: "",
    favorito: false,
    plays: 0
  });
  renderRepertorioGlobal();
}

function guardarRepertorioGlobal(){
  if(!modoEdicionActivo) return;

  sincronizarRepertorioDesdeInputs();

  alert("✅ Repertorio global guardado");
  renderRepertorioGlobal();
}

function eliminarCancionGlobal(index){
  if(!modoEdicionActivo) return; // 🔒 solo en modo edición

  if(!confirm("¿Eliminar esta canción del repertorio?")) return;

  repertorioGlobal.splice(index, 1);
  localStorage.setItem(LS_REPERTORIO_GLOBAL, JSON.stringify(repertorioGlobal));
  renderRepertorioGlobal();
}

function quitarCancionDelDia(event, fecha, index, boton){
  if(!modoEdicionActivo) return;

  event.preventDefault();
  event.stopPropagation(); // ⛔ evita que Bootstrap colapse y salte

  repertorios[fecha].splice(index, 1);
  localStorage.setItem(LS_REPERTORIO, JSON.stringify(repertorios));

  // 🧠 borrar SOLO el li visual (sin renderizar todo)
  const li = boton.closest("li");
  if(li) li.remove();
}

function sincronizarRepertorioDesdeInputs(){
  const cont = document.getElementById("repertorioGlobalList");
  const bloques = cont.querySelectorAll(".modal-bloque");

  bloques.forEach((b) => {
    const indexReal = parseInt(b.dataset.index);

    const titulo = b.querySelector(".titulo")?.value.trim();
    const tonalidad = b.querySelector(".tonalidad")?.value.trim();
    const youtube = b.querySelector(".youtube")?.value.trim();
    const letra = b.querySelector(".letra")?.value.trim();

    if (repertorioGlobal[indexReal]) {
      repertorioGlobal[indexReal] = {
        ...repertorioGlobal[indexReal], // conserva favorito, plays, etc
        titulo,
        tonalidad,
        youtube,
        letra
      };
    }
  });

  localStorage.setItem(
    LS_REPERTORIO_GLOBAL,
    JSON.stringify(repertorioGlobal)
  );
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

function playFromHome(index) {
  const cancion = repertorioGlobal[index];
  if (!cancion || !cancion.youtube) return;

  const videoId = extraerIdYoutube(cancion.youtube);
  if (!videoId) return;

  // ▶ reproducir
  const frame = document.getElementById("homeYoutubeFrame");
  frame.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;

  document.getElementById("homePlayer").classList.remove("d-none");

  // 🔥 contador real
  cancion.plays = (cancion.plays || 0) + 1;

  localStorage.setItem(
    LS_REPERTORIO_GLOBAL,
    JSON.stringify(repertorioGlobal)
  );

  renderHome();;
}

function renderHome() {
  const container = document.getElementById("homeCards");
  if (!container) return;

  container.innerHTML = "";

  // 🔥 ordenar por plays
  const masEscuchados = repertorioGlobal
    .map((c, index) => ({ ...c, indexReal: index })) // guardo índice real
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

    container.innerHTML += `
      <div class="col-6 col-md-2">
        <div class="card h-100">
          <img src="https://img.youtube.com/vi/${videoId}/hqdefault.jpg" class="card-img-top video-thumb">
          <div class="card-body text-center d-flex flex-column gap-2">
            <strong class="video-title">${c.titulo}</strong>
            <button class="btn btn-sm btn-dark mx-auto" onclick="playFromHome(${c.indexReal})">▶</button>
          </div>
        </div>
      </div>
    `;
  });

  // 🔹 Renderizo los últimos agregados en otro contenedor
  const containerUltimos = document.getElementById("ultimosCards");
  if (containerUltimos) {
    containerUltimos.innerHTML = "";
    ultimosAgregados.forEach(c => {
      const videoId = extraerIdYoutube(c.youtube);
      if (!videoId) return;

      containerUltimos.innerHTML += `
        <div class="col-6 col-md-2">
          <div class="card h-100">
            <img src="https://img.youtube.com/vi/${videoId}/hqdefault.jpg" class="card-img-top video-thumb">
            <div class="card-body text-center d-flex flex-column gap-2">
              <strong class="video-title">${c.titulo}</strong>
              <button class="btn btn-sm btn-dark mx-auto" onclick="playFromHome(${c.indexReal})">▶</button>
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
  renderHome();              // 👈 FALTABA ESTO
  renderHomeMasEscuchadas();
  renderHomeFavoritos();
});

function toggleFavorito(indexReal) {
  repertorioGlobal[indexReal].favorito =
    !repertorioGlobal[indexReal].favorito;

  sincronizarRepertorioDesdeInputs();
  
  localStorage.setItem(
    LS_REPERTORIO_GLOBAL,
    JSON.stringify(repertorioGlobal)
  );

  renderRepertorioGlobal();
  renderHomeFavoritos();
}

let favoritoActual = null;

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

function playFromFavoritos(index) {
  const cancion = repertorioGlobal[index];
  if (!cancion || !cancion.youtube) return;

  const videoId = extraerIdYoutube(cancion.youtube);
  if (!videoId) return;

  // ⛔ apagar player de video normal
  const videoFrame = document.getElementById("homeYoutubeFrame");
  videoFrame.src = "";

  // ▶ reproducir SOLO AUDIO (favoritos)
  const frame = document.getElementById("homeYoutubeFrameFav");
  frame.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;

  // sumar play
  cancion.plays = (cancion.plays || 0) + 1;

  localStorage.setItem(
    LS_REPERTORIO_GLOBAL,
    JSON.stringify(repertorioGlobal)
  );

  renderHomeMasEscuchadas();
}
