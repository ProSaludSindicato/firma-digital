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

    const prompt = `Analiza este documento PDF${pageNumber ? ` (página ${pageNumber})` : ""}.

TAREA: Encuentra la palabra "PRESIDENTE" en el documento. Esta palabra aparece UNA SOLA VEZ en todo el documento, dentro de un bloque de firma que tiene esta estructura:

${searchText}
PRESIDENTE
C.C. 71.396.099 de Caldas

Necesito la coordenada Y del BORDE SUPERIOR de la primera línea de texto de este bloque (la línea que dice "${searchText}").

Sistema de coordenadas PDF:
- Origen (0,0) = esquina INFERIOR IZQUIERDA
- Y aumenta hacia ARRIBA
- 72 puntos = 1 pulgada
- Página tamaño carta: 612 x 792 puntos

IMPORTANTE: Este bloque está cerca del FINAL de la página (parte inferior), así que la coordenada Y será un valor BAJO (típicamente entre 150-250 puntos).

Devuelve SOLO un JSON sin explicaciones:
{"page": número_de_página, "y": coordenada_y_borde_superior_del_nombre}

${pageNumber ? `Busca PRIMERO en la página ${pageNumber}.` : ""}
Si no encuentras "PRESIDENTE", devuelve: null`;

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
          temperature: 0,
          max_tokens: 16000,
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
      
      // La IA devuelve la Y del borde superior del nombre (primera línea del bloque)
      // La línea de firma está ~52 puntos ARRIBA del nombre
      // Offset calibrado: 255 (posición correcta) - 203 (posición del texto) = 52
      const SIGNATURE_LINE_OFFSET = 52;
      const rawY = location.y;
      const signatureY = rawY + SIGNATURE_LINE_OFFSET;
      
      console.log(`[Edge Function] Texto encontrado en Y: ${rawY}, firma en Y: ${signatureY} (+${SIGNATURE_LINE_OFFSET} offset)`);

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
