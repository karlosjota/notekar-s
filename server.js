const path = require('node:path');
const express = require('express');
const db = require('./db');

const app = express();
const port = Number.parseInt(process.env.PORT || '3000', 10);
const publicDir = path.join(__dirname, 'public');
const maxNoteLength = 200_000;

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

const listNotes = db.prepare(`
  SELECT id, title, content, created_at, updated_at
  FROM notes
  WHERE title LIKE ? ESCAPE '\\' OR content LIKE ? ESCAPE '\\'
  ORDER BY updated_at DESC, id DESC
`);
const getNote = db.prepare(`
  SELECT id, title, content, created_at, updated_at
  FROM notes
  WHERE id = ?
`);
const insertNote = db.prepare(`
  INSERT INTO notes (title, content)
  VALUES (?, ?)
`);
const updateNote = db.prepare(`
  UPDATE notes
  SET title = ?, content = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE id = ?
`);
const deleteNote = db.prepare('DELETE FROM notes WHERE id = ?');

function parseId(value) {
  const id = Number.parseInt(value, 10);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function escapeLike(value) {
  return value.replace(/[\\%_]/g, '\\$&');
}

function validateText(value, field, maxLength = maxNoteLength) {
  if (typeof value !== 'string') {
    return `${field} debe ser texto.`;
  }
  if (value.length > maxLength) {
    return `${field} no puede superar ${maxLength} caracteres.`;
  }
  return null;
}

app.get('/api/health', (_req, res) => {
  db.prepare('SELECT 1').get();
  res.json({ ok: true });
});

app.get('/api/notes', (req, res) => {
  const query = typeof req.query.q === 'string' ? escapeLike(req.query.q.trim()) : '';
  const pattern = `%${query}%`;
  res.json(listNotes.all(pattern, pattern));
});

app.post('/api/notes', (req, res, next) => {
  try {
    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body)
      ? req.body
      : {};
    const title = body.title === undefined ? 'Sin título' : body.title;
    const content = body.content === undefined ? '' : body.content;
    const titleError = validateText(title, 'El título', 200);
    const contentError = validateText(content, 'El contenido');

    if (titleError || contentError) {
      return res.status(400).json({ error: titleError || contentError });
    }

    const result = insertNote.run(title, content);
    res.status(201).json(getNote.get(result.lastInsertRowid));
  } catch (error) {
    next(error);
  }
});

app.get('/api/notes/:id', (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Identificador no válido.' });

  const note = getNote.get(id);
  if (!note) return res.status(404).json({ error: 'Nota no encontrada.' });
  res.json(note);
});

app.patch('/api/notes/:id', (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Identificador no válido.' });

    const current = getNote.get(id);
    if (!current) return res.status(404).json({ error: 'Nota no encontrada.' });

    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body)
      ? req.body
      : {};
    const title = Object.hasOwn(body, 'title') ? body.title : current.title;
    const content = Object.hasOwn(body, 'content') ? body.content : current.content;
    const titleError = validateText(title, 'El título', 200);
    const contentError = validateText(content, 'El contenido');

    if (titleError || contentError) {
      return res.status(400).json({ error: titleError || contentError });
    }

    updateNote.run(title, content, id);
    res.json(getNote.get(id));
  } catch (error) {
    next(error);
  }
});

app.delete('/api/notes/:id', (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Identificador no válido.' });

  const result = deleteNote.run(id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Nota no encontrada.' });
  }
  res.status(204).end();
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Ruta de API no encontrada.' });
});

app.use(express.static(publicDir, { extensions: ['html'] }));

app.use((error, _req, res, _next) => {
  console.error(error);
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ error: 'El cuerpo JSON no es válido.' });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: 'La petición es demasiado grande.' });
  }
  res.status(500).json({ error: 'Error interno del servidor.' });
});

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Notekar escuchando en http://0.0.0.0:${port}`);
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
