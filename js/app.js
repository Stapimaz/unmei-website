/**
 * UNMEI FANSUB - MINIMAL CATALOG & FULL-PAGE NAVIGATION APPLICATION
 */

let catalogData = null;
let currentFilters = {
  search: "",
  status: "all",
  format: "all",
  quality: "all",
  sort: "name_asc"
};

document.addEventListener("DOMContentLoaded", () => {
  initApp();
});

async function initApp() {
  setupEventListeners();

  try {
    const res = await fetch("data/catalog.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    catalogData = await res.json();
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
    items = items.filter(it => it.status === currentFilters.status);
  }

  // Format
  if (currentFilters.format !== "all") {
    items = items.filter(it => it.category === currentFilters.format);
  }

  // Kalite
  if (currentFilters.quality !== "all") {
    if (currentFilters.quality === "1080p") {
      items = items.filter(it => it.max_quality === "1080p");
    } else if (currentFilters.quality === "720p") {
      items = items.filter(it => it.max_quality === "720p");
    }
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

function renderCatalog() {
  const grid = document.getElementById("anime-grid");
  const countEl = document.getElementById("results-count-display");
  if (!grid) return;

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
    showView('view-manga');
    return;
  }

  if (hash === "#/hakkimizda") {
    showView('view-about');
    return;
  }

  showView('view-catalog');
}

function renderAnimeDetail(slug) {
  if (!catalogData || !catalogData.items) return;
  const anime = catalogData.items.find(it => it.slug === slug);
  if (!anime) return;

  const banner = document.getElementById("detail-banner");
  const poster = document.getElementById("detail-poster");
  const title = document.getElementById("detail-title");
  const nativeTitle = document.getElementById("detail-native-title");
  const metaList = document.getElementById("detail-meta-list");
  const genresBox = document.getElementById("detail-genres");
  const synopsisText = document.getElementById("detail-synopsis-text");
  const episodesBody = document.getElementById("detail-episodes-body");
  const episodesCount = document.getElementById("detail-episodes-count");

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
  const statusLabel = isCompleted ? "Tamamlandı" : "Yarım Kaldı";

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

  // Dual Ratings
  RatingManager.renderRatingWidget("rating-anime-container", anime, "anime", "Anime Puanı");
  RatingManager.renderRatingWidget("rating-translation-container", anime, "translation", "Çeviri Kalitesi");

  // Bölümler
  if (episodesCount) episodesCount.textContent = anime.episodes_count;
  episodesBody.innerHTML = (anime.episodes || []).map(ep => `
    <tr>
      <td style="font-weight: 600; color: #fff;">${String(ep.ep_no).padStart(2, '0')}</td>
      <td class="ep-file-name">${ep.file_name || '-'}</td>
      <td>${ep.quality || '-'}</td>
      <td>${ep.size_mb ? ep.size_mb + ' MB' : '-'}</td>
    </tr>
  `).join('');

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

  document.querySelectorAll("[data-filter-quality]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-filter-quality]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilters.quality = btn.getAttribute("data-filter-quality");
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
      window.location.hash = "#/anime";
    });
  }

  window.addEventListener("hashchange", handleRouting);
}
