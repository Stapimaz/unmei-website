/**
 * UNMEI FANSUB - MINIMAL CATALOG & FULL-PAGE NAVIGATION APPLICATION
 */

const API_BASE = "https://unmei-rating-api.stapimazgraphics.workers.dev";
let catalogData = null;
let currentFilters = {
  search: "",
  status: "all",
  format: "all",
  sort: "name_asc"
};

document.addEventListener("DOMContentLoaded", () => {
  initApp();
});

async function initApp() {
  setupEventListeners();
  updateTrendingBadge();

  try {
    const rootPath = window.UNMEI_ROOT || "";
    const res = await fetch(rootPath + "data/catalog.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    catalogData = await res.json();
    renderTrending();
    renderCatalog();
    handleRouting();
  } catch (err) {
    console.error("Catalog load error:", err);
    const grid = document.getElementById("anime-grid");
    if (grid) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-muted);">
          Katalog verisi yüklenemedi. Lütfen sayfayı yenileyin.
        </div>
      `;
    }
  }
}

function filterAndSortItems() {
  if (!catalogData || !catalogData.items) return [];

  let items = [...catalogData.items];

  // Arama
  if (currentFilters.search.trim()) {
    const q = currentFilters.search.toLowerCase().trim();
    items = items.filter(it => {
      const matchTitle = (it.title || "").toLowerCase().includes(q);
      const matchRomaji = (it.romaji_title || "").toLowerCase().includes(q);
      const matchEnglish = (it.english_title || "").toLowerCase().includes(q);
      const matchNative = (it.japanese_title || "").toLowerCase().includes(q);
      const matchStudio = (it.studio || "").toLowerCase().includes(q);
      const matchGenres = (it.genres_tr || []).some(g => g.toLowerCase().includes(q));
      return matchTitle || matchRomaji || matchEnglish || matchNative || matchStudio || matchGenres;
    });
  }

  // Durum
  if (currentFilters.status !== "all") {
    if (currentFilters.status === "TAMAMLANDI") {
      items = items.filter(it => it.status === "TAMAMLANDI");
    } else if (currentFilters.status === "YARIM_KALAN") {
      items = items.filter(it => it.status !== "TAMAMLANDI");
    } else {
      items = items.filter(it => it.status === currentFilters.status);
    }
  }

  // Format
  if (currentFilters.format !== "all") {
    items = items.filter(it => it.category === currentFilters.format);
  }

  // Sıralama
  items.sort((a, b) => {
    switch (currentFilters.sort) {
      case "name_asc":
        return a.title.localeCompare(b.title, 'tr');
      case "name_desc":
        return b.title.localeCompare(a.title, 'tr');
      case "episodes_desc":
        return b.episodes_count - a.episodes_count;
      case "score_anilist":
        return (b.anilist_score || 0) - (a.anilist_score || 0);
      case "year_desc":
        return (b.year || 0) - (a.year || 0);
      default:
        return 0;
    }
  });

  return items;
}

function updateTrendingBadge() {
  const badge = document.getElementById("trending-badge");
  if (!badge) return;
  const now = new Date();
  const month = now.toLocaleDateString("tr-TR", { month: "long" });
  const capitalizedMonth = month.charAt(0).toLocaleUpperCase("tr-TR") + month.slice(1);
  badge.textContent = `${capitalizedMonth} ${now.getFullYear()}`;
}

function renderTrending() {
  updateTrendingBadge();
  const track = document.getElementById("trending-track");
  if (!track || !catalogData || !catalogData.items) return;

  const eyeIconSvg = `
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  `;

  const cleanTitle = (t) => (t || "").replace(/\s*\((?:TV|Film)\)/gi, '').trim();

  const formatViews = (v) => {
    const num = Number(v) || 0;
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return String(num);
  };

  function buildTrendingHtml(itemsWithViews) {
    if (!itemsWithViews || itemsWithViews.length === 0) return "";
    const top1 = itemsWithViews[0];
    const others = itemsWithViews.slice(1, 5);

    const top1Html = `
      <a href="#/anime/${top1.anime.slug}" class="spotlight-card">
        <span class="rank-badge">#1</span>
        <div class="card-backdrop" style="background-image: url('${top1.anime.banner_image || top1.anime.cover_image}');"></div>
        <div class="card-overlay"></div>
        <div class="card-inner-content">
          <div class="card-top-row">
            <div class="trending-views-pill">
              ${eyeIconSvg}
              <span>${formatViews(top1.views)}</span>
            </div>
          </div>
          <div class="spotlight-bottom-info">
            <h3 class="spotlight-title">${cleanTitle(top1.anime.title)}</h3>
          </div>
        </div>
      </a>
    `;

    const othersHtml = `
      <div class="trending-side-grid">
        ${others.map((item, idx) => {
          const rank = idx + 2;
          const bgImg = item.anime.banner_image || item.anime.cover_image || "assets/placeholder_poster.svg";

          return `
            <a href="#/anime/${item.anime.slug}" class="side-trending-card">
              <span class="rank-badge">#${rank}</span>
              <div class="card-backdrop" style="background-image: url('${bgImg}');"></div>
              <div class="card-overlay"></div>
              <div class="card-inner-content">
                <div class="card-top-row">
                  <div class="trending-views-pill">
                    ${eyeIconSvg}
                    <span>${formatViews(item.views)}</span>
                  </div>
                </div>
                <div class="side-bottom-info">
                  <h4 class="side-card-title" title="${item.anime.title}">${cleanTitle(item.anime.title)}</h4>
                </div>
              </div>
            </a>
          `;
        }).join('')}
      </div>
    `;

    return top1Html + othersHtml;
  }

  // Alfabetik tamamlama fonksiyonu:
  // Görüntülenmesi olmayan yerler veya API yanıtı gelene kadarki boşluklar katalogdaki animelerle alfabetik doldurulur
  function getAlphabeticalFillers(excludeSlugs = [], count = 5) {
    return catalogData.items
      .filter(it => !excludeSlugs.includes(it.slug) && (it.episodes_count || 0) > 0)
      .sort((a, b) => (a.title || "").localeCompare(b.title || "", "tr"))
      .slice(0, count)
      .map(it => ({ anime: it, views: 0 }));
  }

  // İlk render: Alfabetik animeler ve 0 izlenme (gerçek sıfır başlangıç)
  const initialList = getAlphabeticalFillers([], 5);
  if (initialList.length > 0) {
    track.innerHTML = buildTrendingHtml(initialList);
  }

  // Cloudflare D1'den canlı görüntülenmeleri çek
  if (API_BASE) {
    fetch(`${API_BASE}/trending`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.trending) {
          const liveList = [];
          const usedSlugs = [];

          for (const entry of data.trending) {
            const found = catalogData.items.find(it => it.slug === entry.slug);
            if (found) {
              liveList.push({ anime: found, views: entry.total_views || 0 });
              usedSlugs.push(found.slug);
            }
          }

          // 5'ten az ise kalanları alfabetik ve 0 izlenme ile tamamla
          if (liveList.length < 5) {
            const fillers = getAlphabeticalFillers(usedSlugs, 5 - liveList.length);
            liveList.push(...fillers);
          }

          if (liveList.length > 0) {
            track.innerHTML = buildTrendingHtml(liveList);
          }
        }
      })
      .catch((err) => {
        console.warn("Canli trending alinamadi:", err);
      });
  }
}

function renderCatalog() {
  const grid = document.getElementById("anime-grid");
  const countEl = document.getElementById("results-count-display");
  const trendingSec = document.getElementById("trending-section");
  if (!grid) return;

  if (trendingSec) {
    trendingSec.style.display = currentFilters.search.trim() ? "none" : "block";
  }

  const items = filterAndSortItems();

  if (countEl) {
    countEl.textContent = `${items.length} seri listeleniyor`;
  }

  if (items.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-muted);">
        Aramanızla eşleşen anime bulunamadı.
      </div>
    `;
    return;
  }

  // FRAMELESS CLEAN ITEM: Sadece afiş ve altında clean isim (Kart kutusu yok!)
  grid.innerHTML = items.map(anime => {
    const isCompleted = anime.status === "TAMAMLANDI";
    const statusLabel = isCompleted ? "Tamamlandı" : "Yarım Kaldı";
    const statusClass = isCompleted ? "completed" : "incomplete";
    const posterSrc = anime.cover_image || "assets/placeholder_poster.svg";

    return `
      <div class="anime-item" data-slug="${anime.slug}" onclick="navigateToAnime('${anime.slug}')">
        <div class="poster-wrapper">
          <img src="${posterSrc}" alt="${anime.title}" class="poster-img" loading="lazy" onerror="this.src='assets/placeholder_poster.svg'"/>
          <span class="status-badge ${statusClass}">${statusLabel}</span>
        </div>
        <div class="item-title" title="${anime.title}">${anime.title}</div>
      </div>
    `;
  }).join('');
}

function navigateToAnime(slug) {
  window.location.hash = `/anime/${slug}`;
}

function showView(viewId) {
  const views = ['view-catalog', 'view-detail', 'view-manga', 'view-about'];
  views.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (id === viewId) {
        el.classList.add('active');
        el.classList.remove('hidden');
      } else {
        el.classList.remove('active');
        el.classList.add('hidden');
      }
    }
  });

  const navAnime = document.getElementById('nav-anime');
  const navManga = document.getElementById('nav-manga');
  const navAbout = document.getElementById('nav-about');

  if (navAnime) navAnime.classList.toggle('active', viewId === 'view-catalog' || viewId === 'view-detail');
  if (navManga) navManga.classList.toggle('active', viewId === 'view-manga');
  if (navAbout) navAbout.classList.toggle('active', viewId === 'view-about');

  window.scrollTo(0, 0);
}

function handleRouting() {
  if (window.UNMEI_SLUG && !window.location.hash) {
    renderAnimeDetail(window.UNMEI_SLUG);
    showView('view-detail');
    return;
  }

  const hash = window.location.hash || "#/anime";

  if (hash.startsWith("#/anime/")) {
    const slug = hash.replace("#/anime/", "").trim();
    if (slug) {
      renderAnimeDetail(slug);
      showView('view-detail');
      return;
    }
  }

  if (hash === "#/manga") {
    document.title = "Manga - Unmei Çeviri";
    showView('view-manga');
    return;
  }

  if (hash === "#/hakkimizda") {
    document.title = "Hakkımızda - Unmei Çeviri";
    showView('view-about');
    return;
  }

  document.title = "Unmei Çeviri";
  renderTrending();
  showView('view-catalog');
}

function formatEpisodeSize(sizeMb) {
  if (!sizeMb || sizeMb <= 0) return '-';
  if (sizeMb >= 1024) {
    return Math.round(sizeMb / 1024) + ' GB';
  }
  return Math.round(sizeMb) + ' MB';
}

function recordPageView(slug) {
  if (!API_BASE || !slug) return;
  const storageKey = `unmei_hit_${slug}`;
  const lastHit = localStorage.getItem(storageKey);
  const now = Date.now();
  if (!lastHit || now - parseInt(lastHit, 10) > 30 * 60 * 1000) {
    localStorage.setItem(storageKey, String(now));
    fetch(`${API_BASE}/hit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug })
    }).catch(() => {});
  }
}

function renderAnimeDetail(slug) {
  if (!catalogData || !catalogData.items) return;
  const anime = catalogData.items.find(it => it.slug === slug);
  if (!anime) return;

  recordPageView(slug);
  const cleanTitle = (t) => (t || "").replace(/\s*\((?:TV|Film)\)/gi, '').trim();
  document.title = `${cleanTitle(anime.title)} - Unmei Çeviri`;

  const banner = document.getElementById("detail-banner");
  const poster = document.getElementById("detail-poster");
  const title = document.getElementById("detail-title");
  const nativeTitle = document.getElementById("detail-native-title");
  const metaList = document.getElementById("detail-meta-list");
  const genresBox = document.getElementById("detail-genres");
  const synopsisText = document.getElementById("detail-synopsis-text");
  const episodesBody = document.getElementById("detail-episodes-body");
  const episodesCount = document.getElementById("detail-episodes-count");
  const gdriveBtn = document.getElementById("detail-gdrive-btn");

  // Full-width Letterboxd Backdrop
  const bannerSrc = anime.banner_image || anime.cover_image || "";
  banner.style.backgroundImage = bannerSrc ? `url('${bannerSrc}')` : "none";
  poster.src = anime.cover_image || "assets/placeholder_poster.svg";

  // Titles
  title.textContent = anime.title;
  nativeTitle.textContent = [anime.romaji_title, anime.japanese_title].filter(Boolean).join(" • ");

  // Status & Meta
  const isCompleted = anime.status === "TAMAMLANDI";
  const statusClass = isCompleted ? "status-text-completed" : "status-text-incomplete";
  const statusLabel = anime.ceviri_durumu || (isCompleted ? "Tamamlandı" : "Yarım Kaldı");

  metaList.innerHTML = `
    <div class="meta-item">Stüdyo: <strong>${anime.studio || "Bilinmiyor"}</strong></div>
    <div class="meta-item">Yayın Yılı: <strong>${anime.year || "-"}</strong></div>
    <div class="meta-item">Bölüm: <strong>${anime.translated_episodes} / ${anime.total_episodes}</strong></div>
    <div class="meta-item">Format: <strong>${anime.category || "TV"}</strong></div>
    <div class="meta-item">Çeviri Durumu: <strong class="${statusClass}">${statusLabel}</strong></div>
  `;

  // Genres
  const allGenres = anime.genres_tr && anime.genres_tr.length ? anime.genres_tr : anime.genres_en;
  genresBox.innerHTML = (allGenres || []).map(g => `<span class="genre-tag">${g}</span>`).join('');

  // Özet
  synopsisText.textContent = anime.synopsis || "Bu seri için henüz özet bulunmuyor.";

  // Arşiv Durumu Bilgilendirme Kartı (Yalnızca arşivi eksik olan seriler için: Grup B ve D)
  const archiveCard = document.getElementById("detail-archive-card");
  const archiveCardTitle = document.getElementById("archive-card-title");
  const archiveCardBadge = document.getElementById("archive-card-badge");
  const archiveCardDesc = document.getElementById("archive-card-desc");
  const archiveCardMissingList = document.getElementById("archive-card-missing-list");
  const archiveCardMissingRow = document.getElementById("archive-card-missing-row");

  if (archiveCard) {
    const isEksiksiz = anime.group_code === 'A' || anime.group_code === 'C' || anime.arsiv_durumu === 'Eksiksiz';
    if (!isEksiksiz) {
      archiveCard.style.display = "flex";
      const isRot = (anime.arsiv_durumu && (anime.arsiv_durumu.includes("0 Bolum") || anime.arsiv_durumu.includes("Link Rot (0"))) || anime.archived_count === 0;

      if (isRot) {
        archiveCardTitle.textContent = "Arşiv Kurtarılamadı (Link Rot)";
        archiveCardBadge.textContent = "0 Bölüm";
        archiveCardDesc.textContent = "Orijinal fansub indirme linkleri ve tüm internet aynaları silinmiş olduğundan bu serinin bölümleri kurtarılamamıştır.";
      } else {
        archiveCardTitle.textContent = "Arşiv Eksiktir";
        const totalRef = anime.translated_episodes || anime.total_episodes || anime.episodes_count || 0;
        archiveCardBadge.textContent = `${anime.archived_count} / ${totalRef} Bölüm`;
        archiveCardDesc.textContent = "Orijinal fansub kaynaklarındaki link kaybı (link rot) nedeniyle bu serinin bazı bölümleri yerel arşivde eksiktir.";
      }

      if (anime.missing_episodes && anime.missing_episodes !== "-") {
        if (archiveCardMissingRow) archiveCardMissingRow.style.display = "flex";
        if (archiveCardMissingList) archiveCardMissingList.textContent = anime.missing_episodes;
      } else {
        if (archiveCardMissingRow) archiveCardMissingRow.style.display = "none";
      }
    } else {
      archiveCard.style.display = "none";
    }
  }

  // Google Drive Klasör Butonu
  if (gdriveBtn) {
    if (anime.gdrive_url) {
      gdriveBtn.href = anime.gdrive_url;
      gdriveBtn.classList.remove("disabled");
      gdriveBtn.removeAttribute("aria-disabled");
      gdriveBtn.setAttribute("target", "_blank");
      gdriveBtn.style.pointerEvents = "auto";
      gdriveBtn.style.opacity = "1";
    } else {
      gdriveBtn.href = "javascript:void(0)";
      gdriveBtn.classList.add("disabled");
      gdriveBtn.setAttribute("aria-disabled", "true");
      gdriveBtn.style.pointerEvents = "none";
      gdriveBtn.style.opacity = "0.5";
    }
  }

  // Dual Ratings
  RatingManager.renderRatingWidget("rating-anime-container", anime, "anime", "Anime Puanı");
  RatingManager.renderRatingWidget("rating-translation-container", anime, "translation", "Çeviri Kalitesi");

  // Bölümler
  if (episodesCount) episodesCount.textContent = anime.episodes_count;
  if (!anime.episodes || anime.episodes.length === 0) {
    episodesBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 32px 16px;">
          ${anime.arsiv_durumu && (anime.arsiv_durumu.includes('Link Rot') || anime.archived_count === 0) ? 'Bu serinin bölümleri link rot sebebiyle henüz arşivlenememiştir.' : 'Kayıtlı bölüm bulunamadı.'}
        </td>
      </tr>
    `;
  } else {
    episodesBody.innerHTML = (anime.episodes || []).map(ep => {
      let epLabel = ep.label || String(ep.ep_no).padStart(2, '0');
      if (ep.ep_type === 'movie' || (ep.file_name && ep.file_name.includes('_Movie_')) || (anime.category === 'Film' && anime.episodes.length === 1)) {
        epLabel = '<span class="ep-badge-special">Film</span>';
      } else if (ep.ep_type === 'special' || (ep.file_name && ep.file_name.includes('_Special_')) || (['OVA', 'Özel / ONA'].includes(anime.category) && anime.episodes.length === 1)) {
        epLabel = '<span class="ep-badge-special">Özel</span>';
      }

      return `
        <tr>
          <td style="font-weight: 600; color: #fff;">${epLabel}</td>
          <td class="ep-file-name">${ep.file_name || '-'}</td>
          <td><span class="codec-badge">${ep.codec || 'H.264'}</span></td>
          <td>${ep.quality || '-'}</td>
          <td style="font-variant-numeric: tabular-nums;">${formatEpisodeSize(ep.size_mb)}</td>
        </tr>
      `;
    }).join('');
  }

  // Disqus
  DisqusManager.loadComments(anime.slug, anime.title);
}

function setupEventListeners() {
  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener("input", (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        currentFilters.search = e.target.value;
        renderCatalog();
      }, 120);
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "/" && document.activeElement !== searchInput) {
        e.preventDefault();
        searchInput.focus();
      } else if (e.key === "Escape" && document.activeElement === searchInput) {
        searchInput.value = "";
        currentFilters.search = "";
        renderCatalog();
        searchInput.blur();
      }
    });
  }

  document.querySelectorAll("[data-filter-status]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-filter-status]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilters.status = btn.getAttribute("data-filter-status");
      renderCatalog();
    });
  });

  document.querySelectorAll("[data-filter-format]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-filter-format]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilters.format = btn.getAttribute("data-filter-format");
      renderCatalog();
    });
  });

  const sortSelect = document.getElementById("sort-select");
  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      currentFilters.sort = e.target.value;
      renderCatalog();
    });
  }

  const backBtn = document.getElementById("detail-back-btn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      if (window.UNMEI_ROOT) {
        window.location.href = window.UNMEI_ROOT + "#/anime";
      } else {
        window.location.hash = "#/anime";
      }
    });
  }

  const root = window.UNMEI_ROOT || "";
  if (root) {
    const brandLink = document.getElementById("brand-link");
    const navAnime = document.getElementById("nav-anime");
    const navManga = document.getElementById("nav-manga");
    const navAbout = document.getElementById("nav-about");
    if (brandLink) brandLink.href = root + "#/anime";
    if (navAnime) navAnime.href = root + "#/anime";
    if (navManga) navManga.href = root + "#/manga";
    if (navAbout) navAbout.href = root + "#/hakkimizda";
  }

  window.addEventListener("hashchange", handleRouting);
}
