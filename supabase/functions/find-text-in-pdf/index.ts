import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { pdfBase64, searchText, pageNumber } = await req.json();

    if (!pdfBase64 || !searchText) {
      return new Response(
        JSON.stringify({ error: "pdfBase64 and searchText are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = `Analiza este PDF${pageNumber ? ` (especialmente la página ${pageNumber})` : ""} y encuentra el texto "${searchText}".

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

Si el texto no se encuentra, devuelve exactamente: null`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: prompt,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:application/pdf;base64,${pdfBase64}`,
                  },
                },
              ],
            },
          ],
          temperature: 0,
          max_tokens: 300,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Límite de solicitudes excedido. Intenta de nuevo en unos momentos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA agotados. Agrega créditos en Settings > Workspace > Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Error del servicio de IA: ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const finishReason = data.choices?.[0]?.finish_reason;
    const responseText = data.choices?.[0]?.message?.content?.trim();
    console.log("AI finish_reason:", finishReason, "response length:", responseText?.length);

    if (!responseText) {
      return new Response(
        JSON.stringify({ error: "Respuesta vacía del modelo de IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract JSON from response - handle markdown code fences
    let cleanedResponse = responseText;
    // Remove markdown code fences if present (```json ... ``` or ``` ... ```)
    cleanedResponse = cleanedResponse.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();
    
    const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON found in response:", responseText);
      return new Response(
        JSON.stringify({ location: null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    try {
      const location = JSON.parse(jsonMatch[0]);

      // Validate the location data
      if (!location.page || !location.y) {
        return new Response(
          JSON.stringify({ location: null }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // X siempre es 80 (fijado temporalmente)
      const signatureX = 80;
      
      // Y viene directamente de la IA (ya es la posición de la línea de firma)
      let signatureY = location.y;
      
      console.log(`[Edge Function] Línea de firma encontrada (IA) - Y: ${signatureY}`);
      
      // Ajuste automático: si Y es menor a 240, probablemente está muy baja
      // La línea de firma típicamente está entre 240-260 para documentos estándar
      if (signatureY < 240) {
        const adjustment = 240 - signatureY;
        console.log(`[Edge Function] Y muy baja (${signatureY}), ajustando +${adjustment} puntos`);
        signatureY = 240; // Llevar a un mínimo de 240
      }

      return new Response(
        JSON.stringify({
          location: {
            page: location.page,
            x: signatureX, // X fijado en 80
            y: signatureY, // Y de la línea de firma (ajustada si es necesario)
            width: 150,
            height: 0, // Alto debe ser 0 para línea de firma
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (parseError) {
      console.error("JSON parse error:", parseError, "Response:", responseText);
      return new Response(
        JSON.stringify({ location: null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
