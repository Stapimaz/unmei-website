import json

def build_404():
    with open('data/catalog.json', 'r', encoding='utf-8') as f:
        catalog = json.load(f)

    slug_dict = {item['slug']: item['title'] for item in catalog.get('items', [])}
    slugs_json = json.dumps(slug_dict, ensure_ascii=False)

    html_content = f"""<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sayfa Bulunamadı - Unmei Çeviri</title>
  <meta name="robots" content="noindex, follow">
  <link rel="icon" type="image/png" sizes="180x180" href="/assets/favicon.png?v=2">
  <link rel="shortcut icon" href="/favicon.ico?v=2">

  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Pacifico&family=Outfit:wght@500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">

  <!-- CSS -->
  <link rel="stylesheet" href="/css/style.css">

  <style>
    .not-found-page {{
      min-height: calc(100vh - 180px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px 16px 80px 16px;
    }}
    .not-found-card {{
      max-width: 580px;
      width: 100%;
      background: #101216;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: var(--radius-lg);
      padding: 44px 32px;
      text-align: center;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7);
      position: relative;
      overflow: hidden;
    }}
    .not-found-card::before {{
      content: '';
      position: absolute;
      top: 0;
      left: 10%;
      right: 10%;
      height: 2px;
      background: linear-gradient(90deg, transparent, var(--secondary), transparent);
    }}
    .not-found-glitch {{
      font-family: var(--font-heading);
      font-size: 88px;
      font-weight: 800;
      color: #fff;
      line-height: 1;
      letter-spacing: -2px;
      margin-bottom: 12px;
      text-shadow: 0 0 35px rgba(188, 25, 154, 0.5);
    }}
    .not-found-title {{
      font-family: var(--font-heading);
      font-size: 24px;
      font-weight: 700;
      color: #fff;
      margin-bottom: 12px;
    }}
    .not-found-desc {{
      font-size: 14px;
      color: var(--text-muted);
      line-height: 1.6;
      margin-bottom: 28px;
    }}
    .redirect-banner {{
      display: none;
      background: rgba(188, 25, 154, 0.12);
      border: 1px solid var(--secondary-border);
      border-radius: var(--radius-sm);
      padding: 16px;
      margin-bottom: 24px;
      text-align: center;
    }}
    .redirect-banner-title {{
      font-weight: 700;
      color: #fff;
      font-size: 15px;
      margin-bottom: 6px;
    }}
    .redirect-banner-sub {{
      font-size: 13px;
      color: var(--text-muted);
      margin-bottom: 14px;
    }}
    .redirect-btn-row {{
      display: flex;
      justify-content: center;
      gap: 10px;
    }}
    .btn-redirect-now {{
      background: var(--secondary);
      color: #fff;
      border: none;
      padding: 8px 18px;
      border-radius: var(--radius-sm);
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s ease;
    }}
    .btn-redirect-now:hover {{
      background: var(--secondary-hover);
      transform: translateY(-1px);
    }}
    .btn-cancel-redirect {{
      background: rgba(255, 255, 255, 0.06);
      color: var(--text-muted);
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 8px 14px;
      border-radius: var(--radius-sm);
      font-size: 13px;
      cursor: pointer;
    }}
    .btn-cancel-redirect:hover {{
      color: #fff;
      background: rgba(255, 255, 255, 0.12);
    }}
    .nf-search-box {{
      position: relative;
      margin-bottom: 24px;
    }}
    .nf-search-input {{
      width: 100%;
      padding: 12px 42px 12px 16px;
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      color: #fff;
      font-family: var(--font-body);
      font-size: 13.5px;
      transition: border-color 0.2s ease;
    }}
    .nf-search-input:focus {{
      outline: none;
      border-color: var(--secondary);
    }}
    .nf-search-btn {{
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }}
    .nf-actions {{
      display: flex;
      justify-content: center;
      gap: 12px;
      flex-wrap: wrap;
    }}
    .nf-btn {{
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 9px 18px;
      border-radius: var(--radius-sm);
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s ease;
    }}
    .nf-btn-primary {{
      background: var(--secondary);
      color: #fff;
    }}
    .nf-btn-primary:hover {{
      background: var(--secondary-hover);
      transform: translateY(-1px);
    }}
    .nf-btn-secondary {{
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: var(--text-muted);
    }}
    .nf-btn-secondary:hover {{
      color: #fff;
      background: rgba(255, 255, 255, 0.1);
    }}
    @media (max-width: 600px) {{
      .not-found-card {{
        padding: 32px 18px;
      }}
      .not-found-glitch {{
        font-size: 68px;
      }}
      .not-found-title {{
        font-size: 20px;
      }}
      .nf-actions {{
        flex-direction: column;
      }}
      .nf-btn {{
        width: 100%;
        justify-content: center;
      }}
    }}
  </style>

  <script>
    // Smart Old-URL Resolver & Auto-Redirect
    (function() {{
      const ANIME_MAP = {slugs_json};
      const path = (window.location.pathname || '').toLowerCase();

      // Clean last segment
      let lastSeg = path.replace(/^\\/+|\\/+$/g, '').split('/').pop() || '';
      lastSeg = lastSeg.replace(/\\.html?$/i, '');

      // Check special routes first
      if (lastSeg.includes('manga')) {{
        window.location.replace('/manga/');
        return;
      }}
      if (lastSeg.includes('hakkimizda') || lastSeg.includes('about') || lastSeg.includes('iletisim')) {{
        window.location.replace('/hakkimizda/');
        return;
      }}

      // 1. Direct Slug Match
      if (lastSeg && ANIME_MAP[lastSeg]) {{
        window.location.replace('/anime/' + lastSeg + '/');
        return;
      }}

      // 2. Partial / Substring Match (e.g. jujutsu-kaisen-1-sezon -> jujutsu-kaisen)
      if (lastSeg && lastSeg.length >= 3) {{
        const allSlugs = Object.keys(ANIME_MAP);
        let bestMatch = null;
        for (const s of allSlugs) {{
          if (lastSeg === s) {{
            bestMatch = s;
            break;
          }}
          if (lastSeg.startsWith(s) || s.startsWith(lastSeg) || lastSeg.includes(s) || s.includes(lastSeg)) {{
            bestMatch = s;
            break;
          }}
        }}

        if (bestMatch) {{
          window.location.replace('/anime/' + bestMatch + '/');
          return;
        }}

        // Word overlap match
        const words = lastSeg.split('-').filter(w => w.length >= 4);
        if (words.length > 0) {{
          for (const s of allSlugs) {{
            if (words.every(w => s.includes(w))) {{
              window.location.replace('/anime/' + s + '/');
              return;
            }}
          }}
          for (const s of allSlugs) {{
            if (s.startsWith(words[0])) {{
              window.location.replace('/anime/' + s + '/');
              return;
            }}
          }}
        }}
      }}
    }})();
  </script>
</head>
<body>

  <!-- Header -->
  <header class="site-header">
    <div class="container header-inner">
      <a href="/#/anime" class="brand-wrapper" id="brand-link" aria-label="Unmei Çeviri">
        <img src="/assets/header_logo.png" alt="Unmei Çeviri" class="header-logo-img">
      </a>

      <nav class="main-nav">
        <a href="/#/anime" class="nav-link active" id="nav-anime">Anime</a>
        <a href="/#/manga" class="nav-link" id="nav-manga">Manga ve LN</a>
        <a href="/#/hakkimizda" class="nav-link" id="nav-about">Hakkımızda</a>
      </nav>
    </div>
  </header>

  <main class="not-found-page">
    <div class="not-found-card">
      <div class="not-found-glitch">404</div>
      <h1 class="not-found-title">Sayfa Bulunamadı</h1>
      <p class="not-found-desc">
        Ulaşmaya çalıştığınız sayfa taşınmış, adı değişmiş veya arşive kaldırılmış olabilir. Yeni arşivimizde arama yaparak istediğiniz içeriğe anında ulaşabilirsiniz.
      </p>

      <!-- Quick Search Bar -->
      <form class="nf-search-box" onsubmit="event.preventDefault(); const q = document.getElementById('nf-search-input').value.trim(); if(q) window.location.href = '/?q=' + encodeURIComponent(q);">
        <input type="text" id="nf-search-input" class="nf-search-input" placeholder="Anime adı veya tür ara..." autocomplete="off">
        <button type="submit" class="nf-search-btn" aria-label="Ara">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </button>
      </form>

      <!-- Action Buttons -->
      <div class="nf-actions">
        <a href="/#/anime" class="nf-btn nf-btn-primary">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          Ana Sayfaya Dön
        </a>
        <a href="/#/manga" class="nf-btn nf-btn-secondary">Manga ve LN Vitrini</a>
        <a href="/#/hakkimizda" class="nf-btn nf-btn-secondary">Hakkımızda</a>
      </div>
    </div>
  </main>

  <!-- Footer -->
  <footer class="site-footer">
    <div class="container footer-content">
      <div class="footer-brand-section">
        <img src="/assets/logo.png" alt="Unmei Çeviri" class="footer-logo">
      </div>
      <div class="footer-links">
        <a href="/#/anime">Anime</a>
        <span class="footer-dot">•</span>
        <a href="/#/manga">Manga ve LN</a>
        <span class="footer-dot">•</span>
        <a href="/#/hakkimizda">Hakkımızda</a>
      </div>
      <div class="footer-bottom">
        <p class="footer-copy">© 2017 – 2026 Unmei Çeviri. Tüm hakları saklıdır.</p>
      </div>
    </div>
  </footer>

</body>
</html>
"""

    with open('404.html', 'w', encoding='utf-8') as f:
        f.write(html_content)

    print('404.html successfully generated!')

if __name__ == '__main__':
    build_404()
