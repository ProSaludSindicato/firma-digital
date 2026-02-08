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

    const prompt = `Eres un analizador de documentos PDF. Tu tarea es encontrar la ubicación EXACTA de un bloque de texto de firma en el documento.

TEXTO A BUSCAR (bloque de firma):
"${searchText}"

Este texto normalmente aparece como parte de un bloque de firma al final de una página, posiblemente con una línea de guiones encima (------) y debajo puede tener un cargo como "PRESIDENTE" y un número de cédula.

INSTRUCCIONES:
1. ${pageNumber ? `Busca PRIMERO en la página ${pageNumber}.` : "Busca en TODAS las páginas del documento, especialmente en las últimas páginas."}
2. Localiza el texto EXACTO "${searchText}" - no confundas con menciones del mismo nombre en el cuerpo del documento.
3. Busca específicamente el bloque de firma (generalmente al final de la página, con formato diferente al texto del cuerpo).
4. Las coordenadas DEBEN estar en puntos PDF (72 puntos = 1 pulgada).
5. El origen (0,0) está en la esquina INFERIOR IZQUIERDA de la página.
6. Para una página tamaño carta (612 x 792 puntos), si el texto está casi al final de la página, la coordenada Y será un valor BAJO (cercano a 50-150).

IMPORTANTE - DIFERENCIA ENTRE MENCIONES:
- El nombre "${searchText}" puede aparecer VARIAS VECES en el documento (en el cuerpo del texto como mención).
- Debes encontrar la aparición que es parte del BLOQUE DE FIRMA, que se distingue por:
  * Estar separado del texto principal
  * Tener formato de firma (centrado o alineado, con línea de guiones encima)
  * Estar acompañado de cargo y número de documento
  * Generalmente al FINAL de la última o penúltima página

Devuelve SOLO un JSON con este formato exacto:
{"page": número_página_1_indexed, "x": coordenada_x, "y": coordenada_y_desde_abajo, "width": ancho_texto, "height": alto_bloque_firma}

Si NO encuentras el bloque de firma, devuelve: {"page": null, "x": null, "y": null, "width": null, "height": null}

NO agregues explicaciones, SOLO el JSON.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
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
          temperature: 0.1,
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
    const responseText = data.choices?.[0]?.message?.content?.trim();

    if (!responseText) {
      return new Response(
        JSON.stringify({ error: "Respuesta vacía del modelo de IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
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
      if (!location.page || !location.x || !location.y) {
        return new Response(
          JSON.stringify({ location: null }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          location: {
            page: location.page,
            x: location.x,
            y: location.y,
            width: location.width || 100,
            height: location.height || 20,
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
