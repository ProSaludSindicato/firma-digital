# 📝 Firma Digital de Documentos PDF

Una aplicación web moderna y profesional para firmar documentos PDF de manera digital. Permite a los usuarios subir documentos PDF, dibujar o cargar su firma, posicionarla en el documento y descargar el PDF firmado.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## ✨ Características Principales

### 🎯 Funcionalidades Core
- **Carga de PDFs**: Arrastra y suelta o selecciona archivos PDF (máx. 20MB)
- **Firma Digital**: 
  - Dibuja tu firma directamente en el canvas
  - Sube una imagen de tu firma (PNG/JPEG)
  - Vista previa antes de guardar
- **Posicionamiento Intuitivo**: 
  - Haz clic en cualquier parte del PDF para colocar la firma
  - Arrastra y redimensiona la firma con controles visuales
  - Navegación entre páginas con miniaturas
- **Vista Previa en Tiempo Real**: Visualiza cómo quedará la firma antes de descargar
- **Descarga del PDF Firmado**: Descarga el documento con la firma integrada

### 🚀 Características Avanzadas
- **Validación de Archivos**: 
  - Validación de tipo, tamaño e integridad de PDFs
  - Validación de imágenes de firma (tipo, tamaño, dimensiones)
- **Compresión de Imágenes**: Optimización automática de firmas para reducir el tamaño del PDF final
- **Optimización de Performance**:
  - Memoización de componentes React
  - Lazy loading de miniaturas
  - Compresión inteligente de imágenes
- **Manejo de Errores**: 
  - Error Boundary para capturar errores inesperados
  - Notificaciones toast informativas
  - Mensajes de error descriptivos
- **Atajos de Teclado**:
  - `Ctrl/Cmd + S`: Finalizar y enviar / Descargar
  - Navegación de páginas con flechas
  - Zoom con `+` y `-`
- **Diseño Responsive**: 
  - Optimizado para móviles, tablets y desktop
  - Controles adaptativos según el tamaño de pantalla
  - Soporte para orientación horizontal/vertical

## 🛠️ Tecnologías Utilizadas

### Frontend
- **React 18** - Biblioteca de UI
- **TypeScript** - Tipado estático
- **Vite** - Build tool y dev server
- **Tailwind CSS** - Framework de estilos
- **shadcn/ui** - Componentes UI de alta calidad

### Bibliotecas Especializadas
- **PDF.js** (`pdfjs-dist`) - Renderizado y visualización de PDFs
- **pdf-lib** - Manipulación y edición de PDFs
- **react-signature-canvas** - Canvas para dibujar firmas
- **react-router-dom** - Enrutamiento
- **lucide-react** - Iconos

### Herramientas de Desarrollo
- **Vitest** - Framework de testing
- **ESLint** - Linter
- **TypeScript ESLint** - Linting para TypeScript

## 📋 Requisitos Previos

- **Node.js** >= 18.x
- **npm** >= 9.x o **bun** >= 1.x

## 🚀 Instalación

1. **Clona el repositorio**:
```bash
git clone <YOUR_GIT_URL>
cd firma-digital-documentos
```

2. **Instala las dependencias**:
```bash
npm install
# o
bun install
```

3. **Inicia el servidor de desarrollo**:
```bash
npm run dev
# o
bun run dev
```

4. **Abre tu navegador** en `http://localhost:5173`

## 📖 Uso

### Flujo Básico

1. **Cargar PDF**: 
   - Arrastra y suelta un archivo PDF en el área de carga
   - O haz clic para seleccionar un archivo

2. **Colocar Firma**:
   - Haz clic en cualquier parte del PDF donde quieras colocar la firma
   - Aparecerá un botón "Firmar" en esa ubicación

3. **Crear Firma**:
   - **Dibujar**: Usa el mouse o el dedo para dibujar tu firma
   - **Subir**: Selecciona una imagen PNG o JPEG de tu firma
   - **Vista Previa**: Revisa cómo quedará antes de guardar

4. **Ajustar Posición**:
   - Arrastra la firma para moverla
   - Usa los controles para redimensionar
   - Navega entre páginas si es necesario

5. **Descargar**:
   - Haz clic en "Finalizar y Enviar" en el header
   - Confirma la acción
   - El PDF firmado se descargará automáticamente

### Atajos de Teclado

- `Ctrl/Cmd + S`: Finalizar y enviar o descargar PDF
- `←` / `→`: Navegar entre páginas
- `+` / `-`: Zoom in/out
- `Esc`: Cerrar modales

## 📁 Estructura del Proyecto

```
firma-digital-documentos/
├── public/                 # Archivos estáticos
├── src/
│   ├── components/        # Componentes React
│   │   ├── ui/           # Componentes UI de shadcn
│   │   ├── ErrorBoundary.tsx
│   │   ├── Header.tsx
│   │   ├── PDFPageView.tsx
│   │   ├── PDFThumbnails.tsx
│   │   ├── PDFUploader.tsx
│   │   ├── PDFViewer.tsx
│   │   ├── SignatureModal.tsx
│   │   ├── SignaturePlaceholder.tsx
│   │   └── SignatureTutorial.tsx
│   ├── hooks/            # Custom hooks
│   │   ├── use-mobile.tsx
│   │   ├── use-toast.ts
│   │   ├── useKeyboardShortcuts.ts
│   │   └── usePDFSigner.ts
│   ├── lib/              # Utilidades
│   │   ├── imageCompression.ts
│   │   ├── utils.ts
│   │   └── validation.ts
│   ├── pages/            # Páginas
│   │   ├── Index.tsx
│   │   └── NotFound.tsx
│   ├── App.tsx           # Componente raíz
│   ├── main.tsx         # Punto de entrada
│   └── index.css        # Estilos globales
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 🔧 Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Inicia servidor de desarrollo

# Build
npm run build            # Build de producción
npm run build:dev        # Build de desarrollo

# Testing
npm run test             # Ejecuta tests
npm run test:watch       # Tests en modo watch

# Linting
npm run lint             # Ejecuta ESLint

# Preview
npm run preview          # Preview del build de producción
```

## 🎨 Características Técnicas

### Validación de Archivos

- **PDFs**: 
  - Tipo: `application/pdf`
  - Tamaño máximo: 20MB

## Firma automática (documentación)

- Funcional y técnica: `docs/auto-signature.md`
- Incluye arquitectura, flujo individual/masivo, manejo de errores y dependencias usadas.
  - Validación de integridad (header PDF)
  
- **Imágenes de Firma**:
  - Tipos: PNG, JPEG
  - Tamaño máximo: 5MB
  - Dimensiones máximas: 2000x2000px

### Compresión de Imágenes

- **Firmas Dibujadas**: 
  - Formato: PNG (mantiene transparencia)
  - Recorte automático de espacios en blanco
  - Compresión opcional si es muy grande
  
- **Firmas Subidas**:
  - Formato: JPEG (optimizado)
  - Redimensionamiento automático
  - Calidad ajustable (0.85 por defecto)

### Optimizaciones de Performance

- **Memoización**: Componentes clave memoizados con `React.memo`
- **Lazy Loading**: Miniaturas cargadas bajo demanda
- **Compresión**: Imágenes optimizadas antes de integrar al PDF
- **Error Boundaries**: Captura de errores sin romper la app

### Responsive Design

- **Mobile First**: Diseño optimizado para móviles
- **Breakpoints**: `sm:`, `md:`, `lg:` de Tailwind
- **Touch Support**: Gestos táctiles para zoom y pan
- **Adaptive UI**: Controles que se adaptan al tamaño de pantalla

## 🐛 Manejo de Errores

La aplicación incluye múltiples capas de manejo de errores:

1. **Error Boundary**: Captura errores de React y muestra UI de fallback
2. **Validación de Archivos**: Previene errores antes de procesar
3. **Try-Catch**: Manejo de errores en operaciones asíncronas
4. **Toast Notifications**: Feedback visual para el usuario
5. **Mensajes Descriptivos**: Errores claros y accionables

## 🧪 Testing

```bash
# Ejecutar tests
npm run test

# Tests en modo watch
npm run test:watch
```

Los tests están ubicados en `src/test/` y utilizan Vitest y React Testing Library.

## 🚢 Despliegue

### Build de Producción

```bash
npm run build
```

El build se genera en la carpeta `dist/` y está listo para desplegar en cualquier servidor estático.

### Opciones de Despliegue

- **Vercel**: Conecta tu repositorio y despliega automáticamente
- **Netlify**: Drag & drop de la carpeta `dist/`
- **GitHub Pages**: Sube la carpeta `dist/` a la rama `gh-pages`
- **Cualquier servidor estático**: Apache, Nginx, etc.

### Variables de Entorno

No se requieren variables de entorno para el funcionamiento básico. Todas las configuraciones están en el código.
