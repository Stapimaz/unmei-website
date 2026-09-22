/**
 * UNMEI FANSUB - 1 IP = 1 VOTE RATING BACKEND
 * Cloudflare Worker with KV storage.
 * Free tier: 100,000 requests/day, zero server maintenance.
 *
 * Setup:
 * 1. Create a free Cloudflare Worker.
 * 2. Create a KV namespace named 'UNMEI_VOTES' and bind it to this worker.
 * 3. Set the worker URL in js/rating.js (API_ENDPOINT = "https://your-worker.workers.dev/vote")
 */

const SALT = "unmei_fansub_tribute_2017_2022";

export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // GET /stats?slug=...&type=anime|translation
    if (request.method === "GET" && url.pathname === "/stats") {
      const slug = url.searchParams.get("slug");
      const type = url.searchParams.get("type") || "anime";
      if (!slug) return new Response("Missing slug", { status: 400, headers: corsHeaders });

      const statsKey = `stats:${slug}:${type}`;
      const raw = await env.UNMEI_VOTES.get(statsKey, "json");
      const stats = raw || { sum: 0, count: 0, avg: 0 };
      return new Response(JSON.stringify(stats), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // POST /vote
    if (request.method === "POST" && url.pathname === "/vote") {
      try {
        const body = await request.json();
        const { slug, type, score } = body;

        if (!slug || !type || typeof score !== "number" || score < 1 || score > 5) {
          return new Response(JSON.stringify({ error: "Geçersiz oy verisi" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // 1 IP = 1 Vote check with SHA-256 privacy hash
        const clientIp = request.headers.get("CF-Connecting-IP") || "127.0.0.1";
        const ipHash = await hashString(`${clientIp}:${SALT}`);
        const userVoteKey = `voted:${slug}:${type}:${ipHash}`;
        const statsKey = `stats:${slug}:${type}`;

        const existingScore = await env.UNMEI_VOTES.get(userVoteKey, "text");
        let stats = (await env.UNMEI_VOTES.get(statsKey, "json")) || { sum: 0, count: 0, avg: 0 };

        if (existingScore !== null) {
          // User already voted from this IP -> update their existing score
          const oldScore = parseFloat(existingScore);
          stats.sum = stats.sum - oldScore + score;
        } else {
          // New IP vote
          stats.count += 1;
          stats.sum += score;
        }

        stats.avg = parseFloat((stats.sum / (stats.count || 1)).toFixed(1));

        // Save to KV
        await env.UNMEI_VOTES.put(userVoteKey, score.toString());
        await env.UNMEI_VOTES.put(statsKey, JSON.stringify(stats));

        return new Response(JSON.stringify({
          success: true,
          slug,
          type,
          avg: stats.avg,
          count: stats.count,
          hasVotedBefore: existingScore !== null
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    return new Response("Unmei Rating API", { headers: corsHeaders });
  }
};

async function hashString(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hash));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
