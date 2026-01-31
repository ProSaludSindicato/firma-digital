// Image compression utilities

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png';
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxWidth: 800,
  maxHeight: 600,
  quality: 0.85,
  format: 'jpeg',
};

/**
 * Compresses an image data URL
 * For signatures, JPEG with quality 0.85-0.9 is usually sufficient
 */
export const compressImage = (
  dataUrl: string,
  options: CompressionOptions = {}
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    
    const img = new Image();
    
    img.onerror = () => {
      reject(new Error('Error al cargar la imagen'));
    };
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Calculate new dimensions maintaining aspect ratio
        if (width > opts.maxWidth || height > opts.maxHeight) {
          const aspectRatio = width / height;
          
          if (width > height) {
            width = Math.min(width, opts.maxWidth);
            height = width / aspectRatio;
            
            if (height > opts.maxHeight) {
              height = opts.maxHeight;
              width = height * aspectRatio;
            }
          } else {
            height = Math.min(height, opts.maxHeight);
            width = height * aspectRatio;
            
            if (width > opts.maxWidth) {
              width = opts.maxWidth;
              height = width / aspectRatio;
            }
          }
        }
        
        canvas.width = Math.round(width);
        canvas.height = Math.round(height);
        
        const ctx = canvas.getContext('2d', { 
          // Preservar transparencia para PNG
          alpha: opts.format === 'png' 
        });
        if (!ctx) {
          reject(new Error('No se pudo obtener el contexto del canvas'));
          return;
        }
        
        // Para PNG, asegurar que el canvas tenga fondo transparente
        if (opts.format === 'png') {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        } else {
          // Para JPEG, establecer fondo blanco
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        // Enable high-quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const mimeType = opts.format === 'jpeg' ? 'image/jpeg' : 'image/png';
        const compressed = canvas.toDataURL(mimeType, opts.quality);
        
        resolve(compressed);
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Error al comprimir la imagen'));
      }
    };
    
    img.src = dataUrl;
  });
};

/**
 * Validates and compresses an image file
 */
export const validateAndCompressImage = async (
  file: File,
  options: CompressionOptions = {}
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onerror = () => {
      reject(new Error('Error al leer el archivo de imagen'));
    };
    
    reader.onload = async (event) => {
      try {
        const dataUrl = event.target?.result as string;
        
        // Compress the image
        const compressed = await compressImage(dataUrl, options);
        resolve(compressed);
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Error al procesar la imagen'));
      }
    };
    
    reader.readAsDataURL(file);
  });
};

