#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
UNMEI ÇEVİRİ - SEO STATIC PAGE & SITEMAP GENERATOR
Generates clean, pre-rendered static HTML files for all anime series,
as well as sitemap.xml and robots.txt for Google Search Console.
"""

import os
import json
import re
import html
from xml.sax.saxutils import escape as xml_escape

BASE_URL = "https://unmei.net"
WORKSPACE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CATALOG_PATH = os.path.join(WORKSPACE_DIR, "data", "catalog.json")
INDEX_PATH = os.path.join(WORKSPACE_DIR, "index.html")

def clean_title(title):
    if not title:
        return ""
    return re.sub(r'\s*\((?:TV|Film)\)', '', title, flags=re.IGNORECASE).strip()

def clean_synopsis(syn):
    if not syn:
        return "Bu anime için Türkçe özet bilgisi yakında eklenecektir."
    return syn.replace("rnrn", "\n\n").replace("rn", "\n").strip()

def format_size(size_mb):
    if not size_mb or size_mb <= 0:
        return "-"
    if size_mb >= 1024:
        return f"{round(size_mb / 1024)} GB"
    return f"{round(size_mb)} MB"

def generate_sitemap(items):
    sitemap_path = os.path.join(WORKSPACE_DIR, "sitemap.xml")
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        '  <url>',
        f'    <loc>{BASE_URL}/</loc>',
        '    <changefreq>daily</changefreq>',
        '    <priority>1.0</priority>',
        '  </url>',
        '  <url>',
        f'    <loc>{BASE_URL}/hakkimizda/</loc>',
        '    <changefreq>monthly</changefreq>',
        '    <priority>0.8</priority>',
        '  </url>',
        '  <url>',
        f'    <loc>{BASE_URL}/manga/</loc>',
        '    <changefreq>monthly</changefreq>',
        '    <priority>0.7</priority>',
        '  </url>'
    ]
    for item in items:
        slug = item.get("slug")
        if not slug:
            continue
        lines.append('  <url>')
        lines.append(f'    <loc>{BASE_URL}/anime/{slug}/</loc>')
        lines.append('    <changefreq>weekly</changefreq>')
        lines.append('    <priority>0.9</priority>')
        lines.append('  </url>')
    lines.append('</urlset>\n')

    with open(sitemap_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"[OK] sitemap.xml created ({len(items) + 3} URLs)")

def generate_robots():
    robots_path = os.path.join(WORKSPACE_DIR, "robots.txt")
    content = f"""User-agent: *
Allow: /

Sitemap: {BASE_URL}/sitemap.xml
"""
    with open(robots_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("[OK] robots.txt created")

def generate_anime_page(item):
    slug = item.get("slug")
    if not slug:
        return

    out_dir = os.path.join(WORKSPACE_DIR, "anime", slug)
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, "index.html")

    title = clean_title(item.get("title", ""))
    native_title = item.get("japanese_title") or item.get("romaji_title") or ""
    studio = item.get("studio") or "Bilinmiyor"
    category = item.get("category") or "TV"
    year = item.get("year") or ""
    episodes_count = item.get("episodes_count") or len(item.get("episodes", [])) or 0
    synopsis = clean_synopsis(item.get("synopsis"))
    cover_image = item.get("cover_image") or "../../assets/placeholder_poster.svg"
    banner_image = item.get("banner_image") or cover_image
    genres = item.get("genres_tr") or []
    episodes = item.get("episodes") or []
    gdrive_url = item.get("gdrive_url") or "#"

    # Meta keywords
    keywords = f"{title} türkçe, {title} türkçe altyazı, {title} türkçe izle, {title} unmei, {title} unmei çeviri, unmei çeviri"

    # Pre-render episodes table rows
    ep_rows = []
    for ep in episodes:
        num = ep.get("episode_num", 1)
        name = html.escape(ep.get("filename") or f"{title} {num}. Bölüm")
        codec = html.escape(ep.get("codec") or "x264")
        res = html.escape(ep.get("resolution") or "1080p")
        sz = format_size(ep.get("size_mb", 0))
        ep_rows.append(f"""
          <tr>
            <td class="col-ep">#{num}</td>
            <td class="col-name" title="{name}">{name}</td>
            <td class="col-codec">{codec}</td>
            <td class="col-res">{res}</td>
            <td class="col-size">{sz}</td>
          </tr>
        """)
    episodes_html = "".join(ep_rows)

    # Genre chips
    genre_chips = "".join([f'<span class="genre-tag">{html.escape(g)}</span>' for g in genres])

    page_html = f"""<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{html.escape(title)} - Unmei Çeviri</title>
  <meta name="description" content="{html.escape(title)} animesi Unmei Çeviri Türkçe altyazılı izleme ve indirme sayfası. Konusu, bölümleri ve çeviri detayları.">
  <meta name="keywords" content="{html.escape(keywords)}">
  <link rel="canonical" href="{BASE_URL}/anime/{slug}/">

  <link rel="icon" type="image/png" sizes="180x180" href="../../assets/favicon.png?v=2">
  <link rel="shortcut icon" href="../../favicon.ico?v=2">

  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Pacifico&family=Outfit:wght@500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">

  <!-- CSS -->
  <link rel="stylesheet" href="../../css/style.css">

  <script>
    window.UNMEI_ROOT = "../../";
    window.UNMEI_SLUG = "{slug}";
  </script>
</head>
<body>

  <!-- Header -->
  <header class="site-header">
    <div class="container header-inner">
      <a href="../../#/anime" class="brand-wrapper" id="brand-link" aria-label="Unmei Çeviri">
        <img src="../../assets/header_logo.png" alt="Unmei Çeviri" class="header-logo-img">
      </a>

      <nav class="main-nav">
        <a href="../../#/anime" class="nav-link active" id="nav-anime">Anime</a>
        <a href="../../#/manga" class="nav-link" id="nav-manga">Manga</a>
        <a href="../../#/hakkimizda" class="nav-link" id="nav-about">Hakkımızda</a>
      </nav>
    </div>
  </header>

  <!-- Main Content Wrapper -->
  <main class="container">

    <!-- 1. CATALOG VIEW (HIDDEN IN DIRECT ANIME URL) -->
    <div id="view-catalog" class="hidden">
      <section class="trending-section" id="trending-section" style="display: none;"></section>
      <div class="anime-grid" id="anime-grid"></div>
    </div>

    <!-- 2. FULL-PAGE ANIME DETAIL VIEW -->
    <div id="view-detail" class="active">
      <!-- Full-Width Letterboxd Backdrop -->
      <div class="letterboxd-backdrop-container" id="detail-banner" style="background-image: url('{banner_image}');"></div>

      <div class="detail-nav-bar">
        <button class="back-btn" id="detail-back-btn">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Animeler
        </button>
      </div>

      <!-- Detail Layout (2 Columns) -->
      <div class="detail-content-layout">
        <!-- Sol Kolon: Afiş -->
        <div class="detail-sidebar">
          <div class="detail-poster-box">
            <img src="{cover_image}" alt="{html.escape(title)} Afişi" id="detail-poster">
          </div>
        </div>

        <!-- Sağ Kolon: Başlık, Bilgiler, Özet, Oylama, Bölümler, Yorumlar -->
        <div class="detail-main-info">
          <div class="detail-title-section">
            <h1 id="detail-title">{html.escape(title)}</h1>
            <div class="detail-native-title" id="detail-native-title">{html.escape(native_title)}</div>
          </div>

          <div class="detail-meta-list" id="detail-meta-list">
            <span class="detail-meta-item">Stüdyo: <strong>{html.escape(studio)}</strong></span>
            <span class="detail-meta-item">{html.escape(category)}</span>
            <span class="detail-meta-item">{html.escape(str(year))}</span>
            <span class="detail-meta-item">{episodes_count} Bölüm</span>
          </div>

          <div class="detail-genres" id="detail-genres">
            {genre_chips}
          </div>

          <!-- Özet -->
          <div class="section-block">
            <h3 class="section-heading">Özet</h3>
            <p class="synopsis-text" id="detail-synopsis-text">{html.escape(synopsis)}</p>
          </div>

          <!-- Oylama (Dual Rating) -->
          <div class="section-block">
            <h3 class="section-heading">Değerlendirme</h3>
            <div class="ratings-panel">
              <div id="rating-anime-container"></div>
              <div class="ratings-divider"></div>
              <div id="rating-translation-container"></div>
            </div>
          </div>

          <!-- Bölümler Tablosu -->
          <div class="section-block">
            <div class="episodes-top-bar">
              <h3 class="section-heading mb-0">Bölümler (<span id="detail-episodes-count">{episodes_count}</span>)</h3>
              <a id="detail-gdrive-btn" href="{html.escape(gdrive_url)}" target="_blank" rel="noopener noreferrer" class="gdrive-folder-btn" title="Google Drive Klasörü">
                <svg class="gdrive-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                </svg>
                <span>Klasör Bağlantısı</span>
              </a>
            </div>

            <div class="episodes-table-wrapper">
              <table class="episodes-table">
                <thead>
                  <tr>
                    <th style="width: 60px;">Bölüm</th>
                    <th>Dosya Adı</th>
                    <th style="width: 90px;">Codec</th>
                    <th style="width: 80px;">Kalite</th>
                    <th style="width: 90px;">Boyut</th>
                  </tr>
                </thead>
                <tbody id="detail-episodes-body">
                  {episodes_html}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Yorumlar -->
          <div class="section-block">
            <h3 class="section-heading">Yorumlar</h3>
            <div class="comments-container">
              <div id="disqus_thread"></div>
            </div>
          </div>

        </div>
      </div>
    </div>

    <!-- 3. MANGA VIEW -->
    <div id="view-manga" class="hidden static-page-view">
      <div class="static-page-header">
        <h1 class="static-page-title">Manga</h1>
      </div>
      <div class="static-page-body">
        <div class="manga-notice-card">
          <p>Manga arşivimiz yakında paylaşılacaktır.</p>
        </div>
      </div>
    </div>

    <!-- 4. HAKKIMIZDA VIEW -->
    <div id="view-about" class="hidden static-page-view">
      <div class="static-page-header">
        <h1 class="static-page-title">Hakkımızda</h1>
      </div>
      <div class="static-page-body">
        <div class="about-hero-card">
          <h2 class="about-hero-title">Bir Tutkunun Dijital Mirası</h2>
          <p class="about-hero-text">
            <strong>Unmei Çeviri</strong>, 6 Ekim 2017 tarihinde kurulan ve 2022 yılına kadar anime dünyasında kesintisiz Türkçe çeviriler üreten bağımsız bir fansub oluşumudur.
          </p>
        </div>
      </div>
    </div>

  </main>

  <!-- Footer -->
  <footer class="site-footer">
    <div class="container footer-content">
      <div class="footer-brand-section">
        <img src="../../assets/logo.png" alt="Unmei Çeviri" class="footer-logo">
      </div>
      <div class="footer-links">
        <a href="../../#/anime" class="footer-link">Anime</a>
        <span class="footer-dot">•</span>
        <a href="../../#/manga" class="footer-link">Manga</a>
        <span class="footer-dot">•</span>
        <a href="../../#/hakkimizda" class="footer-link">Hakkımızda</a>
      </div>
      <div class="footer-bottom">
        <p class="footer-copy">© 2017 – 2026 Unmei Çeviri. Tüm hakları saklıdır.</p>
        <p class="footer-sub">2017 – 2022 yılları arasındaki çeviri mirasımızın dijital anı arşividir.</p>
      </div>
    </div>
  </footer>

  <!-- Scripts -->
  <script src="../../js/rating.js"></script>
  <script src="../../js/disqus.js"></script>
  <script src="../../js/leaderboard.js"></script>
  <script src="../../js/flappy.js"></script>
  <script src="../../js/app.js"></script>
</body>
</html>
"""
    with open(out_file, "w", encoding="utf-8") as f:
        f.write(page_html)

def generate_subpage(slug, title, desc):
    out_dir = os.path.join(WORKSPACE_DIR, slug)
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, "index.html")

    is_about = (slug == "hakkimizda")
    is_manga = (slug == "manga")

    about_class = "active" if is_about else "hidden"
    manga_class = "active" if is_manga else "hidden"

    page_html = f"""<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{html.escape(title)} - Unmei Çeviri</title>
  <meta name="description" content="{html.escape(desc)}">
  <link rel="canonical" href="{BASE_URL}/{slug}/">

  <link rel="icon" type="image/png" sizes="180x180" href="../assets/favicon.png?v=2">
  <link rel="shortcut icon" href="../favicon.ico?v=2">

  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Pacifico&family=Outfit:wght@500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">

  <!-- CSS -->
  <link rel="stylesheet" href="../css/style.css">

  <script>
    window.UNMEI_ROOT = "../";
  </script>
</head>
<body>

  <!-- Header -->
  <header class="site-header">
    <div class="container header-inner">
      <a href="../#/anime" class="brand-wrapper" id="brand-link" aria-label="Unmei Çeviri">
        <img src="../assets/header_logo.png" alt="Unmei Çeviri" class="header-logo-img">
      </a>

      <nav class="main-nav">
        <a href="../#/anime" class="nav-link" id="nav-anime">Anime</a>
        <a href="../#/manga" class="nav-link {'active' if is_manga else ''}" id="nav-manga">Manga</a>
        <a href="../#/hakkimizda" class="nav-link {'active' if is_about else ''}" id="nav-about">Hakkımızda</a>
      </nav>
    </div>
  </header>

  <!-- Main Content Wrapper -->
  <main class="container">

    <div id="view-catalog" class="hidden"></div>
    <div id="view-detail" class="hidden"></div>

    <!-- MANGA VIEW -->
    <div id="view-manga" class="{manga_class} static-page-view">
      <div class="static-page-header">
        <h1 class="static-page-title">Manga</h1>
      </div>
      <div class="static-page-body">
        <div class="manga-notice-card">
          <p>Manga arşivimiz yakında paylaşılacaktır.</p>
        </div>
      </div>
    </div>

    <!-- HAKKIMIZDA VIEW -->
    <div id="view-about" class="{about_class} static-page-view">
      <div class="static-page-header">
        <h1 class="static-page-title">Hakkımızda</h1>
      </div>
      <div class="static-page-body">
        <div class="about-hero-card">
          <h2 class="about-hero-title">Bir Tutkunun Dijital Mirası</h2>
          <p class="about-hero-text">
            <strong>Unmei Çeviri</strong>, 6 Ekim 2017 tarihinde kurulan ve 2022 yılına kadar anime dünyasında kesintisiz Türkçe çeviriler üreten bağımsız bir fansub oluşumudur.
          </p>
        </div>
      </div>
    </div>

  </main>

  <!-- Footer -->
  <footer class="site-footer">
    <div class="container footer-content">
      <div class="footer-brand-section">
        <img src="../assets/logo.png" alt="Unmei Çeviri" class="footer-logo">
      </div>
      <div class="footer-links">
        <a href="../#/anime" class="footer-link">Anime</a>
        <span class="footer-dot">•</span>
        <a href="../#/manga" class="footer-link">Manga</a>
        <span class="footer-dot">•</span>
        <a href="../#/hakkimizda" class="footer-link">Hakkımızda</a>
      </div>
      <div class="footer-bottom">
        <p class="footer-copy">© 2017 – 2026 Unmei Çeviri. Tüm hakları saklıdır.</p>
        <p class="footer-sub">2017 – 2022 yılları arasındaki çeviri mirasımızın dijital anı arşividir.</p>
      </div>
    </div>
  </footer>

  <!-- Scripts -->
  <script src="../js/rating.js"></script>
  <script src="../js/disqus.js"></script>
  <script src="../js/leaderboard.js"></script>
  <script src="../js/flappy.js"></script>
  <script src="../js/app.js"></script>
</body>
</html>
"""
    with open(out_file, "w", encoding="utf-8") as f:
        f.write(page_html)
    print(f"[OK] {slug}/index.html created")

def main():
    if not os.path.exists(CATALOG_PATH):
        print(f"Error: {CATALOG_PATH} not found.")
        return

    with open(CATALOG_PATH, "r", encoding="utf-8") as f:
        catalog = json.load(f)

    items = catalog.get("items", [])
    print(f"Found {len(items)} catalog items. Generating SEO pages...")

    generate_sitemap(items)
    generate_robots()

    generate_subpage("hakkimizda", "Hakkımızda", "Unmei Çeviri resmi hakkında sayfası. 2017 - 2022 çeviri mirası.")
    generate_subpage("manga", "Manga", "Unmei Çeviri manga duyuruları ve arşiv sayfası.")

    for it in items:
        generate_anime_page(it)

    print(f"[SUCCESS] All {len(items)} anime static pages generated successfully!")

if __name__ == "__main__":
    main()
