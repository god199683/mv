// Deploy with: supabase functions deploy grok-video --no-verify-jwt=false
// Required secret: supabase secrets set XAI_API_KEY=your_xai_key
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://god199683.github.io",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Content-Type": "application/json; charset=utf-8",
};

function reply(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: corsHeaders });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "POST 요청만 지원합니다." }, 405);
  const apiKey = Deno.env.get("XAI_API_KEY");
  if (!apiKey) return reply({ error: "서버에 XAI_API_KEY가 설정되지 않았습니다." }, 500);
  try {
    const body = await req.json();
    const headers = { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` };
    if (body.action === "status") {
      const response = await fetch(`https://api.x.ai/v1/videos/${encodeURIComponent(body.requestId)}`, { headers });
      const data = await response.json();
      return reply(data, response.status);
    }
    const duration = Math.min(15, Math.max(1, Number(body.duration || 8)));
    const payload: Record<string, unknown> = {
      model: "grok-imagine-video-1.5", prompt: String(body.prompt || ""), duration,
      aspect_ratio: body.aspectRatio || "16:9", resolution: body.resolution || "720p",
      generate_audio: Boolean(body.audio),
    };
    if (!payload.prompt) return reply({ error: "프롬프트를 입력하세요." }, 400);
    if (body.image) payload.image = { url: body.image };
    if (Array.isArray(body.referenceImages) && body.referenceImages.length) {
      payload.reference_images = body.referenceImages.slice(0, 14).map((url: string) => ({ url }));
    }
    const response = await fetch("https://api.x.ai/v1/videos/generations", { method: "POST", headers, body: JSON.stringify(payload) });
    const data = await response.json();
    return reply(data, response.status);
  } catch (error) {
    return reply({ error: error instanceof Error ? error.message : "요청을 처리하지 못했습니다." }, 400);
  }
});
