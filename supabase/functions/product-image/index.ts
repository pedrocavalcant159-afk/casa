const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supportedRetailers = [
  "amazon.com.br",
  "amazon.com",
  "mercadolivre.com.br",
  "mercadolivre.com",
  "neoflambrasil.com.br",
  "magazineluiza.com.br",
  "tramontina.com.br",
  "britania.com.br",
  "electrolux.com.br",
  "casasbahia.com.br",
  "carrefour.com.br",
  "extra.com.br",
  "havan.com.br",
  "pontofrio.com.br",
  "shopee.com.br",
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function retailerIsSupported(hostname: string) {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return supportedRetailers.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .trim();
}

function attribute(tag: string, name: string) {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return decodeHtml(match?.[1] ?? match?.[2] ?? match?.[3] ?? "");
}

function metaContent(html: string, names: string[]) {
  const wanted = new Set(names.map((name) => name.toLowerCase()));
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    const key = (attribute(tag, "property") || attribute(tag, "name") || attribute(tag, "itemprop")).toLowerCase();
    const content = attribute(tag, "content");
    if (wanted.has(key) && content) return content;
  }
  return "";
}

function productMetadata(html: string, pageUrl: URL) {
  const metaImage = metaContent(html, ["og:image", "og:image:secure_url", "twitter:image", "twitter:image:src"]);
  const amazonImage = decodeHtml(
    html.match(/data-old-hires\s*=\s*["']([^"']+)["']/i)?.[1] ??
      html.match(/<img[^>]+id\s*=\s*["']landingImage["'][^>]+src\s*=\s*["']([^"']+)["']/i)?.[1] ??
      "",
  );
  const jsonImage = decodeHtml(
    html.match(/["']image["']\s*:\s*["'](https?:\\?\/\\?\/[^"']+)["']/i)?.[1]?.replaceAll("\\/", "/") ?? "",
  );
  const rawImage = metaImage || amazonImage || jsonImage;
  if (!rawImage) throw new Error("Não encontrei uma foto principal nessa página.");

  const imageUrl = new URL(rawImage, pageUrl);
  if (imageUrl.protocol === "http:") imageUrl.protocol = "https:";
  if (imageUrl.protocol !== "https:") throw new Error("A foto encontrada não usa uma conexão segura.");

  const title = metaContent(html, ["og:title", "twitter:title"]) ||
    decodeHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");

  return { imageUrl, title };
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Método não permitido." }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const authorization = request.headers.get("Authorization");
    const apiKey = request.headers.get("apikey");
    if (!supabaseUrl || !authorization || !apiKey) return json({ error: "Sessão administrativa ausente." }, 401);

    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: apiKey, Authorization: authorization },
    });
    if (!userResponse.ok) return json({ error: "Sua sessão expirou. Entre novamente." }, 401);
    const user = await userResponse.json();

    const membershipResponse = await fetch(
      `${supabaseUrl}/rest/v1/site_admins?select=user_id&user_id=eq.${encodeURIComponent(user.id)}&limit=1`,
      { headers: { apikey: apiKey, Authorization: authorization } },
    );
    const membership = membershipResponse.ok ? await membershipResponse.json() : [];
    if (!Array.isArray(membership) || membership.length === 0) {
      return json({ error: "Esta conta não tem permissão para administrar presentes." }, 403);
    }

    const payload = await request.json();
    const pageUrl = new URL(String(payload?.url ?? ""));
    if (pageUrl.protocol !== "https:" || !retailerIsSupported(pageUrl.hostname)) {
      return json({ error: "Loja ainda não suportada. Informe a imagem manualmente." }, 422);
    }

    const pageResponse = await fetch(pageUrl, {
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.7",
      },
    });
    if (!pageResponse.ok) throw new Error(`A loja respondeu com status ${pageResponse.status}.`);
    const finalPageUrl = new URL(pageResponse.url);
    if (!retailerIsSupported(finalPageUrl.hostname)) throw new Error("A loja redirecionou para um endereço não permitido.");

    const declaredPageSize = Number(pageResponse.headers.get("content-length") || 0);
    if (declaredPageSize > 5_000_000) throw new Error("A página do produto é grande demais para processamento.");
    const html = await pageResponse.text();
    if (html.length > 5_000_000) throw new Error("A página do produto é grande demais para processamento.");

    const { imageUrl, title } = productMetadata(html, finalPageUrl);
    const imageResponse = await fetch(imageUrl, {
      redirect: "follow",
      headers: { Referer: finalPageUrl.origin, "User-Agent": "Mozilla/5.0" },
    });
    if (!imageResponse.ok) throw new Error("A loja não permitiu baixar a foto encontrada.");
    const contentType = (imageResponse.headers.get("content-type") || "").split(";")[0].toLowerCase();
    const extensions: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
    };
    const extension = extensions[contentType];
    if (!extension) throw new Error("O formato da foto não é compatível.");

    const bytes = await imageResponse.arrayBuffer();
    if (bytes.byteLength === 0 || bytes.byteLength > 8_000_000) throw new Error("A foto está vazia ou ultrapassa 8 MB.");

    const fileName = `product-${crypto.randomUUID()}.${extension}`;
    const uploadResponse = await fetch(`${supabaseUrl}/storage/v1/object/gift-images/${fileName}`, {
      method: "POST",
      headers: {
        apikey: apiKey,
        Authorization: authorization,
        "Content-Type": contentType,
        "Cache-Control": "31536000",
        "x-upsert": "false",
      },
      body: bytes,
    });
    if (!uploadResponse.ok) {
      const detail = await uploadResponse.text();
      console.error("Storage upload failed", uploadResponse.status, detail);
      throw new Error("Não foi possível guardar a foto no Supabase Storage.");
    }

    return json({
      image_url: `${supabaseUrl}/storage/v1/object/public/gift-images/${fileName}`,
      title,
    });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "Falha ao buscar a foto do produto." }, 400);
  }
});
