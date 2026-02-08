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

    const prompt = `Analiza este documento PDF y encuentra la ubicación del BLOQUE DE FIRMA.

CÓMO IDENTIFICAR EL BLOQUE DE FIRMA:
- Busca la palabra "PRESIDENTE" - aparece UNA SOLA VEZ en todo el documento y es parte del bloque de firma.
- El bloque completo tiene esta estructura (3 líneas consecutivas):
  Línea 1: "${searchText}" (nombre del firmante)
  Línea 2: "PRESIDENTE" (cargo)
  Línea 3: Un número de cédula (ej: "C.C. 71.396.099 de Caldas")

DÓNDE BUSCAR:
${pageNumber ? `Busca en la página ${pageNumber}.` : "Busca en las últimas páginas del documento."}
El bloque está hacia el FINAL de la página, después de todo el texto del documento.

COORDENADAS:
- Sistema PDF: origen (0,0) en esquina INFERIOR IZQUIERDA.
- Unidades: puntos PDF (72 puntos = 1 pulgada).
- Página carta = 612 x 792 puntos.
- Si el bloque está en el tercio inferior de la página, Y estará entre 50-250.
- Devuelve las coordenadas del NOMBRE "${searchText}" (primera línea del bloque).

RESPUESTA - devuelve ÚNICAMENTE este JSON sin formato markdown, sin backticks, sin explicaciones:
{"page":N,"x":X,"y":Y,"width":W,"height":H}

Si no encuentras el bloque:
{"page":null,"x":null,"y":null,"width":null,"height":null}`;

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
          max_tokens: 500,
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
