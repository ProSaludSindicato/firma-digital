# Firma Automática: Funcional y Técnica

Este documento describe el comportamiento actual del flujo de firma automática en modos individual y masivo.

## Objetivo funcional

- Permitir firmar documentos PDF con una imagen de firma.
- Detectar automáticamente la posición de firma del bloque del presidente.
- Soportar procesamiento:
  - Individual (1 PDF)
  - Masivo (N PDFs)
- En modo masivo, descargar los exitosos en un ZIP.

## Flujo funcional

### 1) Carga y validación

- El usuario carga uno o más PDFs.
- Validaciones de PDF:
  - Tipo: `application/pdf`
  - Tamaño máximo: 20 MB
  - Integridad básica: cabecera `%PDF`
- El usuario carga la imagen de firma (PNG/JPG).

### 2) Detección automática de posición

- Se ejecuta `PDFJSTextExtractionProvider` (sin IA remota).
- Busca anclas de texto:
  - `"JORGE IVAN ÁLVAREZ SOTO"`
  - `"PRESIDENTE"`
- Intenta detectar la línea gráfica horizontal de firma en la zona izquierda.
- Si no encuentra la línea gráfica pero sí ancla, aplica offset local calibrado.
- Si no puede detectar posición de forma confiable, el documento falla:
  - Individual: no permite procesar ese PDF.
  - Masivo: ese archivo queda en estado `error`.

### 3) Firma del PDF

- Inserta la imagen con `pdf-lib` en coordenadas calculadas.
- Valida que la posición y tamaño estén dentro de la página.
- Genera blob del PDF firmado.

### 4) Entrega

- Individual: preview y descarga de `*_firmado.pdf`.
- Masivo: ZIP `convenios_firmados.zip` con documentos `done`.

## Arquitectura técnica

## Componentes y hooks principales

- `src/pages/AutoSign.tsx`
  - Orquesta modos individual/masivo.
- `src/components/AutoSignatureUploader.tsx`
  - UI de carga de archivos e imagen.
  - Detección automática en modo individual.
- `src/hooks/useAutoPDFSigner.ts`
  - Estado y operaciones del flujo individual.
- `src/hooks/useAutoPDFBatchSigner.ts`
  - Estado por archivo y procesamiento concurrente del flujo masivo.

## Servicios/librerías de PDF

- `src/lib/signatureLocationService.ts`
  - `PDFJSTextExtractionProvider`: detección local con `pdfjs-dist`.
  - `createSignatureLocationProvider()`: devuelve únicamente ese proveedor.
- `src/lib/pdfSigningUtils.ts`
  - `signPDFWithImage(...)`: lógica pura para insertar firma en PDF.
- `src/lib/validation.ts`
  - Validaciones de archivos (PDF/imagen).

## Concurrencia en modo masivo

- `useAutoPDFBatchSigner` usa un pool con concurrencia máxima de 3 tareas.
- Estados por archivo:
  - `pending` -> `detecting` -> `signing` -> `done | error`

## Manejo de errores

- No hay fallback a IA remota.
- Si la detección no funciona para un documento:
  - Se lanza error explícito de detección.
  - No se firma ese archivo.
- Errores de firma (posición fuera de página, PDF inválido, etc.) se reportan por archivo.

## Dependencias relevantes

- `pdfjs-dist`: detección de texto y geometría.
- `pdf-lib`: inserción de imagen en PDF.
- `jszip`: empaquetado ZIP en modo masivo.
- `@supabase/supabase-js`: presente en proyecto, pero no se usa para fallback de detección en este flujo.

