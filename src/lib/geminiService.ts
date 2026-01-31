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

    // Lista de modelos a intentar en orden de preferencia
    const modelsToTry = [
      "gemini-1.5-flash", // Modelo más estable y disponible
      "gemini-1.5-pro",   // Alternativa más potente
      "gemini-pro",       // Modelo legacy como último recurso
    ];

    let lastError: Error | null = null;

    // Intentar con cada modelo hasta que uno funcione
    for (const modelName of modelsToTry) {
      try {
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
                      text: `Analiza este PDF${pageNumber ? ` (especialmente la página ${pageNumber})` : ""} y encuentra el texto exacto "${searchText}". 

IMPORTANTE: Debes devolver SOLO un objeto JSON válido con las coordenadas donde aparece el texto. El formato exacto es:

{
  "page": número_de_página_empezando_en_1,
  "x": coordenada_x_en_puntos_pdf_desde_la_izquierda,
  "y": coordenada_y_en_puntos_pdf_desde_abajo,
  "width": ancho_aproximado_del_texto_en_puntos,
  "height": alto_aproximado_del_texto_en_puntos
}

Las coordenadas deben estar en el sistema de puntos PDF (72 puntos = 1 pulgada). El origen (0,0) está en la esquina inferior izquierda de la página.

${pageNumber ? `Busca PRIMERO en la página ${pageNumber}. Si no lo encuentras ahí, busca en otras páginas.` : ""}

Si el texto no se encuentra, devuelve exactamente: null

NO agregues explicaciones, solo el JSON.`,
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.1,
                topK: 1,
                topP: 1,
                maxOutputTokens: 200,
              },
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          // Si es 404, el modelo no está disponible, intentar con el siguiente
          if (response.status === 404) {
            lastError = new Error(`Modelo ${modelName} no disponible`);
            continue;
          }
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

          if (location === null || !location.page || !location.x || !location.y) {
            return null;
          }

          return {
            page: location.page,
            x: location.x,
            y: location.y,
            width: location.width || 100, // Ancho por defecto si no se especifica
            height: location.height || 20, // Alto por defecto si no se especifica
          };
        } catch (parseError) {
          console.error("Error al parsear respuesta de Gemini:", parseError);
          console.error("Respuesta recibida:", responseText);
          return null;
        }
      } catch (error) {
        // Si es un error de modelo no disponible (404), continuar con el siguiente
        if (error instanceof Error && (error.message.includes("404") || error.message.includes("no disponible"))) {
          lastError = error;
          continue;
        }
        // Si es otro error, lanzarlo
        throw error;
      }
    }

    // Si llegamos aquí, ningún modelo funcionó
    throw lastError || new Error("No se pudo conectar con ningún modelo de Gemini disponible");
  } catch (error) {
    console.error("Error al buscar texto en PDF con Gemini:", error);
    throw error;
  }
};

/**
 * Calcula la posición de la firma relativa al texto encontrado
 */
export const calculateSignaturePosition = (
  textLocation: TextLocation,
  offsetX: number = 0,
  offsetY: number = -30, // Por defecto, 30 puntos arriba del texto
  signatureWidth: number = 150,
  signatureHeight: number = 60
): { x: number; y: number; page: number } => {
  // La coordenada Y en PDF aumenta hacia arriba, así que restamos offsetY
  const signatureY = textLocation.y + offsetY;
  
  // La coordenada X puede tener un offset
  const signatureX = textLocation.x + offsetX;

  return {
    x: Math.max(0, signatureX), // Asegurar que no sea negativo
    y: Math.max(0, signatureY), // Asegurar que no sea negativo
    page: textLocation.page,
  };
};

