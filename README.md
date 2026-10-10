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

### Proxy inverso con Apache2

La publicación Docker está ligada a `127.0.0.1:3000`, para que Apache en el VPS pueda ser el único servicio que exponga la app. Los ejemplos están en `deploy/apache2/`.

Antes de empezar, apunta los registros DNS `A` (y `AAAA`, si lo usas) de `notekar.karlosjota.eu` al VPS y permite el tráfico entrante en los puertos 80 y 443. En el servidor:

```bash
sudo a2enmod proxy proxy_http headers rewrite ssl
sudo mkdir -p /var/www/letsencrypt/.well-known/acme-challenge
sudo cp deploy/apache2/notekar-http.conf /etc/apache2/sites-available/notekar.conf
sudo a2ensite notekar.conf
sudo apachectl configtest
sudo systemctl reload apache2
```

El vhost HTTP sirve el challenge ACME y reenvía el resto a la app. Emite el certificado sin detener Apache ni los demás servicios:

```bash
sudo certbot certonly --webroot \
  -w /var/www/letsencrypt \
  -d notekar.karlosjota.eu
```

Cuando Certbot haya creado los archivos del certificado, instala el vhost HTTPS final:

```bash
sudo cp deploy/apache2/notekar-https.conf /etc/apache2/sites-available/notekar.conf
sudo apachectl configtest
sudo systemctl reload apache2
```

El vhost conserva la excepción ACME para futuras renovaciones. Para que Apache recargue el certificado tras cada renovación, instala un deploy hook:

```bash
printf '#!/bin/sh\nsystemctl reload apache2\n' | sudo tee /etc/letsencrypt/renewal-hooks/deploy/reload-apache.sh
sudo chmod 755 /etc/letsencrypt/renewal-hooks/deploy/reload-apache.sh
```

No ejecutes `docker compose down -v`: eliminaría el volumen `notekar_data` con la base de datos. No se modifica Apache, DNS ni Certbot desde este repositorio.

## API

- `GET /api/health`
- `GET /api/notes?q=texto`
- `POST /api/notes` con `{ "title": "Título", "content": "Texto" }`
- `GET /api/notes/:id`
- `PATCH /api/notes/:id` con `title` y/o `content`
- `DELETE /api/notes/:id`

## Copia de seguridad

Guarda el volumen Docker `notekar_data` (o el directorio indicado por `DB_PATH`). `node_modules/` y `data/` se excluyen de Git; el código y el lockfile sí se versionan.
