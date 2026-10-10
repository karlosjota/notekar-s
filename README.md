# Notekar

Aplicación de notas autoalojada con Node.js, Express y SQLite. El frontend está hecho con HTML, JavaScript y CSS sin framework; Bootstrap y Font Awesome se copian a `public/vendor` durante `npm install`, así que se sirven desde la propia aplicación y no desde una CDN.

## Requisitos

- Node.js 20 o posterior y npm
- Docker Engine con el plugin Docker Compose (para desplegar en contenedor)

## Desarrollo local

```bash
npm install
npm start
```

Abre <http://localhost:3000>. La base de datos se crea en `data/notekar.sqlite`; puedes cambiarla con `DB_PATH`.

## Docker

```bash
docker compose up -d --build
```

Por defecto, la app queda disponible en `http://127.0.0.1:3000`, lista para un proxy inverso instalado en el host. Puedes cambiar el puerto de escucha del host con `NOTEKAR_PORT=3001 docker compose up -d --build`. Los datos persisten en el volumen Docker `notekar_data`.

En el proxy inverso, configura el upstream como `http://127.0.0.1:3000` y asigna el dominio `notekar.karlosjota.eu` con TLS en el proxy. No se configura DNS ni certificados desde esta aplicación.

## API

- `GET /api/health`
- `GET /api/notes?q=texto`
- `POST /api/notes` con `{ "title": "Título", "content": "Texto" }`
- `GET /api/notes/:id`
- `PATCH /api/notes/:id` con `title` y/o `content`
- `DELETE /api/notes/:id`

## Copia de seguridad

Guarda el volumen Docker `notekar_data` (o el directorio indicado por `DB_PATH`). `node_modules/` y `data/` se excluyen de Git; el código y el lockfile sí se versionan.
