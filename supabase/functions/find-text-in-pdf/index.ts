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

    // NOTE: Este fallback solo se usa para PDFs escaneados (sin texto seleccionable).
    // Para PDFs con texto, el cliente usa pdfjs-dist directamente (más preciso).
    // El prompt pide la coordenada Y de la LÍNEA DE FIRMA (la línea horizontal negra),
    // no la del bloque de texto debajo.
    const prompt = `Analiza este documento PDF${pageNumber ? ` (página ${pageNumber})` : ""}.

CONTEXTO: Este es un convenio ProSalud. Contiene un bloque de firma con esta estructura (de abajo hacia arriba en la página):
  C.C. 71.396.099 de Caldas
  PRESIDENTE
  ${searchText}
  ___________________________  ← LÍNEA HORIZONTAL NEGRA (esta es la línea de firma)
  [espacio en blanco para la firma manuscrita]

TAREA: Devuelve la coordenada Y de la LÍNEA HORIZONTAL NEGRA DE FIRMA que está DIRECTAMENTE ENCIMA del nombre "${searchText}".

SISTEMA DE COORDENADAS PDF (muy importante):
- Origen (0,0) = esquina INFERIOR IZQUIERDA de la página
- Y aumenta hacia ARRIBA
- Página carta: 612 x 792 puntos (72 pt = 1 pulgada)
- El bloque de firma está cerca del final de la segunda página (parte inferior)
- El nombre "${searchText}" típicamente tiene su parte superior en Y ≈ 200-220 pt
- La línea de firma está ENCIMA del nombre, típicamente en Y ≈ 250-280 pt

VALIDACIÓN:
- La línea de firma tiene Y MAYOR que el nombre debajo de ella
- Rango esperado para la línea: Y entre 230 y 320 pt
- Si obtienes Y < 200, estás midiendo el bloque de texto, no la línea horizontal

Devuelve SOLO un JSON sin explicaciones ni markdown:
{"page": número_de_página, "y": coordenada_y_de_la_línea_de_firma}

${pageNumber ? `Busca PRIMERO en la página ${pageNumber}.` : ""}
Si no encuentras la línea de firma, devuelve: null`;

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
          max_tokens: 200,
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

    // Extraer JSON de la respuesta (puede venir con markdown code fences)
    let cleanedResponse = responseText;
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

      if (!location.page || location.y === undefined || location.y === null) {
        return new Response(
          JSON.stringify({ location: null }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // La IA devuelve directamente la Y de la línea de firma (sin offset adicional)
      const signatureLineY = location.y;

      console.log(
        `[Edge Function / AI fallback] Línea de firma en Y=${signatureLineY} (página ${location.page})`
      );

      return new Response(
        JSON.stringify({
          location: {
            page: location.page,
            x: 80,             // X fijado en 80 pt (margen izquierdo del bloque de firma)
            y: signatureLineY, // Y de la línea de firma, directo de la IA
            width: 130,
            height: 45,
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
