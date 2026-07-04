/* ============================================
   CENTRAL TV - Aplicación
   ============================================ */

const DATA_URL = 'noticias.json';
const MAX_VISIBLE = 20;

let noticias = [];
let ultimaBusquedaIds = [];  // IDs de las noticias encontradas en la última búsqueda
let buscando = false;

// ===================== INICIALIZACIÓN =====================

async function iniciar() {
  await cargarNoticias();
  document.getElementById('newsDate').value = hoy();
  document.getElementById('newsDate').max = hoy();
}

async function cargarNoticias() {
  // Cargar desde JSON precargado
  try {
    const resp = await fetch(DATA_URL);
    if (resp.ok) {
      const data = await resp.json();
      noticias = Array.isArray(data) ? data : [];
    }
  } catch (e) {
    console.log('Sin JSON remoto');
  }

  // Merge con localStorage
  const local = localStorage.getItem('central_noticias');
  if (local) {
    const locales = JSON.parse(local);
    locales.forEach(loc => {
      const idx = noticias.findIndex(n => n.id === loc.id);
      if (idx >= 0) noticias[idx] = loc;
      else noticias.push(loc);
    });
  }

  // Fecha-hora por defecto
  noticias.forEach(n => {
    if (!n.hora) n.hora = '00:00';
    if (!n.timestamp) n.timestamp = new Date(n.fecha + 'T' + n.hora).getTime();
  });

  ordenarNoticias();
  renderTodo();
}

function guardar() {
  localStorage.setItem('central_noticias', JSON.stringify(noticias));
}

function ordenarNoticias() {
  noticias.sort((a, b) => {
    const da = new Date(a.fecha + 'T' + (a.hora || '00:00'));
    const db = new Date(b.fecha + 'T' + (b.hora || '00:00'));
    return db - da;
  });
}

// ===================== UTILIDADES =====================

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

function formatearFecha(fecha) {
  const d = new Date(fecha + 'T12:00:00');
  return d.toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatearFechaCorta(fecha) {
  const d = new Date(fecha + 'T12:00:00');
  return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });
}

function generarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function notificar(msg, tipo) {
  const el = document.createElement('div');
  el.className = 'notification';
  if (tipo === 'ok') el.classList.add('notif-ok');
  if (tipo === 'warn') el.classList.add('notif-warn');
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ===================== RENDER =====================

function renderTodo() {
  renderNoticiasPublicas();
  renderAdminTable();
  actualizarContadores();
}

// --- VISTA PÚBLICA ---
function renderNoticiasPublicas() {
  const grid = document.getElementById('newsGrid');
  const maxPub = Math.min(noticias.length, MAX_VISIBLE);
  const visibles = noticias.slice(0, maxPub);

  if (visibles.length === 0) {
    grid.innerHTML = '<p class="loading">No hay noticias aún.</p>';
    return;
  }

  grid.innerHTML = visibles.map(n => `
    <article class="news-card" data-id="${n.id}">
      <span class="category">${n.seccion || ''}</span>
      <div class="date">${formatearFecha(n.fecha)}</div>
      <h3>${n.titulo}</h3>
      <p class="summary">${n.bajada || ''}</p>
      ${n.tags ? `<div class="tags">${n.tags.split(',').map(t => `<span class="tag">${t.trim()}</span>`).join('')}</div>` : ''}
    </article>
  `).join('');

  grid.querySelectorAll('.news-card').forEach(card => {
    card.addEventListener('click', () => {
      const n = noticias.find(x => x.id === card.dataset.id);
      if (n) abrirModal(n);
    });
  });

  const badge = document.getElementById('lastUpdate');
  if (noticias.length > 0) {
    badge.textContent = `Actualizado: ${formatearFecha(noticias[0].fecha)}`;
  }
}

// --- VISTA ADMIN ---
function renderAdminTable() {
  const tbody = document.getElementById('adminTableBody');
  const maxAdmin = Math.min(noticias.length, MAX_VISIBLE);
  const visibles = noticias.slice(0, maxAdmin);

  if (visibles.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-td">No hay noticias. Presiona "Buscar noticias" o "Redactar noticia".</td></tr>`;
    return;
  }

  tbody.innerHTML = visibles.map(n => {
    const esNueva = ultimaBusquedaIds.includes(n.id);
    return `
      <tr class="${esNueva ? 'row-new' : ''}">
        <td class="col-status">${esNueva ? '<span class="tag-nueva">Nueva</span>' : ''}</td>
        <td class="col-title">
          <span class="td-title">${n.titulo}</span>
          <span class="td-source">${n.fuente || ''}</span>
        </td>
        <td class="col-section">${n.seccion || '-'}</td>
        <td class="col-date">${formatearFechaCorta(n.fecha)}</td>
        <td class="col-actions">
          <button class="btn-action btn-view" data-id="${n.id}" title="Ver">👁️</button>
          <button class="btn-action btn-edit" data-id="${n.id}" title="Editar">✏️</button>
          <button class="btn-action btn-delete" data-id="${n.id}" title="Eliminar">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');

  // Eventos de botones
  tbody.querySelectorAll('.btn-view').forEach(b => {
    b.addEventListener('click', () => {
      const n = noticias.find(x => x.id === b.dataset.id);
      if (n) abrirModal(n);
    });
  });

  tbody.querySelectorAll('.btn-edit').forEach(b => {
    b.addEventListener('click', () => {
      const n = noticias.find(x => x.id === b.dataset.id);
      if (n) abrirEditor(n);
    });
  });

  tbody.querySelectorAll('.btn-delete').forEach(b => {
    b.addEventListener('click', () => {
      const id = b.dataset.id;
      if (confirm('¿Eliminar esta noticia?')) {
        noticias = noticias.filter(x => x.id !== id);
        ultimaBusquedaIds = ultimaBusquedaIds.filter(x => x !== id);
        guardar();
        renderTodo();
        notificar('🗑️ Noticia eliminada', 'warn');
      }
    });
  });
}

function actualizarContadores() {
  document.getElementById('newsCount').textContent = `${noticias.length} noticia${noticias.length !== 1 ? 's' : ''}`;
  const total = noticias.length;
  const mostrando = Math.min(total, MAX_VISIBLE);
  document.getElementById('adminFooterInfo').textContent = mostrando < total
    ? `Mostrando ${mostrando} de ${total} noticias (máx. ${MAX_VISIBLE})`
    : `Mostrando ${mostrando} noticia${mostrando !== 1 ? 's' : ''}`;
  if (noticias.length > MAX_VISIBLE) {
    document.getElementById('adminTotalInfo').textContent = `📦 ${noticias.length - MAX_VISIBLE} noticias en archivo`;
  } else {
    document.getElementById('adminTotalInfo').textContent = '';
  }
}

// ===================== MODAL: VER NOTICIA =====================

function abrirModal(n) {
  const modal = document.getElementById('newsModal');
  const body = document.getElementById('modalBody');
  body.innerHTML = `
    <div class="modal-news">
      <span class="category">${n.seccion || ''}</span>
      <div class="date">${formatearFecha(n.fecha)}</div>
      <h2>${n.titulo}</h2>
      <p class="summary">${n.bajada || ''}</p>
      <div class="content">${n.contenido || n.texto || n.bajada || 'Sin contenido completo'}</div>
      ${n.fuente ? `<div class="source">Fuente: ${n.fuente}</div>` : ''}
      ${n.tags ? `<div class="tags">${n.tags.split(',').map(t => `<span class="tag">${t.trim()}</span>`).join('')}</div>` : ''}
    </div>
  `;
  modal.classList.remove('hidden');
}

// ===================== MODAL: EDITOR =====================

function abrirEditor(n) {
  const modal = document.getElementById('editModal');
  document.getElementById('editModalTitle').textContent = n ? 'Editar noticia' : 'Redactar noticia';
  document.getElementById('btnSaveNews').textContent = n ? 'Guardar cambios' : 'Publicar noticia';

  document.getElementById('editId').value = n ? n.id : '';
  document.getElementById('newsDate').value = n ? n.fecha : hoy();
  document.getElementById('newsTitle').value = n ? n.titulo : '';
  document.getElementById('newsCategory').value = n ? n.seccion : '';
  document.getElementById('newsSummary').value = n ? n.bajada : '';
  document.getElementById('newsContent').value = n ? (n.contenido || n.texto || '') : '';
  document.getElementById('newsTags').value = n ? (n.tags || '') : '';
  document.getElementById('newsSource').value = n ? (n.fuente || '') : '';
  modal.classList.remove('hidden');
}

function cerrarEditor() {
  document.getElementById('editModal').classList.add('hidden');
}

// ===================== BÚSQUEDA DE NOTICIAS (MANUAL) =====================

async function buscarNoticias() {
  if (buscando) return;
  buscando = true;
  const btn = document.getElementById('btnBuscar');
  btn.disabled = true;
  btn.textContent = '⏳ Buscando...';

  try {
    // Simular búsqueda: en un entorno real esto llamaría a una API
    // Por ahora cargamos el JSON fresco y detectamos diferencias
    const resp = await fetch(`${DATA_URL}?t=${Date.now()}`);
    if (!resp.ok) throw new Error('No se pudo cargar');

    const frescas = await resp.json();
    const existentes = new Set(noticias.map(n => n.titulo + '|' + n.fecha));

    const nuevas = frescas.filter(f => !existentes.has(f.titulo + '|' + f.fecha));

    if (nuevas.length === 0) {
      // Limpiar etiquetas viejas
      ultimaBusquedaIds = [];
      notificar('✅ No hay noticias nuevas', 'ok');
      renderTodo();
      buscando = false;
      btn.disabled = false;
      btn.textContent = '🔍 Buscar noticias';
      return;
    }

    // Asignar IDs y timestamps
    const ahora = Date.now();
    nuevas.forEach((n, i) => {
      n.id = generarId();
      n.timestamp = ahora + i;
      n.hora = n.hora || new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
      n.contenido = n.contenido || n.texto || n.bajada || '';
    });

    // Limpiar etiquetas viejas ANTES de agregar nuevas
    ultimaBusquedaIds = [];

    // Agregar al inicio
    noticias = [...nuevas, ...noticias];
    guardar();
    ordenarNoticias();

    // Marcar las nuevas
    ultimaBusquedaIds = nuevas.map(n => n.id);

    renderTodo();
    notificar(`✅ ${nuevas.length} noticia${nuevas.length > 1 ? 's' : ''} nueva${nuevas.length > 1 ? 's' : ''} encontrada${nuevas.length > 1 ? 's' : ''}`, 'ok');
  } catch (e) {
    notificar('❌ Error al buscar noticias', 'warn');
    console.error(e);
  }

  buscando = false;
  btn.disabled = false;
  btn.textContent = '🔍 Buscar noticias';
}

// ===================== EVENTOS =====================

// Admin toggle
document.getElementById('btnAdmin').addEventListener('click', () => {
  document.getElementById('publicView').classList.add('hidden');
  document.getElementById('adminView').classList.remove('hidden');
  renderAdminTable();
  actualizarContadores();
});

document.getElementById('btnCloseAdmin').addEventListener('click', () => {
  document.getElementById('adminView').classList.add('hidden');
  document.getElementById('publicView').classList.remove('hidden');
});

// Buscar noticias
document.getElementById('btnBuscar').addEventListener('click', buscarNoticias);

// Redactar noticia
document.getElementById('btnRedactar').addEventListener('click', () => abrirEditor(null));

// Guardar / Publicar noticia
document.getElementById('newsForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const editId = document.getElementById('editId').value;

  const datos = {
    fecha: document.getElementById('newsDate').value,
    hora: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
    titulo: document.getElementById('newsTitle').value,
    seccion: document.getElementById('newsCategory').value,
    bajada: document.getElementById('newsSummary').value,
    contenido: document.getElementById('newsContent').value,
    tags: document.getElementById('newsTags').value,
    fuente: document.getElementById('newsSource').value,
    timestamp: Date.now()
  };

  if (editId) {
    // Editar existente
    const idx = noticias.findIndex(n => n.id === editId);
    if (idx >= 0) {
      noticias[idx] = { ...noticias[idx], ...datos };
    }
    notificar('✅ Noticia actualizada', 'ok');
  } else {
    // Nueva
    datos.id = generarId();
    noticias.unshift(datos);
    notificar('✅ Noticia publicada', 'ok');
  }

  guardar();
  ordenarNoticias();
  cerrarEditor();
  renderTodo();
});

// Cerrar modales
document.querySelectorAll('.modal-close').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.closest('.modal').classList.add('hidden');
  });
});

document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });
});

// ===================== INICIO =====================
document.addEventListener('DOMContentLoaded', iniciar);
