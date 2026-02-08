/**
 * Servicio para interactuar con la API de Google Gemini
 * Usado para encontrar texto en PDFs y obtener sus coordenadas
 */

export interface TextLocation {
  page: number;
  x: number; // Coordenada X en puntos PDF
  y: number; // Coordenada Y en puntos PDF (desde abajo)
  width: number;
  height: number;
}

export interface GeminiConfig {
  apiKey: string;
  model?: string;
  searchText?: string;
}

/**
 * Convierte un archivo PDF a base64
 */
const pdfToBase64 = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remover el prefijo data:application/pdf;base64,
      const base64 = base64String.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Busca un texto en un PDF usando Gemini y retorna sus coordenadas
 * @param pdfFile - Archivo PDF a analizar
 * @param searchText - Texto a buscar
 * @param apiKey - API key de Google Gemini
 * @param pageNumber - (Opcional) Número de página específica donde buscar (1-indexed)
 */
export const findTextInPDF = async (
  pdfFile: File,
  searchText: string,
  apiKey: string,
  pageNumber?: number
): Promise<TextLocation | null> => {
  try {
    // Convertir PDF a base64
    const pdfBase64 = await pdfToBase64(pdfFile);

    // Usar Gemini 2.5 Flash para mayor precisión y consistencia
    const modelName = "gemini-2.5-flash";

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: "application/pdf",
                    data: pdfBase64,
                  },
                },
                {
                  text: `Analiza este PDF${pageNumber ? ` (especialmente la página ${pageNumber})` : ""} y encuentra el texto "${searchText}".

OBJETIVO: Encontrar la coordenada Y donde debe ir la FIRMA, que está JUSTO ENCIMA del bloque de texto que contiene "${searchText}".

INSTRUCCIONES:
1. Busca el texto "${searchText}" en el documento
2. Identifica el BLOQUE COMPLETO de texto que contiene "${searchText}" (generalmente incluye el nombre, cargo como "PRESIDENTE", y número de cédula)
3. Identifica la LÍNEA HORIZONTAL DE FIRMA que está DIRECTAMENTE ENCIMA de este bloque de texto
4. Esta línea es una línea negra delgada que se extiende horizontalmente
5. La línea está VISIBLEMENTE MÁS ARRIBA que el bloque de texto (en PDF, Y mayor = más arriba)
6. La firma debe ir SOBRE esta línea, ENCIMA del bloque de texto

COORDENADA Y:
- La coordenada Y debe ser la posición vertical de la LÍNEA DE FIRMA (donde debe ir la firma)
- Esta línea está ENCIMA del bloque de texto, NO debajo, NO al lado
- Para texto en la parte inferior de una página carta, Y típicamente está entre 240-260 puntos
- La línea está separada del bloque de texto por un espacio visible (típicamente 40-60 puntos)

Sistema de coordenadas PDF:
- Origen (0,0) = esquina INFERIOR IZQUIERDA de la página
- Y aumenta hacia ARRIBA (0 = borde inferior de la página)
- 72 puntos = 1 pulgada

IMPORTANTE:
- La firma va ENCIMA del bloque de texto, no debajo
- La línea de firma está MÁS ARRIBA que el bloque (Y mayor)
- Si el bloque de texto está en Y:200, la línea de firma debería estar en Y:250 aproximadamente

Devuelve SOLO un objeto JSON válido sin explicaciones, sin markdown, sin backticks:

{
  "page": número_de_página_empezando_en_1,
  "y": coordenada_y_de_la_línea_de_firma_encima_del_bloque
}

${pageNumber ? `Busca PRIMERO en la página ${pageNumber}. Si no lo encuentras ahí, busca en otras páginas.` : ""}

Si el texto no se encuentra, devuelve exactamente: null`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0, // Temperatura 0 para máxima consistencia
            topK: 1,
            topP: 1,
            maxOutputTokens: 300,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error de API Gemini: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error("Respuesta inválida de Gemini API");
    }

    const responseText = data.candidates[0].content.parts[0].text.trim();

    // Intentar parsear el JSON de la respuesta
    try {
      // Limpiar la respuesta para extraer solo el JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return null;
      }

      const location = JSON.parse(jsonMatch[0]);

      if (location === null || !location.page || location.y === undefined) {
        return null;
      }

      // X siempre es 80 (fijado temporalmente)
      const signatureX = 80;
      
      // Y viene directamente de la IA (ya es la posición de la línea de firma)
      let signatureY = location.y;
      
      // Log para debugging
      console.log(`[Gemini] Línea de firma encontrada (IA) - Y: ${signatureY}`);
      
      // Ajuste automático: si Y es menor a 240, probablemente está muy baja
      // La línea de firma típicamente está entre 240-260 para documentos estándar
      if (signatureY < 240) {
        const adjustment = 240 - signatureY;
        console.log(`[Gemini] Y muy baja (${signatureY}), ajustando +${adjustment} puntos`);
        signatureY = 240; // Llevar a un mínimo de 240
      }
      
      console.log(`[Gemini] Posición final para firma - X: ${signatureX} (fijado), Y: ${signatureY}`);
      
      return {
        page: location.page,
        x: signatureX, // X fijado en 80
        y: signatureY, // Y de la línea de firma (ajustada si es necesario)
        width: 150, // Ancho por defecto
        height: 0, // Alto debe ser 0 para línea de firma
      };
    } catch (parseError) {
      console.error("Error al parsear respuesta de Gemini:", parseError);
      console.error("Respuesta recibida:", responseText);
      return null;
    }
  } catch (error) {
    console.error("Error al buscar texto en PDF con Gemini:", error);
    throw error;
  }
};

/**
 * Calcula la posición de la firma relativa a la línea de firma encontrada
 * Nota: X siempre es 80 (fijado temporalmente)
 * Y viene de la IA (posición de la línea de firma encima del bloque)
 */
export const calculateSignaturePosition = (
  textLocation: TextLocation,
  offsetX: number = 0,
  offsetY: number = 0, // Por defecto 0, ya que las coordenadas son de la línea de firma
  signatureWidth: number = 150,
  signatureHeight: number = 60
): { x: number; y: number; page: number } => {
  // La coordenada Y en PDF aumenta hacia arriba
  const signatureY = textLocation.y + offsetY;

  return {
    x: 80, // X fijado en 80 (temporalmente)
    y: Math.max(0, signatureY), // Asegurar que no sea negativo
    page: textLocation.page,
  };
};

