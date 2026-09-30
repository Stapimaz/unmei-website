/**
 * UNMEI FANSUB - MINIMAL MANGA READER
 * Features:
 * - 2 Reading Modes: Single Page 3D Paper Flip vs Continuous Vertical Scroll
 * - Simple toggle buttons in the top bar
 * - Ultra-clean minimal interface (Chapter dropdown, Back button, Mode switch, Page indicator)
 * - Smooth 3D paper curl animation in Single mode
 * - Continuous smooth scrolling in Scroll mode
 * - Keyboard navigation (Esc, Arrow keys, A/D, Space)
 * - Background preloading for instant page transitions
 */

const MangaReader = (function () {
  let mangaCatalog = null;
  let currentManga = null;
  let currentChapterIndex = 0;
  let currentPageIndex = 0;
  let readingMode = localStorage.getItem('unmei_manga_mode') || 'single'; // 'single' | 'scroll'
  let isAnimating = false;

  // DOM Elements
  let modal = null;
  let viewport = null;
  let singleView = null;
  let scrollView = null;
  let scrollContainer = null;
  let scrollNextBtn = null;
  let stage = null;
  let activeSheet = null;
  let activeImg = null;
  let baseSheet = null;
  let baseImg = null;
  let chapterSelect = null;
  let pageIndicator = null;
  let arrowPrev = null;
  let arrowNext = null;
  let zonePrev = null;
  let zoneNext = null;
  let seriesTitleEl = null;
  let modeSingleBtn = null;
  let modeScrollBtn = null;

  async function init() {
    modal = document.getElementById('manga-reader-modal');
    if (!modal) return;

    viewport = document.getElementById('reader-viewport');
    singleView = document.getElementById('reader-single-view');
    scrollView = document.getElementById('reader-scroll-view');
    scrollContainer = document.getElementById('reader-scroll-container');
    scrollNextBtn = document.getElementById('reader-scroll-next-btn');
    stage = document.getElementById('reader-stage');
    activeSheet = document.getElementById('reader-active-sheet');
    activeImg = document.getElementById('reader-active-img');
    baseSheet = document.getElementById('reader-base-sheet');
    baseImg = document.getElementById('reader-base-img');
    chapterSelect = document.getElementById('reader-chapter-select');
    pageIndicator = document.getElementById('reader-page-indicator');
    arrowPrev = document.getElementById('reader-arrow-prev');
    arrowNext = document.getElementById('reader-arrow-next');
    zonePrev = document.getElementById('zone-prev');
    zoneNext = document.getElementById('zone-next');
    seriesTitleEl = document.getElementById('reader-series-title');
    modeSingleBtn = document.getElementById('reader-mode-single');
    modeScrollBtn = document.getElementById('reader-mode-scroll');

    setupEvents();
    await loadMangaData();
  }

  async function loadMangaData() {
    try {
      const root = window.UNMEI_ROOT || "";
      const res = await fetch(root + "data/manga.json");
      if (res.ok) {
        mangaCatalog = await res.json();
      }
    } catch (e) {
      console.warn("Manga verisi yüklenemedi:", e);
    }
  }

  function setupEvents() {
    const closeBtn = document.getElementById('reader-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeManga);

    if (chapterSelect) {
      chapterSelect.addEventListener('change', (e) => {
        const chNum = parseFloat(e.target.value);
        goToChapter(chNum, 0);
      });
    }

    if (modeSingleBtn) {
      modeSingleBtn.addEventListener('click', () => setMode('single'));
    }
    if (modeScrollBtn) {
      modeScrollBtn.addEventListener('click', () => setMode('scroll'));
    }

    if (arrowPrev) arrowPrev.addEventListener('click', (e) => { e.stopPropagation(); prevPage(); });
    if (arrowNext) arrowNext.addEventListener('click', (e) => { e.stopPropagation(); nextPage(); });

    if (zonePrev) zonePrev.addEventListener('click', () => prevPage());
    if (zoneNext) zoneNext.addEventListener('click', () => nextPage());

    if (scrollNextBtn) {
      scrollNextBtn.addEventListener('click', () => {
        if (!currentManga || !currentManga.chapters) return;
        if (currentChapterIndex < currentManga.chapters.length - 1) {
          goToChapter(currentManga.chapters[currentChapterIndex + 1].chapter_num, 0);
        }
      });
    }

    // Keyboard navigation
    window.addEventListener('keydown', (e) => {
      if (!modal || modal.style.display !== 'flex') return;

      if (e.key === 'Escape') {
        closeManga();
      } else if (readingMode === 'single') {
        if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'd' || e.key === 'D') {
          e.preventDefault();
          nextPage();
        } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          e.preventDefault();
          prevPage();
        }
      }
    });
  }

  function setMode(mode) {
    readingMode = mode;
    localStorage.setItem('unmei_manga_mode', mode);

    if (modeSingleBtn) modeSingleBtn.classList.toggle('active', mode === 'single');
    if (modeScrollBtn) modeScrollBtn.classList.toggle('active', mode === 'scroll');

    if (mode === 'single') {
      if (singleView) singleView.style.display = 'flex';
      if (scrollView) scrollView.style.display = 'none';
      if (viewport) viewport.classList.remove('is-scroll-mode');
      if (pageIndicator) pageIndicator.style.display = 'inline-block';
      updateUI();
    } else {
      if (singleView) singleView.style.display = 'none';
      if (scrollView) scrollView.style.display = 'flex';
      if (viewport) {
        viewport.classList.add('is-scroll-mode');
        viewport.scrollTop = 0;
      }
      if (pageIndicator) pageIndicator.style.display = 'none';
      renderScrollView();
    }
  }

  function openManga(slug, chapterNum = 1) {
    if (!mangaCatalog || mangaCatalog.length === 0) {
      loadMangaData().then(() => openManga(slug, chapterNum));
      return;
    }

    currentManga = mangaCatalog.find(m => m.slug === slug || m.id === slug) || mangaCatalog[0];
    if (!currentManga) return;

    if (seriesTitleEl) {
      seriesTitleEl.textContent = currentManga.title;
    }

    // Populate chapter select dropdown cleanly
    if (chapterSelect) {
      chapterSelect.innerHTML = (currentManga.chapters || []).map(ch => {
        return `<option value="${ch.chapter_num}">${ch.title || 'Bölüm ' + ch.chapter_num}</option>`;
      }).join('');
    }

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    setMode(readingMode);
    goToChapter(chapterNum, 0);
  }

  function closeManga() {
    if (!modal) return;
    modal.style.display = 'none';
    document.body.style.overflow = '';
    if (stage) stage.classList.remove('turn-forward', 'turn-backward');
    isAnimating = false;
  }

  function goToChapter(chapterNum, targetPageIndex = 0) {
    if (!currentManga || !currentManga.chapters) return;

    const num = parseFloat(chapterNum);
    const idx = currentManga.chapters.findIndex(ch => parseFloat(ch.chapter_num) === num);
    currentChapterIndex = idx !== -1 ? idx : 0;
    const chapter = currentManga.chapters[currentChapterIndex];
    if (!chapter || !chapter.pages || chapter.pages.length === 0) return;

    if (chapterSelect) chapterSelect.value = chapter.chapter_num;

    const totalPages = chapter.pages.length;
    currentPageIndex = Math.max(0, Math.min(targetPageIndex, totalPages - 1));

    const root = window.UNMEI_ROOT || "";
    const pageSrc = root + chapter.pages[currentPageIndex];

    if (activeImg) activeImg.src = pageSrc;
    if (baseImg) baseImg.src = pageSrc;

    if (readingMode === 'single') {
      updateUI();
      preloadAdjacentPages();
    } else {
      renderScrollView();
      if (viewport) viewport.scrollTop = 0;
    }
  }

  function renderScrollView() {
    if (!currentManga || !currentManga.chapters || !scrollContainer) return;
    const chapter = currentManga.chapters[currentChapterIndex];
    if (!chapter || !chapter.pages) return;

    const root = window.UNMEI_ROOT || "";

    scrollContainer.innerHTML = chapter.pages.map((p, idx) => `
      <div class="scroll-page-wrap">
        <img src="${root + p}" alt="Sayfa ${idx + 1}" class="scroll-page-img" loading="lazy">
        <span class="scroll-page-badge">${idx + 1} / ${chapter.pages.length}</span>
      </div>
    `).join('');

    if (scrollNextBtn) {
      if (currentChapterIndex < currentManga.chapters.length - 1) {
        const nextCh = currentManga.chapters[currentChapterIndex + 1];
        scrollNextBtn.textContent = `Sonraki Bölüme Geç (Bölüm ${nextCh.chapter_num}) →`;
        scrollNextBtn.disabled = false;
      } else {
        scrollNextBtn.textContent = 'Son Bölümdür';
        scrollNextBtn.disabled = true;
      }
    }
  }

  function updateUI() {
    if (!currentManga || !currentManga.chapters) return;
    const chapter = currentManga.chapters[currentChapterIndex];
    if (!chapter) return;

    const totalPages = chapter.pages.length;
    if (pageIndicator) {
      pageIndicator.textContent = `${currentPageIndex + 1} / ${totalPages}`;
    }

    const hasPrev = currentPageIndex > 0 || currentChapterIndex > 0;
    const hasNext = currentPageIndex < totalPages - 1 || currentChapterIndex < currentManga.chapters.length - 1;

    if (arrowPrev) arrowPrev.style.opacity = hasPrev ? '0.75' : '0.2';
    if (arrowNext) arrowNext.style.opacity = hasNext ? '0.75' : '0.2';
  }

  function nextPage() {
    if (isAnimating || !currentManga || !currentManga.chapters) return;
    const chapter = currentManga.chapters[currentChapterIndex];
    if (!chapter) return;

    const totalPages = chapter.pages.length;
    const root = window.UNMEI_ROOT || "";

    if (currentPageIndex < totalPages - 1) {
      // Flip to next page within chapter
      isAnimating = true;
      const nextIdx = currentPageIndex + 1;
      const nextSrc = root + chapter.pages[nextIdx];

      // Prepare base sheet underneath with target page
      if (baseImg) baseImg.src = nextSrc;

      // Trigger realistic 3D paper turn animation
      if (stage) {
        stage.classList.remove('turn-forward', 'turn-backward');
        void stage.offsetWidth; // trigger reflow
        stage.classList.add('turn-forward');
      }

      setTimeout(() => {
        currentPageIndex = nextIdx;
        if (activeImg) activeImg.src = nextSrc;
        if (stage) stage.classList.remove('turn-forward');
        updateUI();
        isAnimating = false;
        preloadAdjacentPages();
      }, 360);

    } else if (currentChapterIndex < currentManga.chapters.length - 1) {
      // Advance to next chapter
      goToChapter(currentManga.chapters[currentChapterIndex + 1].chapter_num, 0);
    }
  }

  function prevPage() {
    if (isAnimating || !currentManga || !currentManga.chapters) return;
    const chapter = currentManga.chapters[currentChapterIndex];
    if (!chapter) return;

    const root = window.UNMEI_ROOT || "";

    if (currentPageIndex > 0) {
      // Flip back to previous page within chapter
      isAnimating = true;
      const prevIdx = currentPageIndex - 1;
      const currentSrc = root + chapter.pages[currentPageIndex];
      const prevSrc = root + chapter.pages[prevIdx];

      // Base sheet holds current page underneath
      if (baseImg) baseImg.src = currentSrc;
      // Active sheet is loaded with previous page and unfurls from left
      if (activeImg) activeImg.src = prevSrc;

      if (stage) {
        stage.classList.remove('turn-forward', 'turn-backward');
        void stage.offsetWidth; // trigger reflow
        stage.classList.add('turn-backward');
      }

      setTimeout(() => {
        currentPageIndex = prevIdx;
        if (stage) stage.classList.remove('turn-backward');
        updateUI();
        isAnimating = false;
        preloadAdjacentPages();
      }, 360);

    } else if (currentChapterIndex > 0) {
      // Go to previous chapter's last page
      const prevCh = currentManga.chapters[currentChapterIndex - 1];
      goToChapter(prevCh.chapter_num, prevCh.pages.length - 1);
    }
  }

  function preloadAdjacentPages() {
    if (!currentManga || !currentManga.chapters) return;
    const chapter = currentManga.chapters[currentChapterIndex];
    if (!chapter || !chapter.pages) return;

    const root = window.UNMEI_ROOT || "";
    // Preload next page
    if (currentPageIndex + 1 < chapter.pages.length) {
      const img = new Image();
      img.src = root + chapter.pages[currentPageIndex + 1];
    }
    // Preload previous page
    if (currentPageIndex > 0) {
      const img = new Image();
      img.src = root + chapter.pages[currentPageIndex - 1];
    }
  }

  // Public API
  return {
    init,
    openManga,
    closeManga,
    goToChapter,
    setMode,
    nextPage,
    prevPage
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  MangaReader.init();
});
