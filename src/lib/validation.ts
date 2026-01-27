// File validation utilities

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// PDF validation constants
export const PDF_MAX_SIZE = 10 * 1024 * 1024; // 10MB
export const PDF_MAX_SIZE_MB = 10;

// Image validation constants
export const IMAGE_MAX_SIZE = 5 * 1024 * 1024; // 5MB
export const IMAGE_MAX_SIZE_MB = 5;
export const IMAGE_ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];
export const IMAGE_MAX_WIDTH = 2000;
export const IMAGE_MAX_HEIGHT = 2000;

/**
 * Validates a PDF file
 */
export const validatePDFFile = (file: File): ValidationResult => {
  // Check file type
  if (file.type !== 'application/pdf') {
    return {
      valid: false,
      error: 'El archivo debe ser un PDF válido.',
    };
  }

  // Check file size
  if (file.size > PDF_MAX_SIZE) {
    return {
      valid: false,
      error: `El archivo PDF es demasiado grande. El tamaño máximo es ${PDF_MAX_SIZE_MB}MB.`,
    };
  }

  // Check if file is empty
  if (file.size === 0) {
    return {
      valid: false,
      error: 'El archivo PDF está vacío.',
    };
  }

  return { valid: true };
};

/**
 * Validates an image file for signature
 */
export const validateImageFile = (file: File): ValidationResult => {
  // Check file type
  if (!IMAGE_ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'El archivo debe ser una imagen PNG o JPEG.',
    };
  }

  // Check file size
  if (file.size > IMAGE_MAX_SIZE) {
    return {
      valid: false,
      error: `La imagen es demasiado grande. El tamaño máximo es ${IMAGE_MAX_SIZE_MB}MB.`,
    };
  }

  // Check if file is empty
  if (file.size === 0) {
    return {
      valid: false,
      error: 'La imagen está vacía.',
    };
  }

  return { valid: true };
};

/**
 * Validates image dimensions
 */
export const validateImageDimensions = (
  width: number,
  height: number
): ValidationResult => {
  if (width > IMAGE_MAX_WIDTH || height > IMAGE_MAX_HEIGHT) {
    return {
      valid: false,
      error: `Las dimensiones de la imagen son demasiado grandes. Máximo: ${IMAGE_MAX_WIDTH}x${IMAGE_MAX_HEIGHT}px.`,
    };
  }

  return { valid: true };
};

/**
 * Validates if a PDF is corrupted by trying to read it
 */
export const validatePDFIntegrity = async (
  file: File
): Promise<ValidationResult> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Check PDF header (should start with %PDF)
    const uint8Array = new Uint8Array(arrayBuffer.slice(0, 4));
    const header = String.fromCharCode(...uint8Array);
    
    if (header !== '%PDF') {
      return {
        valid: false,
        error: 'El archivo PDF parece estar corrupto o no es un PDF válido.',
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: 'No se pudo leer el archivo. Puede estar corrupto.',
    };
  }
};

