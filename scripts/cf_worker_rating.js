/**
 * UNMEI FANSUB - FULL BACKEND (RATINGS + D1 PAGE VIEWS & TRENDING)
 * Cloudflare Worker + KV (Ratings) + D1 SQLite (Views & Weekly Trending)
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

    // 1. GET /stats?slug=...&type=anime|translation
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

    // 2. POST /vote (1 IP = 1 Vote)
    if (request.method === "POST" && url.pathname === "/vote") {
      try {
        const body = await request.json();
        const { slug, type, score } = body;

        if (!slug || !type || typeof score !== "number" || score < 1 || score > 5) {
          return new Response(JSON.stringify({ error: "Gecersiz oy verisi" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const clientIp = request.headers.get("CF-Connecting-IP") || "127.0.0.1";
        const ipHash = await hashString(`${clientIp}:${SALT}`);
        const userVoteKey = `voted:${slug}:${type}:${ipHash}`;
        const statsKey = `stats:${slug}:${type}`;

        const existingScore = await env.UNMEI_VOTES.get(userVoteKey, "text");
        let stats = (await env.UNMEI_VOTES.get(statsKey, "json")) || { sum: 0, count: 0, avg: 0 };

        if (existingScore !== null) {
          const oldScore = parseFloat(existingScore);
          stats.sum = stats.sum - oldScore + score;
        } else {
          stats.count += 1;
          stats.sum += score;
        }

        stats.avg = parseFloat((stats.sum / (stats.count || 1)).toFixed(1));

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

    // 3. POST /hit (Record page view into D1 SQLite)
    if (request.method === "POST" && url.pathname === "/hit") {
      try {
        const body = await request.json();
        const { slug } = body;
        if (!slug) return new Response("Missing slug", { status: 400, headers: corsHeaders });

        if (env.DB) {
          await env.DB.prepare(
            `INSERT INTO page_views (slug, view_date, views) 
             VALUES (?, date('now'), 1) 
             ON CONFLICT(slug, view_date) DO UPDATE SET views = views + 1`
          ).bind(slug).run();
        }

        return new Response(JSON.stringify({ success: true, slug }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // 4. GET /trending (Last 7 days top viewed anime from D1 SQLite)
    if (request.method === "GET" && url.pathname === "/trending") {
      try {
        let results = [];
        if (env.DB) {
          const query = await env.DB.prepare(
            `SELECT slug, SUM(views) as total_views 
             FROM page_views 
             WHERE view_date >= date('now', '-7 days') 
             GROUP BY slug 
             ORDER BY total_views DESC 
             LIMIT 5`
          ).all();
          results = query.results || [];
        }

        return new Response(JSON.stringify({ success: true, trending: results }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // 5. GET /leaderboard (Global Top 10 High Scores from D1 SQLite)
    if (request.method === "GET" && url.pathname === "/leaderboard") {
      try {
        if (!env.DB) {
          return new Response(JSON.stringify({ success: false, error: "Database not bound" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // Auto-bootstrap table if not exists
        await env.DB.prepare(
          `CREATE TABLE IF NOT EXISTS leaderboard (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nickname TEXT NOT NULL UNIQUE,
            score INTEGER NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
          )`
        ).run();

        // Eradicate any legacy placeholder mock seeds from D1 SQLite
        await env.DB.prepare(
          `DELETE FROM leaderboard 
           WHERE nickname IN ('UnmeiAdmin', 'Haruhi', 'Akudama', 'FansubLord', 'KaraokeMaster', 'EncodeKing', 'SubSync', 'OtakuTR', 'Arsivci')
           OR (nickname = 'Stapimaz' AND score = 26)`
        ).run();

        const query = await env.DB.prepare(
          `SELECT nickname as name, score, created_at as date
           FROM leaderboard
           ORDER BY score DESC, created_at ASC
           LIMIT 10`
        ).all();

        return new Response(JSON.stringify({
          success: true,
          leaderboard: query.results || []
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

    // 6. POST /leaderboard (Submit high score to D1 SQLite)
    if (request.method === "POST" && url.pathname === "/leaderboard") {
      try {
        if (!env.DB) {
          return new Response(JSON.stringify({ success: false, error: "Database not bound" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const body = await request.json();
        const { nickname, score } = body;

        // Validation
        const cleanName = typeof nickname === "string" ? nickname.trim() : "";
        if (!cleanName || cleanName.length < 2 || cleanName.length > 15) {
          return new Response(JSON.stringify({ error: "Takma ad 2-15 karakter arasında olmalıdır." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // Allow Unicode letters, numbers, spaces, dots, dashes, underscores
        if (!/^[\p{L}\p{N}_\-\. ]+$/u.test(cleanName)) {
          return new Response(JSON.stringify({ error: "Takma ad geçersiz karakterler içeriyor." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const cleanScore = parseInt(score, 10);
        if (isNaN(cleanScore) || cleanScore < 1 || cleanScore > 9999) {
          return new Response(JSON.stringify({ error: "Geçersiz skor değeri." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // Ensure table exists
        await env.DB.prepare(
          `CREATE TABLE IF NOT EXISTS leaderboard (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nickname TEXT NOT NULL UNIQUE,
            score INTEGER NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
          )`
        ).run();

        // Upsert score (preserve higher score if existing)
        await env.DB.prepare(
          `INSERT INTO leaderboard (nickname, score, created_at)
           VALUES (?, ?, datetime('now'))
           ON CONFLICT(nickname) DO UPDATE SET
             created_at = CASE WHEN excluded.score > leaderboard.score THEN datetime('now') ELSE leaderboard.created_at END,
             score = MAX(leaderboard.score, excluded.score)`
        ).bind(cleanName, cleanScore).run();

        // Retrieve actual highest score for this user to determine rank
        const userRecord = await env.DB.prepare(
          `SELECT score FROM leaderboard WHERE nickname = ?`
        ).bind(cleanName).first();
        const userBestScore = userRecord ? userRecord.score : cleanScore;

        const rankRes = await env.DB.prepare(
          `SELECT COUNT(*) + 1 as rank FROM leaderboard WHERE score > ?`
        ).bind(userBestScore).first();

        // Retrieve updated Top 10
        const query = await env.DB.prepare(
          `SELECT nickname as name, score, created_at as date
           FROM leaderboard
           ORDER BY score DESC, created_at ASC
           LIMIT 10`
        ).all();

        return new Response(JSON.stringify({
          success: true,
          name: cleanName,
          score: userBestScore,
          rank: rankRes ? rankRes.rank : null,
          leaderboard: query.results || []
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

    return new Response("Unmei Rating & Trending & Leaderboard API is live", { headers: corsHeaders });
  }
};

async function hashString(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hash));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
