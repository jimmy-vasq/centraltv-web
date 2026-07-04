/* ============================================
   CENTRAL TV - Aplicación
   ============================================ */

// Los datos se guardan en /data/noticias.json dentro del proyecto
// Para entorno local sin backend, usamos localStorage
// Para producción, se puede conectar a un backend o API

const DATA_URL = 'noticias.json';

let noticias = [];

// Cargar noticias guardadas o precargadas
async function cargarNoticias() {
  try {
    // 1. Intenta cargar desde el JSON del servidor
    const resp = await fetch(DATA_URL);
    if (resp.ok) {
      const data = await resp.json();
      noticias = Array.isArray(data) ? data : [];
    }
  } catch (e) {
    console.log('No hay JSON remoto, usando localStorage');
  }

  // 2. Merge con localStorage (ediciones locales)
  const localData = localStorage.getItem('central_noticias');
  if (localData) {
    const localNoticias = JSON.parse(localData);
    // Combinar: las locales reemplazan si tienen mismo id
    localNoticias.forEach(localN => {
      const idx = noticias.findIndex(n => n.id === localN.id);
      if (idx >= 0) {
        noticias[idx] = localN;
      } else {
        noticias.push(localN);
      }
    });
  }

  // Ordenar por fecha descendente
  noticias.sort((a, b) => new Date(b.fecha + 'T' + (b.hora || '00:00')) - new Date(a.fecha + 'T' + (a.hora || '00:00')));
  renderNoticias();
}

function guardarLocal() {
  localStorage.setItem('central_noticias', JSON.stringify(noticias));
}

function notificar(msg) {
  const el = document.createElement('div');
  el.className = 'notification';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function formatearFecha(fecha) {
  const d = new Date(fecha + 'T12:00:00');
  return d.toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Generar ID único
function generarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// RENDER: Lista de noticias
function renderNoticias() {
  const grid = document.getElementById('newsGrid');
  if (noticias.length === 0) {
    grid.innerHTML = '<p class="loading">No hay noticias aún. Ve al panel Admin para publicar.</p>';
    return;
  }

  grid.innerHTML = noticias.map(n => `
    <article class="news-card" data-id="${n.id}">
      <span class="category">${n.seccion || n.categoria || ''}</span>
      <div class="date">${formatearFecha(n.fecha)}</div>
      <h3>${n.titulo}</h3>
      <p class="summary">${n.bajada || n.resumen || ''}</p>
      ${n.tags ? `<div class="tags">${n.tags.split(',').map(t => `<span class="tag">${t.trim()}</span>`).join('')}</div>` : ''}
    </article>
  `).join('');

  // Click para ver detalle
  grid.querySelectorAll('.news-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      const n = noticias.find(x => x.id === id);
      if (n) abrirModal(n);
    });
  });

  const lastUpdate = document.getElementById('lastUpdate');
  if (noticias.length > 0) {
    const ultima = noticias[0];
    lastUpdate.textContent = `Actualizado: ${formatearFecha(ultima.fecha)}`;
  }
}

// MODAL: Ver noticia completa
function abrirModal(n) {
  const modal = document.getElementById('newsModal');
  const body = document.getElementById('modalBody');
  body.innerHTML = `
    <div class="modal-news">
      <span class="category">${n.seccion || n.categoria || ''}</span>
      <div class="date">${formatearFecha(n.fecha)}</div>
      <h2>${n.titulo}</h2>
      <p class="summary">${(n.bajada || n.resumen || '')}</p>
      <div class="content">${(n.contenido || n.texto || n.bajada || 'Sin contenido completo')}</div>
      ${n.fuente ? `<div class="source">Fuente: ${n.fuente}</div>` : ''}
      ${n.tags ? `<div class="tags">${n.tags.split(',').map(t => `<span class="tag">${t.trim()}</span>`).join('')}</div>` : ''}
    </div>
  `;
  modal.classList.remove('hidden');
}

// Cargar noticias desde los archivos de redacción
async function cargarDesdeRedaccion() {
  // Busca redacciones en la carpeta centraltv (relativo al proyecto)
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  
  // Intentamos cargar archivos de redacción recientes
  const archivos = [
    `../centraltv/redaccionCentral_${timestamp}_*.txt`,
  ];
  
  // Por ahora, las noticias se cargan desde noticias.json o localStorage
  console.log('Noticias cargadas:', noticias.length);
}

// ADMIN TOGGLE
document.getElementById('btnAdmin').addEventListener('click', () => {
  document.getElementById('publicView').classList.add('hidden');
  document.getElementById('adminView').classList.remove('hidden');
  // Cargar fecha actual
  document.getElementById('newsDate').value = new Date().toISOString().slice(0, 10);
  cargarHistorial();
});

document.getElementById('btnCloseAdmin').addEventListener('click', () => {
  document.getElementById('adminView').classList.add('hidden');
  document.getElementById('publicView').classList.remove('hidden');
});

// ADMIN TABS
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    if (tab.dataset.tab === 'history') cargarHistorial();
  });
});

// ADMIN FORM
document.getElementById('newsForm').addEventListener('submit', (e) => {
  e.preventDefault();

  const noticia = {
    id: generarId(),
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

  noticias.unshift(noticia);
  guardarLocal();
  renderNoticias();
  notificar('✅ Noticia publicada correctamente');
  e.target.reset();
  document.getElementById('newsDate').value = new Date().toISOString().slice(0, 10);
  cargarHistorial();
});

// ADMIN HISTORIAL
function cargarHistorial() {
  const list = document.getElementById('historyList');
  if (!list) return;
  
  const sorted = [...noticias].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  if (sorted.length === 0) {
    list.innerHTML = '<p class="loading">No hay noticias en el historial.</p>';
    return;
  }
  list.innerHTML = sorted.map(n => `
    <div class="history-item">
      <span class="h-title">${n.titulo}</span>
      <span>${formatearFecha(n.fecha)} — ${n.seccion || 'General'} ${n.fuente ? '| ' + n.fuente : ''}</span>
    </div>
  `).join('');
}

// MODAL CLOSE
document.querySelector('.modal-close').addEventListener('click', () => {
  document.getElementById('newsModal').classList.add('hidden');
});
document.getElementById('newsModal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) {
    document.getElementById('newsModal').classList.add('hidden');
  }
});

// INICIAR
document.addEventListener('DOMContentLoaded', () => {
  cargarNoticias();
  document.getElementById('newsDate').value = new Date().toISOString().slice(0, 10);
});
