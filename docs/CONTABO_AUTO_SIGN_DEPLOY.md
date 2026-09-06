# Guía — Autofirma API en el VPS Contabo (junto a word-to-pdf)

Runbook para desplegar **solo el microservicio Node** de autofirma en el mismo Contabo donde ya corre `word-to-pdf`. No se publica el frontend React (sigue en Vercel).

**Prerrequisitos en el VPS:** Docker, nginx, UFW (22/80/443) y Certbot, tal como en la guía de word-to-pdf.

**Convenciones** — sustituye estos valores:

| Placeholder | Ejemplo |
|-------------|---------|
| `TU_IP_CONTABO` | IP pública del VPS |
| `auto-sign.tudominio.com` | Subdominio nuevo (distinto de word-to-pdf) |
| `IP_DE_LARAVEL` | IP pública del servidor Laravel |

---

## Qué se despliega

```
Laravel  --HTTPS + X-Api-Key-->  nginx :443  -->  127.0.0.1:3001  auto-sign
                                 nginx :443  -->  127.0.0.1:5000  word-to-pdf
```

El servicio es **stateless**: Laravel envía el PDF, la imagen de firma y el texto ancla. No hay `firma_default.png` ni perfiles guardados en el VPS.

---

## 1. DNS

Registro **A**:

```
Tipo:  A
Nombre: auto-sign
Valor: TU_IP_CONTABO
TTL:   300
```

Comprueba: `dig +short auto-sign.tudominio.com` → IP del VPS.

---

## 2. Código y secretos

```bash
mkdir -p ~/apps
cd ~/apps
git clone https://github.com/TU_USUARIO/firma-digital-documentos.git
cd firma-digital-documentos
```

Si el repo es privado, usa deploy key o HTTPS + token.

Crea un `.env` **solo con variables del server** (no hace falta copiar el bloque `VITE_*`):

```bash
cat > .env <<'EOF'
AUTO_SIGN_PORT=3001
LOG_LEVEL=info
AUTO_SIGN_API_KEY=
EOF

echo "AUTO_SIGN_API_KEY=$(openssl rand -hex 32)"
```

Pega el valor generado en `.env` y protege el archivo:

```bash
nano .env
chmod 600 .env
```

Guarda la misma `AUTO_SIGN_API_KEY` para Laravel.

---

## 3. Contenedor

```bash
docker compose up -d --build
docker compose ps
docker compose logs --tail=50
curl -s http://127.0.0.1:3001/api/health | python3 -m json.tool
```

Respuesta esperada:

```json
{
    "status": "ok",
    "version": "1.0.0"
}
```

El puerto **3001 no debe estar abierto a internet** (`ss -tlnp | grep 3001` → `127.0.0.1:3001`). word-to-pdf sigue en `127.0.0.1:5000`.

---

## 4. nginx + HTTPS

```bash
cd ~/apps/firma-digital-documentos
sudo cp deploy/nginx/auto-sign.conf /etc/nginx/sites-available/auto-sign
sudo nano /etc/nginx/sites-available/auto-sign
```

Cambia `auto-sign.tudominio.com`. Opcional y recomendado: descomenta `allow IP_DE_LARAVEL;` y `deny all;`.

No borres el sitio de word-to-pdf. Activa el nuevo:

```bash
sudo ln -sf /etc/nginx/sites-available/auto-sign /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d auto-sign.tudominio.com
```

Prueba:

```bash
curl -s https://auto-sign.tudominio.com/api/health | python3 -m json.tool
```

---

## 5. Contrato de la API

`POST /api/auto-sign`

**Headers**

| Header | Obligatorio | Uso |
|--------|-------------|-----|
| `X-Api-Key` | Sí | Misma `AUTO_SIGN_API_KEY` |
| `X-Reference-Id` | No | Se ecoa en la respuesta |

**Body (multipart)**

| Campo | Obligatorio | Descripción |
|-------|-------------|-------------|
| `pdf` | Sí | Archivo PDF (máx. 20 MB) |
| `signature` | Sí | PNG o JPEG (máx. 5 MB) |
| `search_text` | Sí | Texto ancla (nombre del firmante, etc.) |
| `search_page` | No | Página a buscar; si se omite, recorre todas |
| `secondary_anchor` | No | Ancla de respaldo (p. ej. `PRESIDENTE`) |
| `width` / `height` | No | Tamaño del sello en puntos PDF (default 38×50) |
| `offset_x` / `offset_y` | No | Ajuste fino sobre la posición detectada |

**Respuesta 200:** body = PDF (`signed.pdf`). Headers: `X-Signature-Detection-Method`, `X-Signature-Page`, `X-Duration-Ms`, `X-Reference-Id`.

**Errores JSON** (`{"error","code"}`): `401 unauthorized`, `400 missing_pdf|missing_signature|missing_search_text|invalid_pdf|invalid_signature`, `422 anchor_not_found|draw_out_of_page`, `413 file_too_large`, `429 rate_limited`.

`GET /api/health` no pide API key (Docker/nginx).

---

## 6. Integrar con Laravel

En el `.env` de Laravel:

```env
AUTO_SIGN_URL=https://auto-sign.tudominio.com
AUTO_SIGN_API_KEY=la_misma_clave_del_vps
AUTO_SIGN_TIMEOUT=60
```

Ejemplo de cliente (ejecutar en un **Job en cola**, no en el request HTTP del usuario):

```php
$response = Http::withHeaders([
        'X-Api-Key' => config('services.auto_sign.api_key'),
        'X-Reference-Id' => (string) $convenioId,
    ])
    ->timeout(config('services.auto_sign.timeout'))
    ->attach('pdf', file_get_contents($pdfPath), basename($pdfPath))
    ->attach('signature', file_get_contents($firmaPath), basename($firmaPath))
    ->post(rtrim(config('services.auto_sign.url'), '/') . '/api/auto-sign', [
        'search_text' => 'JORGE IVAN ÁLVAREZ SOTO',
        'search_page' => 2,
        'secondary_anchor' => 'PRESIDENTE',
    ]);

if ($response->failed()) {
    throw new RuntimeException($response->json('error') ?? $response->body());
}

Storage::put('pdfs/convenio-firmado.pdf', $response->body());
```

Para otro firmante o cliente: cambia `signature` + `search_text` (y anclas/tamaño si hace falta). No hay que redeployar el VPS.

---

## 7. Verificación

- [ ] `GET https://auto-sign.tudominio.com/api/health` → `"status":"ok"`
- [ ] `POST /api/auto-sign` sin API key → `401`
- [ ] `POST` con PDF + firma + `search_text` de un convenio real → PDF firmado
- [ ] Puerto 3001 solo en `127.0.0.1`
- [ ] Sitio word-to-pdf sigue respondiendo
- [ ] `.env` con permisos `600`

---

## 8. Mantenimiento

```bash
cd ~/apps/firma-digital-documentos
docker compose logs -f auto-sign
docker compose restart
git pull && docker compose up -d --build
docker stats auto-sign
```

El contenedor tiene `mem_limit: 768m` para no competir de más con LibreOffice. Si hay OOM, baja el volumen concurrente en Laravel o sube el límite con cuidado.

Para rotar la API key: genera otra, actualiza `.env` del VPS y el de Laravel, luego `docker compose up -d`.

---

## 9. Problemas frecuentes

**502 Bad Gateway** — el contenedor no escucha en 3001:

```bash
docker compose ps
curl http://127.0.0.1:3001/api/health
sudo tail -f /var/log/nginx/error.log
```

**401** — `AUTO_SIGN_API_KEY` de Laravel ≠ la del VPS. El header es `X-Api-Key`, no `Authorization`.

**422 `anchor_not_found`** — el PDF no contiene `search_text` (ni `secondary_anchor` si lo enviaste). Revisa OCR/texto real del documento.

**413** — aumenta `client_max_body_size` en nginx (ya 25M en la plantilla).

**word-to-pdf deja de responder** — son sitios nginx distintos; no elimines `sites-enabled/word-to-pdf`. Revisa `docker stats` por presión de RAM.
