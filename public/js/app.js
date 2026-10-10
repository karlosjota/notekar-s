(() => {
  const elements = {
    list: document.querySelector('#notes-list'),
    count: document.querySelector('#notes-count'),
    search: document.querySelector('#search-input'),
    newButton: document.querySelector('#new-note-button'),
    emptyNewButton: document.querySelector('#empty-new-note-button'),
    emptyState: document.querySelector('#empty-state'),
    form: document.querySelector('#note-form'),
    title: document.querySelector('#note-title'),
    content: document.querySelector('#note-content'),
    deleteButton: document.querySelector('#delete-note-button'),
    status: document.querySelector('#save-status'),
    updated: document.querySelector('#note-updated'),
    characterCount: document.querySelector('#character-count'),
    toast: document.querySelector('#toast'),
  };

  let notes = [];
  let activeNote = null;
  let dirty = false;
  let searchTimer;
  let toastTimer;

  async function request(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.error || 'No se pudo completar la petición.');
    }
    return response.status === 204 ? null : response.json();
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => elements.toast.classList.remove('visible'), 2600);
  }

  function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const today = new Date();
    const sameDay = date.toDateString() === today.toDateString();
    return new Intl.DateTimeFormat('es-ES', sameDay
      ? { hour: '2-digit', minute: '2-digit' }
      : { day: '2-digit', month: 'short' }).format(date);
  }

  function renderList() {
    elements.list.replaceChildren();
    elements.count.textContent = String(notes.length);

    if (notes.length === 0) {
      const message = document.createElement('p');
      message.className = 'sidebar-empty';
      message.textContent = elements.search.value.trim()
        ? 'No hay notas que coincidan con la búsqueda.'
        : 'Todavía no tienes notas. Crea una para empezar.';
      elements.list.append(message);
      return;
    }

    for (const note of notes) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `note-list-item${activeNote?.id === note.id ? ' active' : ''}`;
      button.setAttribute('aria-current', activeNote?.id === note.id ? 'true' : 'false');

      const title = document.createElement('span');
      title.className = 'note-list-title';
      title.textContent = note.title.trim() || 'Sin título';

      const preview = document.createElement('span');
      preview.className = 'note-list-preview';
      preview.textContent = note.content.trim() || 'Nota vacía';

      const date = document.createElement('span');
      date.className = 'note-list-date';
      date.textContent = formatDate(note.updated_at);

      button.append(title, preview, date);
      button.addEventListener('click', () => selectNote(note.id));
      elements.list.append(button);
    }
  }

  function renderEditor() {
    const hasNote = Boolean(activeNote);
    elements.emptyState.classList.toggle('d-none', hasNote);
    elements.form.classList.toggle('d-none', !hasNote);
    if (!hasNote) return;

    elements.title.value = activeNote.title;
    elements.content.value = activeNote.content;
    elements.updated.textContent = `Actualizada ${formatDate(activeNote.updated_at)}`;
    elements.status.textContent = 'Guardado';
    dirty = false;
    updateCharacterCount();
    renderList();
  }

  function updateCharacterCount() {
    const count = elements.content.value.length;
    elements.characterCount.textContent = `${count.toLocaleString('es-ES')} caracteres`;
  }

  async function loadNotes({ preserveActive = true } = {}) {
    const query = elements.search.value.trim();
    const path = query ? `/api/notes?q=${encodeURIComponent(query)}` : '/api/notes';
    notes = await request(path);

    if (preserveActive && activeNote) {
      const refreshed = notes.find((note) => note.id === activeNote.id);
      if (refreshed) activeNote = refreshed;
    }
    renderList();
  }

  async function saveActive({ quiet = false } = {}) {
    if (!activeNote || !dirty) return activeNote;
    elements.status.textContent = 'Guardando…';
    const updated = await request(`/api/notes/${activeNote.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        title: elements.title.value,
        content: elements.content.value,
      }),
    });
    activeNote = updated;
    dirty = false;
    elements.status.textContent = 'Guardado';
    elements.updated.textContent = `Actualizada ${formatDate(updated.updated_at)}`;
    await loadNotes();
    if (!quiet) showToast('Nota guardada');
    return updated;
  }

  async function selectNote(id) {
    try {
      await saveActive({ quiet: true });
      activeNote = await request(`/api/notes/${id}`);
      renderEditor();
    } catch (error) {
      showToast(error.message);
    }
  }

  async function createNote() {
    try {
      await saveActive({ quiet: true });
      const note = await request('/api/notes', {
        method: 'POST',
        body: JSON.stringify({ title: '', content: '' }),
      });
      activeNote = note;
      elements.search.value = '';
      await loadNotes();
      renderEditor();
      elements.title.focus();
    } catch (error) {
      showToast(error.message);
    }
  }

  async function deleteActive() {
    if (!activeNote || !window.confirm('¿Eliminar esta nota? Esta acción no se puede deshacer.')) return;
    try {
      await request(`/api/notes/${activeNote.id}`, { method: 'DELETE' });
      activeNote = null;
      dirty = false;
      await loadNotes({ preserveActive: false });
      if (notes[0]) {
        activeNote = notes[0];
        renderEditor();
      } else {
        renderEditor();
      }
      showToast('Nota eliminada');
    } catch (error) {
      showToast(error.message);
    }
  }

  function markDirty() {
    if (!activeNote) return;
    dirty = true;
    elements.status.textContent = 'Cambios sin guardar';
  }

  elements.form.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await saveActive();
    } catch (error) {
      elements.status.textContent = 'No se pudo guardar';
      showToast(error.message);
    }
  });

  elements.title.addEventListener('input', markDirty);
  elements.content.addEventListener('input', () => {
    markDirty();
    updateCharacterCount();
  });
  elements.deleteButton.addEventListener('click', deleteActive);
  elements.newButton.addEventListener('click', createNote);
  elements.emptyNewButton.addEventListener('click', createNote);
  elements.search.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(async () => {
      try {
        await loadNotes();
      } catch (error) {
        showToast(error.message);
      }
    }, 160);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      event.preventDefault();
      elements.search.focus();
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      elements.form.requestSubmit();
    }
  });

  async function start() {
    try {
      await loadNotes();
      if (notes[0]) {
        activeNote = notes[0];
        renderEditor();
      } else {
        renderEditor();
      }
    } catch (error) {
      showToast(error.message);
    }
  }

  start();
})();
